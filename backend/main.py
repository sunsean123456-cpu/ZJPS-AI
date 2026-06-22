"""
FastAPI 主入口
"""
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import os
from datetime import datetime

from database import engine, Base
from api import auth, projects, evaluation, system, sandbox, archive, standards, chat
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# 创建数据库表
Base.metadata.create_all(bind=engine)

# 创建 FastAPI 应用
app = FastAPI(
    title="绿色建筑技术智能评价系统",
    description="基于 AI 的绿色建筑技术评审系统",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 静态文件服务（上传文件）
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./data/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# 前端静态文件服务
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.exists(STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(STATIC_DIR, "assets")), name="static-assets")

# 上传文件大小限制（默认 100MB）
MAX_UPLOAD_SIZE = int(os.getenv("MAX_UPLOAD_SIZE", str(100 * 1024 * 1024)))

# 注册路由
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(evaluation.router)
app.include_router(system.router)
app.include_router(sandbox.router)
app.include_router(archive.router)
app.include_router(standards.router)
app.include_router(chat.router)


# ── 全局异常处理 ──────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP 异常处理"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "message": exc.detail,
            "error_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """通用异常处理"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "服务器内部错误",
            "error_code": 500
        }
    )


# ── 中间件：请求日志 ─────────────────────────────────

@app.middleware("http")
async def log_requests(request: Request, call_next):
    """记录请求日志"""
    start_time = datetime.utcnow()
    
    response = await call_next(request)
    
    duration = (datetime.utcnow() - start_time).total_seconds()
    logger.info(
        f"{request.method} {request.url.path} - {response.status_code} - {duration:.3f}s"
    )
    
    return response


# ── 健康检查 ──────────────────────────────────────────

@app.get("/health", tags=["系统"])
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }


@app.get("/", tags=["系统"])
async def root():
    """根路径 - 返回前端页面"""
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "name": "绿色建筑技术智能评价系统 API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


# 前端路由 fallback - 所有未匹配的路径返回 index.html（SPA 路由支持）
@app.get("/{path:path}", include_in_schema=False)
async def serve_spa(path: str):
    """SPA 前端路由 fallback"""
    # 跳过 API 和文档路径
    if path.startswith(("api/", "docs", "redoc", "openapi", "uploads/")):
        raise HTTPException(status_code=404, detail="Not found")
    file_path = os.path.join(STATIC_DIR, path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
    index_path = os.path.join(STATIC_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    raise HTTPException(status_code=404, detail="Not found")


# ── 启动事件 ──────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    logger.info("🚀 绿色建筑技术智能评价系统 API 启动")
    logger.info(f"📁 上传目录: {UPLOAD_DIR}")
    logger.info(f"🗄️ 数据库: {os.getenv('DATABASE_URL', 'sqlite:///./green_building.db')}")
    
    # 初始化默认管理员（如果不存在）
    from database import SessionLocal
    from models.db_models import User, UserRole
    from services.auth_service import get_password_hash
    
    db = SessionLocal()
    try:
        admin = db.query(User).filter(User.role == UserRole.admin).first()
        if not admin:
            admin = User(
                name="系统管理员",
                phone="13800000000",
                email="admin@greenbuilding.com",
                password_hash=get_password_hash("admin123"),
                role=UserRole.admin,
                organization="住建部绿建中心",
                status="active"
            )
            db.add(admin)
            db.commit()
            logger.info("✅ 默认管理员账号已创建")
            logger.info("   手机号: 13800000000")
            logger.info("   密码: admin123")
    finally:
        db.close()


@app.on_event("shutdown")
async def shutdown_event():
    """应用关闭事件"""
    logger.info("🛑 API 服务已停止")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
