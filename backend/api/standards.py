"""
评价标准管理 API
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import json

from database import get_db
from models.evaluation_standard import EvaluationStandard
from services.auth_service import get_current_user
from models.db_models import User

router = APIRouter(prefix="/api/standards", tags=["评价标准"])


@router.get("")
async def list_standards(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取所有评价标准"""
    standards = db.query(EvaluationStandard).filter(
        EvaluationStandard.is_active == 1
    ).all()
    
    return {
        "success": True,
        "data": [
            {
                "id": s.id,
                "country_code": s.country_code,
                "country_name": s.country_name,
                "standard_name": s.standard_name,
                "standard_version": s.standard_version,
                "has_file": bool(s.file_path),
                "created_at": s.created_at.isoformat() if s.created_at else None
            }
            for s in standards
        ]
    }


@router.get("/active")
async def get_active_standard(
    country_code: str = "CN",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """获取指定国家的活跃评价标准"""
    standard = db.query(EvaluationStandard).filter(
        EvaluationStandard.country_code == country_code,
        EvaluationStandard.is_active == 1
    ).first()
    
    if not standard:
        raise HTTPException(status_code=404, detail="未找到该国家的评价标准")
    
    return {
        "success": True,
        "data": {
            "id": standard.id,
            "country_code": standard.country_code,
            "country_name": standard.country_name,
            "standard_name": standard.standard_name,
            "standard_version": standard.standard_version,
            "dimensions": standard.dimensions,
            "scoring_rules": standard.scoring_rules,
            "file_path": standard.file_path
        }
    }


@router.post("/upload")
async def upload_standard(
    country_code: str = Form(...),
    country_name: str = Form(...),
    standard_name: str = Form(...),
    standard_version: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """上传评价标准文件"""
    # 保存文件
    upload_dir = "./data/standards"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, f"{country_code}_{file.filename}")
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # 解析标准文件（这里简化处理，实际应该解析 Excel/PDF）
    dimensions = _parse_standard_dimensions(file_path)
    scoring_rules = _parse_scoring_rules(file_path)
    
    # 保存或更新数据库记录
    existing = db.query(EvaluationStandard).filter(
        EvaluationStandard.country_code == country_code
    ).first()
    
    if existing:
        existing.standard_name = standard_name
        existing.standard_version = standard_version
        existing.dimensions = dimensions
        existing.scoring_rules = scoring_rules
        existing.file_path = file_path
    else:
        standard = EvaluationStandard(
            country_code=country_code,
            country_name=country_name,
            standard_name=standard_name,
            standard_version=standard_version,
            dimensions=dimensions,
            scoring_rules=scoring_rules,
            file_path=file_path
        )
        db.add(standard)
    
    db.commit()
    
    return {
        "success": True,
        "message": "评价标准上传成功",
        "data": {
            "country_code": country_code,
            "standard_name": standard_name,
            "file_path": file_path
        }
    }


@router.post("/switch")
async def switch_standard(
    country_code: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """切换到指定国家的评价标准"""
    standard = db.query(EvaluationStandard).filter(
        EvaluationStandard.country_code == country_code,
        EvaluationStandard.is_active == 1
    ).first()
    
    if not standard:
        raise HTTPException(
            status_code=404, 
            detail=f"未找到 {country_code} 的评价标准，请先上传"
        )
    
    return {
        "success": True,
        "message": f"已切换到 {standard.country_name} 评价标准",
        "data": {
            "country_code": standard.country_code,
            "standard_name": standard.standard_name
        }
    }


def _parse_standard_dimensions(file_path: str) -> list:
    """解析标准文件的维度配置（简化版）"""
    # 这里应该实际解析文件，现在返回默认配置
    return [
        {"id": "tech_advancement", "name": "技术先进性", "max_score": 20, "weight": 0.2},
        {"id": "green_performance", "name": "绿色低碳与性能效果", "max_score": 25, "weight": 0.25},
        {"id": "engineering_maturity", "name": "工程成熟度与应用基础", "max_score": 20, "weight": 0.2},
        {"id": "economic_value", "name": "经济适用性与推广价值", "max_score": 20, "weight": 0.2},
        {"id": "document_quality", "name": "申报材料质量与合规性", "max_score": 15, "weight": 0.15}
    ]


def _parse_scoring_rules(file_path: str) -> dict:
    """解析评分规则（简化版）"""
    return {
        "grade_thresholds": {
            "优秀": 85,
            "良好": 70,
            "合格": 60,
            "不合格": 0
        },
        "sandbox_trigger": {
            "total_score_range": [60, 78],
            "innovation_min": 0.88,
            "carbon_reduction_min": 0.90
        }
    }
