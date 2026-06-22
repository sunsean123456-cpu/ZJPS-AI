"""
Pydantic Schemas - 请求/响应模型
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr
from enum import Enum


# ── 枚举 ──────────────────────────────────────────────

class UserRoleEnum(str, Enum):
    admin = "admin"
    expert = "expert"
    user = "user"


class ProjectStatusEnum(str, Enum):
    draft = "draft"
    submitted = "submitted"
    pending_review = "pending_review"
    pre_check = "pre_check"
    reviewing = "reviewing"
    needs_supplement = "needs_supplement"
    completed = "completed"
    sandbox_triggered = "sandbox_triggered"


class DocumentTypeEnum(str, Enum):
    application = "application"
    info_sheet = "info_sheet"
    commitment = "commitment"
    tech_report = "tech_report"
    test_report = "test_report"
    case_study = "case_study"
    patent = "patent"
    other = "other"


# ── 认证相关 ──────────────────────────────────────────

class LoginRequest(BaseModel):
    phone: str
    password: str


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    phone: str = Field(..., pattern=r"^1[3-9]\d{9}$")
    email: Optional[str] = None
    password: str = Field(..., min_length=6, max_length=128)
    organization: Optional[str] = None
    qualification: Optional[str] = None


class UserInfo(BaseModel):
    id: int
    name: str
    phone: str
    email: Optional[str] = None
    role: str
    organization: Optional[str] = None
    status: str
    avatar_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserInfo


# ── 文档相关 ──────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: int
    project_id: int
    file_name: str
    file_type: Optional[str] = None
    file_size: Optional[int] = None
    file_url: str
    doc_type: Optional[str] = None
    is_required: bool = False
    status: str
    parsed_text: Optional[str] = None
    ocr_quality: Optional[float] = None
    extracted_data: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentUploadResponse(BaseModel):
    id: int
    file_name: str
    file_url: str
    doc_type: str
    status: str
    message: str = "上传成功"


# ── 预审相关 ──────────────────────────────────────────

class PreCheckIssue(BaseModel):
    doc_type: str
    issue: str
    severity: str  # error / warning / info
    suggestion: Optional[str] = None


class PreCheckResponse(BaseModel):
    id: int
    project_id: int
    completeness_score: Optional[float] = None
    quality_score: Optional[float] = None
    issues: Optional[List[PreCheckIssue]] = None
    summary: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── 评审请求 ──────────────────────────────────────────

class EvaluationStartRequest(BaseModel):
    project_id: int


# ── AI 评分相关 ────────────────────────────────────────

class AIScoreResponse(BaseModel):
    id: int
    project_id: int
    indicator_id: str
    score: Optional[float] = None
    max_score: Optional[float] = None
    confidence: Optional[float] = None
    evidence_text: Optional[str] = None
    source_page: Optional[str] = None
    reasoning: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ScoreDimension(BaseModel):
    """评分维度（前端展示用）"""
    indicator_id: str
    name: str
    score: float
    max_score: float
    weight: float
    confidence: float
    evidence: str
    reasoning: str
    children: Optional[List["ScoreDimension"]] = None


class EvaluationResultResponse(BaseModel):
    project_id: int
    total_score: float
    max_total_score: float = 100.0
    grade: str
    dimensions: List[ScoreDimension]
    summary: str
    suggestions: List[str]
    sandbox_recommended: bool = False
    created_at: Optional[datetime] = None


# ── 项目相关 ──────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=300)
    domain: Optional[str] = None
    description: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    description: Optional[str] = None


class ProjectResponse(BaseModel):
    id: int
    enterprise_id: int
    name: str
    domain: Optional[str] = None
    description: Optional[str] = None
    status: str
    ai_score: Optional[float] = None
    total_score: Optional[float] = None
    grade: Optional[str] = None
    sandbox_triggered: bool = False
    current_step: int = 0
    pre_check_score: Optional[float] = None
    quality_score: Optional[float] = None
    documents: Optional[List[DocumentResponse]] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectListItem(BaseModel):
    """项目列表简略项"""
    id: int
    name: str
    domain: Optional[str] = None
    status: str
    ai_score: Optional[float] = None
    total_score: Optional[float] = None
    grade: Optional[str] = None
    document_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProjectListResponse(BaseModel):
    items: List[ProjectListItem]
    total: int
    page: int = 1
    page_size: int = 20


# ── 研创沙箱 ──────────────────────────────────────────

class SandboxPlan(BaseModel):
    objective: str
    parameters: Dict[str, Any]
    methodology: str
    expected_outcome: str


class SandboxRequest(BaseModel):
    plan: SandboxPlan


class SandboxResponse(BaseModel):
    id: int
    project_id: int
    trigger_score: Optional[float] = None
    simulation_plan: Optional[Dict[str, Any]] = None
    result_data: Optional[Dict[str, Any]] = None
    report_url: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── 系统管理 ──────────────────────────────────────────

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    status: Optional[str] = None


class UserListResponse(BaseModel):
    items: List[UserInfo]
    total: int
    page: int = 1
    page_size: int = 20


class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    username: Optional[str] = None
    action: str
    module: Optional[str] = None
    detail: Optional[str] = None
    ip_address: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class IndicatorWeightUpdate(BaseModel):
    indicator_id: str
    max_score: Optional[float] = None
    weight: Optional[float] = None


class NotificationResponse(BaseModel):
    id: int
    title: str
    content: Optional[str] = None
    notification_type: Optional[str] = None
    is_read: bool = False
    related_project_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── 通用 ──────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
    success: bool = True
    data: Optional[Any] = None


class ChatMessageRequest(BaseModel):
    message: str
    project_id: int
    session_id: Optional[str] = None


class ChatMessageResponse(BaseModel):
    success: bool
    response: str
    session_id: Optional[str] = None
    timestamp: str


class PaginatedResponse(BaseModel):
    items: List[Any]
    total: int
    page: int = 1
    page_size: int = 20


# ── 档案管理相关 ──────────────────────────────────────

class ArchiveInitResponse(BaseModel):
    archive_code: str
    archive_path: str
    message: str

class ArchiveStatsResponse(BaseModel):
    total_files: int
    total_size: int
    by_directory: Dict[str, Any]
    by_type: Dict[str, Any]
    required_status: Dict[str, Any]

class PreCheckIssue(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    required_dir: Optional[str] = None
    file_name: Optional[str] = None
    severity: str
    message: str

class PreCheckResponse(BaseModel):
    passed: bool
    completeness: float
    passed_count: int
    total_required: int
    issues: List[PreCheckIssue]
    summary: str

class VersionHistoryResponse(BaseModel):
    version: int
    file_path: str
    file_size: Optional[int]
    file_hash: Optional[str]
    change_note: Optional[str]
    created_at: Optional[str]
