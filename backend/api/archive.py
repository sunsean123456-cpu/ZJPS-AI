"""
档案管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import shutil
from pathlib import Path

from database import get_db
from models.db_models import (
    User, Project, Document, ArchiveDir, FileVersion,
    ProjectStatus, DocumentType, DocumentStatus
)
from schemas import (
    ArchiveInitResponse, ArchiveStatsResponse, PreCheckResponse,
    DocumentResponse, VersionHistoryResponse, MessageResponse
)
from services.auth_service import get_current_user, require_role
from services.archive_agent import archive_agent

router = APIRouter(prefix="/api/archive", tags=["档案管理"])


@router.post("/init/{project_id}", response_model=ArchiveInitResponse)
async def init_archive(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    初始化项目档案目录
    自动创建标准目录结构
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 检查权限
    if current_user.role.value != "admin" and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此项目")
    
    # 检查是否已初始化
    if project.archive_path:
        return ArchiveInitResponse(
            archive_code=project.archive_code,
            archive_path=project.archive_path,
            message="档案目录已存在"
        )
    
    # 初始化档案目录
    archive_code = archive_agent.init_project_archive(project, db)
    
    return ArchiveInitResponse(
        archive_code=archive_code,
        archive_path=project.archive_path,
        message="档案目录初始化成功"
    )


@router.post("/upload/{project_id}", response_model=DocumentResponse)
async def upload_file(
    project_id: int,
    file: UploadFile = File(...),
    doc_type: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    上传文件到项目档案
    自动归类到对应子目录
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 检查权限
    if current_user.role.value != "admin" and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此项目")
    
    # 档案未初始化则自动初始化
    if not project.archive_path:
        try:
            archive_agent.init_project_archive(project, db)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"档案目录初始化失败: {str(e)}")
    
    # 保存临时文件
    temp_dir = Path(project.archive_path) / ".temp"
    temp_dir.mkdir(exist_ok=True)
    temp_file = temp_dir / file.filename
    
    with open(temp_file, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # 解析文档类型
    doc_type_enum = None
    if doc_type:
        try:
            doc_type_enum = DocumentType(doc_type)
        except ValueError:
            pass
    
    # 存储文件（自动归类 + 版本控制）
    document, stored_path = archive_agent.store_file(
        project=project,
        file_path=str(temp_file),
        file_name=file.filename,
        doc_type=doc_type_enum,
        user_id=current_user.id,
        db=db
    )
    
    # 删除临时文件
    temp_file.unlink()
    
    return DocumentResponse(
        id=document.id,
        project_id=document.project_id,
        file_name=document.file_name,
        file_type=document.file_type,
        file_size=document.file_size,
        file_url=document.file_url,
        doc_type=document.doc_type.value if document.doc_type else None,
        is_required=document.is_required,
        status=document.status.value,
        created_at=document.created_at.isoformat() if document.created_at else None
    )


@router.post("/import-local/{project_id}", response_model=List[DocumentResponse])
async def import_local_directory(
    project_id: int,
    local_path: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    扫描本地目录，批量导入文件
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 检查权限
    if current_user.role.value != "admin" and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此项目")
    
    # 检查档案是否已初始化
    if not project.archive_path:
        raise HTTPException(status_code=400, detail="请先初始化档案目录")
    
    # 检查路径是否存在
    if not os.path.exists(local_path):
        raise HTTPException(status_code=400, detail=f"路径不存在: {local_path}")
    
    # 批量导入
    try:
        documents = archive_agent.import_local_directory(
            project=project,
            local_dir=local_path,
            user_id=current_user.id,
            db=db
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    return [
        DocumentResponse(
            id=doc.id,
            project_id=doc.project_id,
            file_name=doc.file_name,
            file_type=doc.file_type,
            file_size=doc.file_size,
            file_url=doc.file_url,
            doc_type=doc.doc_type.value if doc.doc_type else None,
            is_required=doc.is_required,
            status=doc.status.value,
            created_at=doc.created_at.isoformat() if doc.created_at else None
        )
        for doc in documents
    ]


@router.get("/files/{project_id}", response_model=List[DocumentResponse])
async def list_files(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取项目档案文件列表
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 检查权限
    if current_user.role.value != "admin" and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此项目")
    
    documents = db.query(Document).filter(Document.project_id == project_id).all()
    
    return [
        DocumentResponse(
            id=doc.id,
            project_id=doc.project_id,
            file_name=doc.file_name,
            file_type=doc.file_type,
            file_size=doc.file_size,
            file_url=doc.file_url,
            doc_type=doc.doc_type.value if doc.doc_type else None,
            is_required=doc.is_required,
            status=doc.status.value,
            created_at=doc.created_at.isoformat() if doc.created_at else None
        )
        for doc in documents
    ]


@router.get("/stats/{project_id}", response_model=ArchiveStatsResponse)
async def get_archive_stats(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取档案统计信息
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 检查权限
    if current_user.role.value != "admin" and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此项目")
    
    stats = archive_agent.get_archive_stats(project, db)
    
    return ArchiveStatsResponse(**stats)


@router.post("/pre-check/{project_id}", response_model=PreCheckResponse)
async def local_pre_check(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    本地预检（不调用LLM，零流量）
    检查必传材料是否齐全
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 检查权限
    if current_user.role.value != "admin" and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此项目")
    
    # 执行本地预检
    result = archive_agent.local_pre_check(project, db)
    
    return PreCheckResponse(
        passed=result["passed"],
        completeness=result["completeness"],
        passed_count=result["passed_count"],
        total_required=result["total_required"],
        issues=result["issues"],
        summary=result["summary"]
    )


@router.get("/versions/{document_id}", response_model=List[VersionHistoryResponse])
async def get_version_history(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取文档版本历史
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    project = db.query(Project).filter(Project.id == document.project_id).first()
    
    # 检查权限
    if current_user.role.value != "admin" and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此文档")
    
    versions = archive_agent.get_version_history(document_id, db)
    
    return [VersionHistoryResponse(**v) for v in versions]


@router.post("/rollback/{document_id}/{target_version}", response_model=MessageResponse)
async def rollback_version(
    document_id: int,
    target_version: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    回滚到指定版本
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    project = db.query(Project).filter(Project.id == document.project_id).first()
    
    # 检查权限
    if current_user.role.value != "admin" and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此文档")
    
    success = archive_agent.rollback_version(
        document_id=document_id,
        target_version=target_version,
        user_id=current_user.id,
        db=db
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="回滚失败，目标版本不存在")
    
    return MessageResponse(message=f"已回滚到版本 {target_version}")


@router.delete("/file/{document_id}", response_model=MessageResponse)
async def delete_file(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    删除文档（保留版本历史）
    """
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    project = db.query(Project).filter(Project.id == document.project_id).first()
    
    # 检查权限
    if current_user.role.value != "admin" and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此文档")
    
    # 删除物理文件
    if os.path.exists(document.file_url):
        os.remove(document.file_url)
    
    # 删除数据库记录（级联删除版本记录）
    db.delete(document)
    db.commit()
    
    return MessageResponse(message="文件已删除")


@router.post("/intelligent-review/{project_id}")
async def intelligent_review(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    智能审查 - 调用LLM进行深度审查
    包括：
    1. 资料质量检查（低级错误）
    2. 与已有技术数据库对比（重复性检查）
    3. 评价严苛程度建议
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 检查权限
    if current_user.role.value != "admin" and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此项目")
    
    # 执行智能审查
    result = archive_agent.intelligent_review(project, db)
    
    return result
