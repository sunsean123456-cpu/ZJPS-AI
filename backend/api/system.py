"""
系统管理 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from models.db_models import User, AuditLog, Notification, UserRole
from models.indicators import get_all_indicators, get_l1_indicators, get_l2_indicators
from schemas import (
    UserListResponse, UserInfo, UserUpdate,
    AuditLogResponse, NotificationResponse,
    IndicatorWeightUpdate, MessageResponse
)
from services.auth_service import get_current_user, require_role

router = APIRouter(prefix="/api/system", tags=["系统管理"])


# ── 用户管理 ──────────────────────────────────────────

@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = None,
    status: Optional[str] = None,
    keyword: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """获取用户列表"""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)
    if keyword:
        query = query.filter(
            (User.name.contains(keyword)) | 
            (User.phone.contains(keyword)) |
            (User.organization.contains(keyword))
        )
    
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return UserListResponse(
        items=[
            UserInfo(
                id=u.id,
                name=u.name,
                phone=u.phone,
                email=u.email,
                role=u.role.value,
                organization=u.organization,
                status=u.status,
                avatar_url=u.avatar_url,
                created_at=u.created_at
            )
            for u in users
        ],
        total=total,
        page=page,
        page_size=page_size
    )


@router.put("/users/{user_id}", response_model=UserInfo)
async def update_user(
    user_id: int,
    update: UserUpdate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """更新用户信息"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    if update.name:
        user.name = update.name
    if update.email:
        user.email = update.email
    if update.role:
        user.role = update.role
    if update.organization:
        user.organization = update.organization
    if update.status:
        user.status = update.status
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    
    # 记录日志
    log = AuditLog(
        user_id=current_user.id,
        action="update_user",
        module="system",
        detail=f"更新用户 {user.name} 信息"
    )
    db.add(log)
    db.commit()
    
    return UserInfo(
        id=user.id,
        name=user.name,
        phone=user.phone,
        email=user.email,
        role=user.role.value,
        organization=user.organization,
        status=user.status,
        avatar_url=user.avatar_url,
        created_at=user.created_at
    )


