"""
认证 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models.db_models import User, UserRole, AuditLog
from schemas import (
    LoginRequest, RegisterRequest, TokenResponse, UserInfo,
    UserUpdate, UserListResponse, MessageResponse
)
from services.auth_service import (
    verify_password, get_password_hash, create_access_token,
    get_current_user, require_role
)
from datetime import datetime

router = APIRouter(prefix="/api/auth", tags=["认证"])


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    """用户登录"""
    # 查找用户
    user = db.query(User).filter(User.phone == request.phone).first()
    if not user:
        print(f"[DEBUG] 用户不存在: {request.phone}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="手机号或密码错误",
        )
    
    print(f"[DEBUG] 用户: {user.phone}, 密码: {request.password}, 哈希: {user.password_hash[:30]}...")
    print(f"[DEBUG] 密码长度: {len(request.password)}, 密码字节: {request.password.encode()}")
    
    # 验证密码
    pwd_ok = verify_password(request.password, user.password_hash)
    print(f"[DEBUG] 密码验证: {pwd_ok}")
    if not pwd_ok:
        # 手动验证调试
        salt, stored_hash = user.password_hash.split("$", 1)
        import hashlib
        computed = hashlib.sha256(f"{salt}{request.password}".encode()).hexdigest()
        print(f"[DEBUG] Salt: {salt}")
        print(f"[DEBUG] Stored hash: {stored_hash}")
        print(f"[DEBUG] Computed hash: {computed}")
        print(f"[DEBUG] Match: {computed == stored_hash}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="手机号或密码错误",
        )
    
    # 检查状态
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="账号已被禁用，请联系管理员",
        )
    
    # 生成 Token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    # 记录登录日志
    log = AuditLog(
        user_id=user.id,
        action="login",
        module="auth",
        detail=f"用户 {user.name} 登录系统",
    )
    db.add(log)
    db.commit()
    
    return TokenResponse(
        access_token=access_token,
        user=UserInfo(
            id=user.id,
            name=user.name,
            phone=user.phone,
            email=user.email,
            role=user.role.value,
            organization=user.organization,
            status=user.status,
            avatar_url=user.avatar_url,
            created_at=user.created_at,
        )
    )


@router.post("/register", response_model=TokenResponse)
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """企业用户注册"""
    # 检查手机号是否已注册
    existing = db.query(User).filter(User.phone == request.phone).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该手机号已注册",
        )
    
    # 创建用户
    user = User(
        name=request.name,
        phone=request.phone,
        email=request.email,
        password_hash=get_password_hash(request.password),
        role=UserRole.user,  # 默认企业用户
        organization=request.organization,
        qualification=request.qualification,
        status="active",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # 生成 Token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user=UserInfo(
            id=user.id,
            name=user.name,
            phone=user.phone,
            email=user.email,
            role=user.role.value,
            organization=user.organization,
            status=user.status,
            avatar_url=user.avatar_url,
            created_at=user.created_at,
        )
    )


@router.get("/me", response_model=UserInfo)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """获取当前用户信息"""
    return UserInfo(
        id=current_user.id,
        name=current_user.name,
        phone=current_user.phone,
        email=current_user.email,
        role=current_user.role.value,
        organization=current_user.organization,
        status=current_user.status,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
    )


@router.put("/me", response_model=UserInfo)
async def update_current_user(
    update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """更新当前用户信息"""
    if update.name is not None:
        current_user.name = update.name
    if update.email is not None:
        current_user.email = update.email
    if update.organization is not None:
        current_user.organization = update.organization
    
    db.commit()
    db.refresh(current_user)
    
    return UserInfo(
        id=current_user.id,
        name=current_user.name,
        phone=current_user.phone,
        email=current_user.email,
        role=current_user.role.value,
        organization=current_user.organization,
        status=current_user.status,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
    )


# ── 管理员：用户管理 ──────────────────────────────────

@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = 1,
    page_size: int = 20,
    role: str = None,
    status: str = None,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """获取用户列表（管理员）"""
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    if status:
        query = query.filter(User.status == status)
    
    total = query.count()
    users = query.offset((page - 1) * page_size).limit(page_size).all()
    
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
                created_at=u.created_at,
            )
            for u in users
        ],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.put("/users/{user_id}", response_model=UserInfo)
async def update_user(
    user_id: int,
    update: UserUpdate,
    current_user: User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    """更新用户信息（管理员）"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    
    if update.name is not None:
        user.name = update.name
    if update.email is not None:
        user.email = update.email
    if update.role is not None:
        user.role = update.role
    if update.organization is not None:
        user.organization = update.organization
    if update.status is not None:
        user.status = update.status
    
    db.commit()
    db.refresh(user)
    
    return UserInfo(
        id=user.id,
        name=user.name,
        phone=user.phone,
        email=user.email,
        role=user.role.value,
        organization=user.organization,
        status=user.status,
        avatar_url=user.avatar_url,
        created_at=user.created_at,
    )


@router.post("/init-admin", response_model=MessageResponse)
async def init_admin(db: Session = Depends(get_db)):
    """初始化管理员账号（仅首次）"""
    existing_admin = db.query(User).filter(User.role == UserRole.admin).first()
    if existing_admin:
        return MessageResponse(message="管理员账号已存在", success=False)
    
    admin = User(
        name="系统管理员",
        phone="13800000000",
        email="admin@greenbuilding.com",
        password_hash=get_password_hash("admin123"),
        role=UserRole.admin,
        organization="住建部绿建中心",
        status="active",
    )
    db.add(admin)
    db.commit()
    
    return MessageResponse(
        message="管理员账号创建成功\n手机号: 13800000000\n密码: admin123",
        success=True,
    )
