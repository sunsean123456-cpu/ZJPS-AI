"""
评价标准模型
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from database import Base


class EvaluationStandard(Base):
    """评价标准表"""
    __tablename__ = "evaluation_standards"
    
    id = Column(Integer, primary_key=True, index=True)
    country_code = Column(String(10), unique=True, nullable=False, comment="国家代码，如 CN、US")
    country_name = Column(String(100), nullable=False, comment="国家名称")
    standard_name = Column(String(200), nullable=False, comment="标准名称")
    standard_version = Column(String(50), comment="标准版本")
    dimensions = Column(JSON, comment="评价维度配置")
    scoring_rules = Column(JSON, comment="评分规则")
    file_path = Column(String(500), comment="标准文件路径")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    is_active = Column(Integer, default=1, comment="是否启用")