@router.post("/users/{user_id}/toggle-status", response_model=MessageResponse)
async def toggle_user_status(
    user_id: int,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """启用/禁用用户"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="不能禁用自己的账号")
    
    user.status = "disabled" if user.status == "active" else "active"
    user.updated_at = datetime.utcnow()
    db.commit()
    
    # 记录日志
    log = AuditLog(
        user_id=current_user.id,
        action="toggle_user_status",
        module="system",
        detail=f"{'禁用' if user.status == 'disabled' else '启用'}用户 {user.name}"
    )
    db.add(log)
    db.commit()
    
    return MessageResponse(
        message=f"用户 {user.name} 已{('禁用' if user.status == 'disabled' else '启用')}",
        data={"user_id": user_id, "status": user.status}
    )


# ── 审计日志 ──────────────────────────────────────────

@router.get("/audit-logs", response_model=dict)
async def list_audit_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    module: Optional[str] = None,
    action: Optional[str] = None,
    user_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """获取审计日志"""
    query = db.query(AuditLog)
    
    if module:
        query = query.filter(AuditLog.module == module)
    if action:
        query = query.filter(AuditLog.action == action)
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if start_date:
        query = query.filter(AuditLog.created_at >= start_date)
    if end_date:
        query = query.filter(AuditLog.created_at <= end_date)
    
    total = query.count()
    logs = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    items = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        items.append({
            "id": log.id,
            "user_id": log.user_id,
            "username": user.name if user else "系统",
            "action": log.action,
            "module": log.module,
            "detail": log.detail,
            "ip_address": log.ip_address,
            "request_id": log.request_id,
            "created_at": log.created_at.isoformat() if log.created_at else None
        })
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size
    }


@router.get("/audit-logs/stats", response_model=dict)
async def get_audit_stats(
    days: int = Query(7, ge=1, le=90),
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """获取审计统计"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    logs = db.query(AuditLog).filter(AuditLog.created_at >= start_date).all()
    
    # 按操作类型统计
    action_stats = {}
    module_stats = {}
    daily_stats = {}
    
    for log in logs:
        # 操作类型统计
        action_stats[log.action] = action_stats.get(log.action, 0) + 1
        
        # 模块统计
        if log.module:
            module_stats[log.module] = module_stats.get(log.module, 0) + 1
        
        # 每日统计
        if log.created_at:
            date_key = log.created_at.strftime("%Y-%m-%d")
            daily_stats[date_key] = daily_stats.get(date_key, 0) + 1
    
    return {
        "total_logs": len(logs),
        "action_stats": action_stats,
        "module_stats": module_stats,
        "daily_stats": daily_stats,
        "days": days
    }


# ── 通知管理 ──────────────────────────────────────────

@router.get("/notifications", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取当前用户的通知"""
    query = db.query(Notification).filter(Notification.user_id == current_user.id)
    
    if unread_only:
        query = query.filter(Notification.is_read == False)
    
    notifications = query.order_by(Notification.created_at.desc()).limit(50).all()
    
    return [
        NotificationResponse(
            id=n.id,
            title=n.title,
            content=n.content,
            notification_type=n.notification_type,
            is_read=n.is_read,
            related_project_id=n.related_project_id,
            created_at=n.created_at
        )
        for n in notifications
    ]


@router.post("/notifications/{notification_id}/read", response_model=MessageResponse)
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """标记通知为已读"""
    notification = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    
    if not notification:
        raise HTTPException(status_code=404, detail="通知不存在")
    
    notification.is_read = True
    db.commit()
    
    return MessageResponse(message="已标记为已读")


@router.post("/notifications/read-all", response_model=MessageResponse)
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """标记所有通知为已读"""
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    
    return MessageResponse(message="所有通知已标记为已读")


# ── 指标体系查询 ──────────────────────────────────────

@router.get("/indicators", response_model=dict)
async def get_indicators(
    level: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取评价指标体系"""
    all_indicators = get_all_indicators()
    
    if level:
        all_indicators = [i for i in all_indicators if i.level.value == level]
    
    return {
        "indicators": [
            {
                "id": i.id,
                "parent_id": i.parent_id,
                "level": i.level.value,
                "name": i.name,
                "max_score": i.max_score,
                "weight": i.weight,
                "description": i.description,
                "scoring_criteria": i.scoring_criteria,
                "sort_order": i.sort_order
            }
            for i in all_indicators
        ],
        "total": len(all_indicators)
    }


@router.get("/indicators/tree", response_model=dict)
async def get_indicators_tree(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取指标体系树形结构"""
    from models.indicators import get_l2_by_l1
    
    l1_indicators = get_l1_indicators()
    tree = []
    
    for l1 in l1_indicators:
        l2_list = get_l2_by_l1(l1.id)
        tree.append({
            "id": l1.id,
            "name": l1.name,
            "max_score": l1.max_score,
            "weight": l1.weight,
            "description": l1.description,
            "children": [
                {
                    "id": l2.id,
                    "name": l2.name,
                    "max_score": l2.max_score,
                    "weight": l2.weight,
                    "description": l2.description,
                    "scoring_criteria": l2.scoring_criteria
                }
                for l2 in l2_list
            ]
        })
    
    return {"tree": tree}


# ── 系统统计 ──────────────────────────────────────────

@router.get("/stats", response_model=dict)
async def get_system_stats(
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """获取系统统计信息"""
    from models.db_models import Project, Document
    
    # 用户统计
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.status == "active").count()
    
    # 项目统计
    total_projects = db.query(Project).count()
    completed_projects = db.query(Project).filter(Project.status == ProjectStatus.completed).count()
    reviewing_projects = db.query(Project).filter(Project.status == ProjectStatus.reviewing).count()
    
    # 文档统计
    total_documents = db.query(Document).count()
    
    # 平均评分
    from sqlalchemy import func
    avg_score = db.query(func.avg(Project.total_score)).filter(
        Project.total_score.isnot(None)
    ).scalar()
    
    return {
        "users": {
            "total": total_users,
            "active": active_users
        },
        "projects": {
            "total": total_projects,
            "completed": completed_projects,
            "reviewing": reviewing_projects
        },
        "documents": {
            "total": total_documents
        },
        "evaluation": {
            "average_score": round(avg_score, 1) if avg_score else 0
        }
    }
