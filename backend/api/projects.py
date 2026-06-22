"""
项目管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models.db_models import (
    User, Project, Document, PreCheck, AIScore,
    ProjectStatus, DocumentType, DocumentStatus, AuditLog, UserRole
)
from schemas import (
    ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListItem,
    ProjectListResponse, DocumentResponse, DocumentUploadResponse,
    PreCheckResponse, EvaluationResultResponse, MessageResponse
)
from services.auth_service import get_current_user, require_role
from datetime import datetime
import os
import shutil
import uuid
import uuid

router = APIRouter(prefix="/api/projects", tags=["项目管理"])

# 文件上传目录
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./data/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── 项目 CRUD ─────────────────────────────────────────

@router.post("", response_model=ProjectResponse)
async def create_project(
    request: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建申报项目"""
    project = Project(
        enterprise_id=current_user.id,
        name=request.name,
        domain=request.domain,
        description=request.description,
        status=ProjectStatus.draft,
        current_step=0,
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # 自动初始化档案目录
    try:
        from services.archive_agent import archive_agent
        archive_agent.init_project_archive(project, db)
    except Exception as e:
        # 档案初始化失败不影响项目创建，但记录警告
        import logging
        logging.warning(f"项目 {project.name} 档案初始化失败: {e}")
    
    # 记录日志
    log = AuditLog(
        user_id=current_user.id,
        action="create_project",
        module="project",
        detail=f"创建项目: {project.name}",
    )
    db.add(log)
    db.commit()
    
    return _project_to_response(project)


@router.get("", response_model=ProjectListResponse)
async def list_projects(
    page: int = 1,
    page_size: int = 20,
    status: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取项目列表"""
    query = db.query(Project)
    
    # 企业用户只能看自己的项目
    if current_user.role == UserRole.user:
        query = query.filter(Project.enterprise_id == current_user.id)
    
    if status:
        query = query.filter(Project.status == status)
    
    total = query.count()
    projects = query.order_by(Project.updated_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    items = []
    for p in projects:
        doc_count = db.query(Document).filter(Document.project_id == p.id).count()
        items.append(ProjectListItem(
            id=p.id,
            name=p.name,
            domain=p.domain,
            status=p.status.value,
            ai_score=p.ai_score,
            total_score=p.total_score,
            grade=p.grade,
            document_count=doc_count,
            created_at=p.created_at,
            updated_at=p.updated_at,
        ))
    
    return ProjectListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取项目详情"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 权限检查
    if current_user.role == UserRole.user and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此项目")
    
    return _project_to_response(project)


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: int,
    request: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新项目信息"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    if current_user.role == UserRole.user and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权修改此项目")
    
    if request.name is not None:
        project.name = request.name
    if request.domain is not None:
        project.domain = request.domain
    if request.description is not None:
        project.description = request.description
    
    project.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(project)
    
    return _project_to_response(project)


@router.post("/{project_id}/submit", response_model=MessageResponse)
async def submit_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """提交项目评审"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    if project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此项目")
    
    # 检查是否有必传材料
    docs = db.query(Document).filter(Document.project_id == project_id).all()
    required_types = [DocumentType.application, DocumentType.info_sheet, DocumentType.commitment]
    uploaded_types = [d.doc_type for d in docs]
    
    missing = [t.value for t in required_types if t not in uploaded_types]
    if missing:
        return MessageResponse(
            message=f"缺少必传材料: {', '.join(missing)}",
            success=False
        )
    
    project.status = ProjectStatus.submitted
    project.submitted_at = datetime.utcnow()
    project.current_step = 1
    db.commit()
    
    return MessageResponse(message="项目已提交，等待预审")


# ── 文档上传 ──────────────────────────────────────────

@router.post("/{project_id}/documents", response_model=DocumentUploadResponse)
async def upload_document(
    project_id: int,
    file: UploadFile = File(...),
    doc_type: str = Form(default="other"),
    is_required: bool = Form(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """上传文档材料"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    if current_user.role == UserRole.user and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权操作此项目")
    
    # 生成唯一文件名
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "bin"
    unique_name = f"{uuid.uuid4().hex}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    
    # 保存文件
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # 创建文档记录
    doc = Document(
        project_id=project_id,
        file_name=file.filename,
        file_type=file_ext,
        file_size=len(content),
        file_url=f"/uploads/{unique_name}",
        doc_type=doc_type,
        is_required=is_required,
        status=DocumentStatus.uploaded,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    return DocumentUploadResponse(
        id=doc.id,
        file_name=doc.file_name,
        file_url=doc.file_url,
        doc_type=doc.doc_type,
        status=doc.status.value,
        message="上传成功"
    )


@router.get("/{project_id}/documents", response_model=List[DocumentResponse])
async def list_documents(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取项目文档列表"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    docs = db.query(Document).filter(Document.project_id == project_id).all()
    return [
        DocumentResponse(
            id=d.id,
            project_id=d.project_id,
            file_name=d.file_name,
            file_type=d.file_type,
            file_size=d.file_size,
            file_url=d.file_url,
            doc_type=d.doc_type.value if d.doc_type else None,
            is_required=d.is_required,
            status=d.status.value,
            parsed_text=d.parsed_text,
            ocr_quality=d.ocr_quality,
            extracted_data=d.extracted_data,
            created_at=d.created_at,
        )
        for d in docs
    ]


@router.delete("/{project_id}", response_model=MessageResponse)
async def delete_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除项目（同时删除关联文档和评审记录）"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    if current_user.role == UserRole.user and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权删除此项目")
    
    # 删除关联文档
    docs = db.query(Document).filter(Document.project_id == project_id).all()
    for doc in docs:
        # 删除物理文件
        file_path = os.path.join(UPLOAD_DIR, doc.file_url.replace("/uploads/", ""))
        if os.path.exists(file_path):
            os.remove(file_path)
        db.delete(doc)
    
    # 删除评审记录
    db.query(AIScore).filter(AIScore.project_id == project_id).delete()
    db.query(PreCheck).filter(PreCheck.project_id == project_id).delete()
    
    # 删除项目
    db.delete(project)
    db.commit()
    
    # 记录日志
    log = AuditLog(
        user_id=current_user.id,
        action="delete_project",
        module="project",
        detail=f"删除项目: {project.name} (ID: {project_id})",
    )
    db.add(log)
    db.commit()
    
    return MessageResponse(message="项目已删除")


@router.post("/{project_id}/archive", response_model=MessageResponse)
async def archive_project(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """归档项目"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    if current_user.role == UserRole.user and project.enterprise_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权归档此项目")
    
    project.status = ProjectStatus.archived
    project.updated_at = datetime.utcnow()
    db.commit()
    
    return MessageResponse(message="项目已归档")


@router.delete("/{project_id}/documents/{doc_id}", response_model=MessageResponse)
async def delete_document(
    project_id: int,
    doc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """删除文档"""
    doc = db.query(Document).filter(Document.id == doc_id, Document.project_id == project_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    
    # 删除物理文件
    file_path = os.path.join(UPLOAD_DIR, doc.file_url.replace("/uploads/", ""))
    if os.path.exists(file_path):
        os.remove(file_path)
    
    db.delete(doc)
    db.commit()
    
    return MessageResponse(message="文档已删除")


# ── 评审流程 ──────────────────────────────────────────

@router.post("/{project_id}/pre-check", response_model=PreCheckResponse)
async def run_pre_check(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """执行资料完整性预审"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 获取文档
    docs = db.query(Document).filter(Document.project_id == project_id).all()
    
    # 检查必传材料
    required_types = [DocumentType.application, DocumentType.info_sheet, DocumentType.commitment]
    uploaded_types = [d.doc_type for d in docs]
    
    issues = []
    completeness = 0.0
    
    for rt in required_types:
        if rt in uploaded_types:
            completeness += 33.3
        else:
            issues.append({
                "doc_type": rt.value,
                "issue": f"缺少{rt.value}材料",
                "severity": "error",
                "suggestion": f"请上传{rt.value}"
            })
    
    # 检查文档质量（简单检查文件大小）
    quality = 0.0
    for doc in docs:
        if doc.file_size and doc.file_size > 10000:
            quality += 100.0 / len(docs)
    
    # 创建预审记录
    pre_check = PreCheck(
        project_id=project_id,
        completeness_score=completeness,
        quality_score=quality,
        issues=issues,
        summary=f"完整性: {completeness:.1f}%, 质量: {quality:.1f}%"
    )
    db.add(pre_check)
    
    # 更新项目状态
    project.status = ProjectStatus.pre_check
    project.current_step = 2
    project.pre_check_score = completeness
    project.quality_score = quality
    db.commit()
    
    return PreCheckResponse(
        id=pre_check.id,
        project_id=project_id,
        completeness_score=completeness,
        quality_score=quality,
        issues=issues,
        summary=pre_check.summary,
        created_at=pre_check.created_at
    )


@router.post("/{project_id}/evaluate", response_model=MessageResponse)
async def start_evaluation(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """启动 AI 评审"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 更新状态
    project.status = ProjectStatus.reviewing
    project.current_step = 4
    db.commit()
    
    # 触发异步评审任务
    from services.evaluation_engine import run_evaluation
    run_evaluation.delay(project_id)
    
    return MessageResponse(message="AI 评审已启动，请稍候查看结果")


@router.get("/{project_id}/evaluation-result", response_model=EvaluationResultResponse)
async def get_evaluation_result(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取评审结果"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    if not project.total_score:
        raise HTTPException(status_code=404, detail="评审结果尚未生成")
    
    # 获取评分明细
    scores = db.query(AIScore).filter(AIScore.project_id == project_id).all()
    
    # 构建维度数据
    from models.indicators import get_l1_indicators, get_l2_by_l1
    
    dimensions = []
    for l1 in get_l1_indicators():
        l2_list = get_l2_by_l1(l1.id)
        l2_scores = []
        for l2 in l2_list:
            score_record = next((s for s in scores if s.indicator_id == l2.id), None)
            l2_scores.append({
                "indicator_id": l2.id,
                "name": l2.name,
                "score": score_record.score if score_record else 0,
                "max_score": l2.max_score,
                "weight": l2.weight,
                "confidence": score_record.confidence if score_record else 0,
                "evidence": score_record.evidence_text if score_record else "",
                "reasoning": score_record.reasoning if score_record else "",
            })
        
        l1_total = sum(d["score"] for d in l2_scores)
        dimensions.append({
            "indicator_id": l1.id,
            "name": l1.name,
            "score": l1_total,
            "max_score": l1.max_score,
            "weight": l1.weight,
            "confidence": sum(d["confidence"] for d in l2_scores) / len(l2_scores) if l2_scores else 0,
            "evidence": "",
            "reasoning": "",
            "children": l2_scores
        })
    
    # 生成建议
    suggestions = []
    for dim in dimensions:
        if dim["score"] / dim["max_score"] < 0.6:
            suggestions.append(f"{dim['name']}得分较低，建议加强")
    
    return EvaluationResultResponse(
        project_id=project_id,
        total_score=project.total_score,
        max_total_score=100.0,
        grade=project.grade or "未评定",
        dimensions=dimensions,
        summary=f"项目总得分 {project.total_score:.1f} 分，等级: {project.grade}",
        suggestions=suggestions,
        sandbox_recommended=project.sandbox_triggered,
        created_at=project.completed_at
    )


# ── 看板视图 ──────────────────────────────────────────

@router.get("/board/kanban", response_model=dict)
async def get_kanban_board(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取看板视图数据"""
    projects = db.query(Project).all()
    
    columns = {
        "draft": [],
        "submitted": [],
        "pre_check": [],
        "reviewing": [],
        "completed": [],
        "needs_supplement": [],
    }
    
    for p in projects:
        item = {
            "id": p.id,
            "name": p.name,
            "domain": p.domain,
            "ai_score": p.ai_score,
            "total_score": p.total_score,
            "grade": p.grade,
            "updated_at": p.updated_at.isoformat() if p.updated_at else None,
        }
        
        status_key = p.status.value
        if status_key in columns:
            columns[status_key].append(item)
    
    return {
        "columns": columns,
        "total": len(projects)
    }


# ── 辅助函数 ──────────────────────────────────────────

def _project_to_response(project: Project) -> ProjectResponse:
    """转换项目对象为响应模型"""
    docs = []
    for d in project.documents:
        docs.append(DocumentResponse(
            id=d.id,
            project_id=d.project_id,
            file_name=d.file_name,
            file_type=d.file_type,
            file_size=d.file_size,
            file_url=d.file_url,
            doc_type=d.doc_type.value if d.doc_type else None,
            is_required=d.is_required,
            status=d.status.value,
            parsed_text=d.parsed_text,
            ocr_quality=d.ocr_quality,
            extracted_data=d.extracted_data,
            created_at=d.created_at,
        ))
    
    return ProjectResponse(
        id=project.id,
        enterprise_id=project.enterprise_id,
        name=project.name,
        domain=project.domain,
        description=project.description,
        status=project.status.value,
        ai_score=project.ai_score,
        total_score=project.total_score,
        grade=project.grade,
        sandbox_triggered=project.sandbox_triggered,
        current_step=project.current_step,
        pre_check_score=project.pre_check_score,
        quality_score=project.quality_score,
        documents=docs,
        created_at=project.created_at,
        updated_at=project.updated_at,
        submitted_at=project.submitted_at,
        completed_at=project.completed_at,
    )
