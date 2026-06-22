from api.auth import router as auth_router
from api.projects import router as projects_router
from api.evaluation import router as evaluation_router
from api.system import router as system_router
from api.sandbox import router as sandbox_router

__all__ = [
    "auth_router",
    "projects_router",
    "evaluation_router",
    "system_router",
    "sandbox_router",
]
