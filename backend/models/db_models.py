"""
数据库 ORM 模型
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Text,
    ForeignKey, JSON, Enum as SAEnum, Index
)
from sqlalchemy.orm import relationship
from database import Base
import enum


# ── 枚举类型 ──────────────────────────────────────────

class UserRole(str, enum.Enum):
    admin = "admin"
    expert = "expert"
    user = "user"


class ProjectStatus(str, enum.Enum):
    draft = "draft"                          # 草稿
    submitted = "submitted"                  # 已提交
    pending_review = "pending_review"        # 待受理
    pre_check = "pre_check"                  # AI预审中
    reviewing = "reviewing"                  # 评审中
    needs_supplement = "needs_supplement"    # 需补正
    completed = "completed"                  # 已出结果
    sandbox_triggered = "sandbox_triggered"  # 研创沙箱中


class DocumentType(str, enum.Enum):
    application = "application"          # 申报书
    info_sheet = "info_sheet"            # 信息表
    commitment = "commitment"            # 承诺书
    tech_report = "tech_report"          # 技术总结报告
    test_report = "test_report"          # 检测报告
    case_study = "case_study"            # 案例材料
    patent = "patent"                    # 专利证书
    other = "other"                      # 其他


class DocumentStatus(str, enum.Enum):
    uploaded = "uploaded"
    parsing = "parsing"
    parsed = "parsed"
    failed = "failed"


# ── 用户 ──────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    email = Column(String(200), unique=True, nullable=True)
    password_hash = Column(String(256), nullable=False)
    role = Column(SAEnum(UserRole), default=UserRole.user, nullable=False)
    organization = Column(String(200), nullable=True)
    qualification = Column(String(500), nullable=True)
    status = Column(String(20), default="active")  # active / disabled / pending
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    projects = relationship("Project", back_populates="enterprise")
    audit_logs = relationship("AuditLog", back_populates="user")
    notifications = relationship("Notification", back_populates="user")


# ── 申报项目 ──────────────────────────────────────────

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, autoincrement=True)
    enterprise_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(300), nullable=False)
    domain = Column(String(100), nullable=True)        # 技术领域
    description = Column(Text, nullable=True)
    status = Column(SAEnum(ProjectStatus), default=ProjectStatus.draft, nullable=False)

    # 档案管理
    archive_path = Column(String(500), nullable=True)  # 项目档案根目录路径
    archive_code = Column(String(50), nullable=True)   # 档案编号 PRJ-20260609-001

    # AI 评分
    ai_score = Column(Float, nullable=True)
    total_score = Column(Float, nullable=True)
    grade = Column(String(20), nullable=True)          # 优秀/良好/合格/不合格
    sandbox_triggered = Column(Boolean, default=False)

    # 流程控制
    current_step = Column(Integer, default=0)          # 0-5 对应评审阶段
    pre_check_score = Column(Float, nullable=True)
    quality_score = Column(Float, nullable=True)

    # 时间
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    submitted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    enterprise = relationship("User", back_populates="projects")
    documents = relationship("Document", back_populates="project", cascade="all, delete-orphan")
    archive_dirs = relationship("ArchiveDir", back_populates="project", cascade="all, delete-orphan")
    pre_checks = relationship("PreCheck", back_populates="project", cascade="all, delete-orphan")
    ai_scores = relationship("AIScore", back_populates="project", cascade="all, delete-orphan")
    snapshots = relationship("ReviewSnapshot", back_populates="project", cascade="all, delete-orphan")
    sandbox_records = relationship("SandboxRecord", back_populates="project", cascade="all, delete-orphan")

    __table_args__ = (
        Index("idx_project_status", "status"),
        Index("idx_project_enterprise", "enterprise_id"),
    )


# ── 文档材料 ──────────────────────────────────────────

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    file_name = Column(String(300), nullable=False)
    file_type = Column(String(20), nullable=True)      # pdf / docx / jpg / png
    file_size = Column(Integer, nullable=True)          # bytes
    file_url = Column(String(500), nullable=False)
    doc_type = Column(SAEnum(DocumentType), default=DocumentType.other)
    is_required = Column(Boolean, default=False)        # 是否必传材料

    # 解析结果
    status = Column(SAEnum(DocumentStatus), default=DocumentStatus.uploaded)
    parsed_text = Column(Text, nullable=True)
    ocr_quality = Column(Float, nullable=True)          # 0-1
    extracted_data = Column(JSON, nullable=True)        # 结构化提取的 key-value

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    project = relationship("Project", back_populates="documents")
    versions = relationship("FileVersion", back_populates="document", cascade="all, delete-orphan")


# ── 档案目录 ──────────────────────────────────────────

class ArchiveDir(Base):
    __tablename__ = "archive_dirs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    dir_name = Column(String(100), nullable=False)     # 01-申报材料
    dir_path = Column(String(500), nullable=False)     # 完整路径
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="archive_dirs")


# ── 文件版本 ──────────────────────────────────────────

class FileVersion(Base):
    __tablename__ = "file_versions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    file_path = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    file_hash = Column(String(64), nullable=True)      # SHA256
    change_note = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    document = relationship("Document", back_populates="versions")


# ── 预审记录 ──────────────────────────────────────────

class PreCheck(Base):
    __tablename__ = "pre_checks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    completeness_score = Column(Float, nullable=True)   # 0-100
    quality_score = Column(Float, nullable=True)        # 0-100
    issues = Column(JSON, nullable=True)                # [{doc_type, issue, severity}]
    summary = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="pre_checks")


# ── AI 评分明细 ────────────────────────────────────────

class AIScore(Base):
    __tablename__ = "ai_scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    indicator_id = Column(String(20), nullable=False)   # L1_01, L2_01_01 等
    score = Column(Float, nullable=True)                # 得分
    max_score = Column(Float, nullable=True)            # 满分值
    confidence = Column(Float, nullable=True)           # 0-1 置信度
    evidence_text = Column(Text, nullable=True)         # 评分依据
    source_page = Column(String(50), nullable=True)     # 来源页码
    reasoning = Column(Text, nullable=True)             # LLM 推理过程

    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="ai_scores")

    __table_args__ = (
        Index("idx_score_project_indicator", "project_id", "indicator_id"),
    )


# ── 评审快照 ──────────────────────────────────────────

class ReviewSnapshot(Base):
    __tablename__ = "review_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    snapshot_data = Column(JSON, nullable=True)         # 完整评审状态快照
    note = Column(String(500), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="snapshots")


# ── 研创沙箱 ──────────────────────────────────────────

class SandboxRecord(Base):
    __tablename__ = "sandbox_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    trigger_score = Column(Float, nullable=True)        # 触发时的评审总分
    simulation_plan = Column(JSON, nullable=True)       # 仿真方案
    result_data = Column(JSON, nullable=True)           # 仿真结果
    report_url = Column(String(500), nullable=True)
    status = Column(String(20), default="pending")      # pending / running / completed / failed

    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="sandbox_records")


# ── 相似技术索引 ──────────────────────────────────────

class TechSimilarity(Base):
    __tablename__ = "tech_similarity"

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    similar_project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    similarity_score = Column(Float, nullable=True)     # 0-1

    created_at = Column(DateTime, default=datetime.utcnow)


# ── 审计日志 ──────────────────────────────────────────

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(50), nullable=False)         # login / upload / evaluate / export ...
    module = Column(String(50), nullable=True)          # auth / material / evaluation / report ...
    detail = Column(Text, nullable=True)
    ip_address = Column(String(50), nullable=True)
    request_id = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="audit_logs")

    __table_args__ = (
        Index("idx_audit_user", "user_id"),
        Index("idx_audit_time", "created_at"),
    )


# ── 通知 ──────────────────────────────────────────────

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=True)
    notification_type = Column(String(30), nullable=True)  # status_change / supplement / sandbox
    is_read = Column(Boolean, default=False)
    related_project_id = Column(Integer, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")
