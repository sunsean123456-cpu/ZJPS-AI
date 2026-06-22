"""
档案管理 Agent - 每个项目的专属档案管理
职责：
- 创建项目档案目录结构
- 文件自动归类
- 版本控制
- 本地预检（不调用LLM）
- 扫描本地目录导入文件
"""
import os
import shutil
import hashlib
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session

from models.db_models import (
    Project, Document, ArchiveDir, FileVersion,
    DocumentType, DocumentStatus, ProjectStatus
)


# 标准档案目录结构
ARCHIVE_DIRS = [
    ("01-申报材料", 1),
    ("02-检测报告", 2),
    ("03-案例材料", 3),
    ("04-知识产权", 4),
    ("05-评审结果", 5),
    ("06-研创沙箱", 6),
]

# 文件归类规则
CLASSIFY_RULES = {
    "01-申报材料": {
        "keywords": ["申报书", "信息表", "承诺书", "申报表", "申请"],
        "doc_types": [DocumentType.application, DocumentType.info_sheet, DocumentType.commitment]
    },
    "02-检测报告": {
        "keywords": ["检测报告", "检测单位", "检验报告", "测试报告", "试验"],
        "doc_types": [DocumentType.test_report]
    },
    "03-案例材料": {
        "keywords": ["案例", "工程", "项目反馈", "用户意见", "应用证明"],
        "doc_types": [DocumentType.case_study]
    },
    "04-知识产权": {
        "keywords": ["专利", "发明", "软著", "著作权", "工法", "标准"],
        "doc_types": [DocumentType.patent]
    },
}

# 必传材料清单
REQUIRED_MATERIALS = [
    {"type": DocumentType.application, "name": "申报书", "dir": "01-申报材料"},
    {"type": DocumentType.info_sheet, "name": "信息表", "dir": "01-申报材料"},
    {"type": DocumentType.commitment, "name": "承诺书", "dir": "01-申报材料"},
    {"type": DocumentType.test_report, "name": "检测报告", "dir": "02-检测报告"},
]


class ArchiveAgent:
    """档案管理 Agent"""
    
    def __init__(self, base_path: str = None):
        """
        初始化
        base_path: 档案根目录，默认为 ~/绿色建筑评价
        """
        if base_path is None:
            base_path = os.path.expanduser("~/绿色建筑评价")
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    def init_project_archive(self, project: Project, db: Session) -> str:
        """
        初始化项目档案目录
        返回档案编号
        """
        # 生成档案编号
        date_str = datetime.now().strftime("%Y%m%d")
        count = db.query(Project).filter(
            Project.archive_code.like(f"PRJ-{date_str}-%")
        ).count() + 1
        archive_code = f"PRJ-{date_str}-{count:03d}"
        
        # 创建项目目录
        project_dir = self.base_path / "projects" / archive_code
        project_dir.mkdir(parents=True, exist_ok=True)
        
        # 创建子目录
        for dir_name, sort_order in ARCHIVE_DIRS:
            dir_path = project_dir / dir_name
            dir_path.mkdir(exist_ok=True)
            
            # 记录到数据库
            archive_dir = ArchiveDir(
                project_id=project.id,
                dir_name=dir_name,
                dir_path=str(dir_path),
                sort_order=sort_order
            )
            db.add(archive_dir)
        
        # 创建元数据目录
        meta_dir = project_dir / ".meta"
        meta_dir.mkdir(exist_ok=True)
        
        # 更新项目记录
        project.archive_path = str(project_dir)
        project.archive_code = archive_code
        db.commit()
        
        return archive_code
    
    def classify_file(self, file_name: str, doc_type: DocumentType = None) -> str:
        """
        根据文件名和类型自动判断应归入哪个子目录
        """
        file_name_lower = file_name.lower()
        
        # 先按文档类型匹配
        if doc_type:
            for dir_name, rules in CLASSIFY_RULES.items():
                if doc_type in rules["doc_types"]:
                    return dir_name
        
        # 再按关键词匹配
        for dir_name, rules in CLASSIFY_RULES.items():
            for keyword in rules["keywords"]:
                if keyword in file_name_lower:
                    return dir_name
        
        # 默认归入申报材料
        return "01-申报材料"
    
    def store_file(
        self,
        project: Project,
        file_path: str,
        file_name: str,
        doc_type: DocumentType = None,
        user_id: int = None,
        db: Session = None
    ) -> Tuple[Document, str]:
        """
        存储文件到档案目录
        返回 (Document记录, 存储路径)
        """
        # 自动归类
        target_dir = self.classify_file(file_name, doc_type)
        target_path = Path(project.archive_path) / target_dir
        
        # 检查是否已存在同名文件（版本控制）
        dest_file = target_path / file_name
        version = 1
        
        if dest_file.exists():
            # 查找已有文档记录
            existing_doc = db.query(Document).filter(
                Document.project_id == project.id,
                Document.file_name == file_name
            ).first()
            
            if existing_doc:
                # 创建新版本
                version = db.query(FileVersion).filter(
                    FileVersion.document_id == existing_doc.id
                ).count() + 1
                
                # 重命名新文件
                name, ext = os.path.splitext(file_name)
                file_name = f"{name}_v{version}{ext}"
                dest_file = target_path / file_name
        
        # 复制文件
        shutil.copy2(file_path, dest_file)
        
        # 计算文件哈希
        file_hash = self._calculate_hash(str(dest_file))
        file_size = dest_file.stat().st_size
        
        # 创建或更新文档记录
        if doc_type is None:
            doc_type = self._infer_doc_type(file_name)
        
        is_required = doc_type in [m["type"] for m in REQUIRED_MATERIALS]
        
        document = Document(
            project_id=project.id,
            file_name=file_name,
            file_type=dest_file.suffix[1:],
            file_size=file_size,
            file_url=str(dest_file),
            doc_type=doc_type,
            is_required=is_required,
            status=DocumentStatus.uploaded
        )
        db.add(document)
        db.flush()  # 获取 ID
        
        # 创建版本记录
        file_version = FileVersion(
            document_id=document.id,
            version=version,
            file_path=str(dest_file),
            file_size=file_size,
            file_hash=file_hash,
            change_note="初始上传" if version == 1 else f"版本 {version}",
            created_by=user_id
        )
        db.add(file_version)
        db.commit()
        
        return document, str(dest_file)
    
    def import_local_directory(
        self,
        project: Project,
        local_dir: str,
        user_id: int = None,
        db: Session = None
    ) -> List[Document]:
        """
        扫描本地目录，批量导入文件
        """
        imported = []
        local_path = Path(local_dir)
        
        if not local_path.exists():
            raise ValueError(f"目录不存在: {local_dir}")
        
        # 递归扫描
        for file_path in local_path.rglob("*"):
            if file_path.is_file() and not file_path.name.startswith("."):
                # 过滤支持的文件类型
                if file_path.suffix.lower() in [".pdf", ".doc", ".docx", ".txt", ".jpg", ".png"]:
                    doc, _ = self.store_file(
                        project=project,
                        file_path=str(file_path),
                        file_name=file_path.name,
                        user_id=user_id,
                        db=db
                    )
                    imported.append(doc)
        
        return imported
    
    def local_pre_check(self, project: Project, db: Session) -> Dict:
        """
        本地预检（不调用LLM，零流量）
        检查必传材料是否齐全
        """
        # 获取已上传文档
        documents = db.query(Document).filter(Document.project_id == project.id).all()
        uploaded_types = {doc.doc_type for doc in documents}
        
        # 检查必传材料
        issues = []
        passed = 0
        
        for material in REQUIRED_MATERIALS:
            if material["type"] in uploaded_types:
                passed += 1
            else:
                issues.append({
                    "type": material["type"].value,
                    "name": material["name"],
                    "required_dir": material["dir"],
                    "severity": "error",
                    "message": f"缺少必传材料：{material['name']}"
                })
        
        # 计算完整性分数
        completeness = (passed / len(REQUIRED_MATERIALS)) * 100
        
        # 检查文件质量
        quality_issues = []
        for doc in documents:
            if doc.file_size and doc.file_size < 1024:  # 小于1KB可能是空文件
                quality_issues.append({
                    "file_name": doc.file_name,
                    "severity": "warning",
                    "message": f"文件过小，可能是空文件: {doc.file_name}"
                })
        
        return {
            "passed": len(issues) == 0,
            "completeness": completeness,
            "passed_count": passed,
            "total_required": len(REQUIRED_MATERIALS),
            "issues": issues + quality_issues,
            "summary": self._generate_pre_check_summary(passed, len(REQUIRED_MATERIALS), issues)
        }
    
    def get_archive_stats(self, project: Project, db: Session) -> Dict:
        """获取档案统计信息"""
        documents = db.query(Document).filter(Document.project_id == project.id).all()
        
        stats = {
            "total_files": len(documents),
            "total_size": sum(d.file_size or 0 for d in documents),
            "by_directory": {},
            "by_type": {},
            "required_status": {}
        }
        
        # 按目录统计
        for doc in documents:
            dir_name = self.classify_file(doc.file_name, doc.doc_type)
            if dir_name not in stats["by_directory"]:
                stats["by_directory"][dir_name] = {"count": 0, "size": 0}
            stats["by_directory"][dir_name]["count"] += 1
            stats["by_directory"][dir_name]["size"] += doc.file_size or 0
        
        # 按类型统计
        for doc in documents:
            type_name = doc.doc_type.value if doc.doc_type else "other"
            if type_name not in stats["by_type"]:
                stats["by_type"][type_name] = 0
            stats["by_type"][type_name] += 1
        
        # 必传材料状态
        uploaded_types = {doc.doc_type for doc in documents}
        for material in REQUIRED_MATERIALS:
            stats["required_status"][material["name"]] = {
                "uploaded": material["type"] in uploaded_types,
                "required_dir": material["dir"]
            }
        
        return stats
    
    def get_version_history(self, document_id: int, db: Session) -> List[Dict]:
        """获取文档版本历史"""
        versions = db.query(FileVersion).filter(
            FileVersion.document_id == document_id
        ).order_by(FileVersion.version.desc()).all()
        
        return [
            {
                "version": v.version,
                "file_path": v.file_path,
                "file_size": v.file_size,
                "file_hash": v.file_hash,
                "change_note": v.change_note,
                "created_at": v.created_at.isoformat() if v.created_at else None
            }
            for v in versions
        ]
    
    def rollback_version(
        self,
        document_id: int,
        target_version: int,
        user_id: int = None,
        db: Session = None
    ) -> bool:
        """回滚到指定版本"""
        # 获取目标版本
        target = db.query(FileVersion).filter(
            FileVersion.document_id == document_id,
            FileVersion.version == target_version
        ).first()
        
        if not target:
            return False
        
        # 获取当前文档
        document = db.query(Document).filter(Document.id == document_id).first()
        if not document:
            return False
        
        # 创建新版本（复制目标版本文件）
        max_version = db.query(FileVersion).filter(
            FileVersion.document_id == document_id
        ).order_by(FileVersion.version.desc()).first().version
        
        new_version = FileVersion(
            document_id=document_id,
            version=max_version + 1,
            file_path=target.file_path,
            file_size=target.file_size,
            file_hash=target.file_hash,
            change_note=f"回滚到版本 {target_version}",
            created_by=user_id
        )
        db.add(new_version)
        db.commit()
        
        return True
    
    def _calculate_hash(self, file_path: str) -> str:
        """计算文件 SHA256 哈希"""
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def _infer_doc_type(self, file_name: str) -> DocumentType:
        """根据文件名推断文档类型"""
        file_name_lower = file_name.lower()
        
        if "申报书" in file_name_lower or "申报表" in file_name_lower:
            return DocumentType.application
        elif "信息表" in file_name_lower:
            return DocumentType.info_sheet
        elif "承诺书" in file_name_lower:
            return DocumentType.commitment
        elif "检测报告" in file_name_lower or "检验" in file_name_lower:
            return DocumentType.test_report
        elif "案例" in file_name_lower or "应用证明" in file_name_lower:
            return DocumentType.case_study
        elif "专利" in file_name_lower or "发明" in file_name_lower:
            return DocumentType.patent
        else:
            return DocumentType.other
    
    def _generate_pre_check_summary(
        self,
        passed: int,
        total: int,
        issues: List[Dict]
    ) -> str:
        """生成预检摘要"""
        if passed == total:
            return f"✅ 材料齐全，共 {total} 项必传材料均已上传，可以启动 AI 评审。"
        else:
            missing = [i["name"] for i in issues if i.get("severity") == "error"]
            return f"❌ 材料不完整，缺少 {len(missing)} 项：{', '.join(missing)}。请补充后重新检查。"
    
    def intelligent_review(
        self,
        project: Project,
        db: Session
    ) -> Dict:
        """
        智能审查 - 调用LLM进行深度审查
        包括：
        1. 资料质量检查（低级错误）
        2. 与已有技术数据库对比（重复性检查）
        3. 评价严苛程度建议
        """
        from services.llm_service import llm_service
        
        # 获取项目所有文档
        documents = db.query(Document).filter(Document.project_id == project.id).all()
        
        if not documents:
            return {
                "success": False,
                "message": "未找到任何文档，请先上传资料"
            }
        
        # 构建文档内容摘要
        doc_summaries = []
        for doc in documents:
            doc_summaries.append({
                "name": doc.file_name,
                "type": doc.doc_type.value if doc.doc_type else "unknown",
                "size": doc.file_size,
                "status": doc.status.value
            })
        
        # 获取已有技术数据库中的项目（用于重复性检查）
        existing_projects = db.query(Project).filter(
            Project.id != project.id,
            Project.status.in_([ProjectStatus.completed, ProjectStatus.sandbox_triggered])
        ).all()
        
        existing_techs = []
        for ep in existing_projects:
            existing_techs.append({
                "name": ep.name,
                "domain": ep.domain,
                "score": ep.total_score
            })
        
        # 构建LLM提示词
        prompt = f"""你是一位绿色建筑技术评审专家。请对以下申报项目进行智能审查。

## 项目信息
- 项目名称：{project.name}
- 技术领域：{project.domain or '未指定'}

## 已上传文档
{self._format_doc_list(doc_summaries)}

## 已有技术数据库（用于重复性检查）
{self._format_existing_techs(existing_techs)}

请从以下三个维度进行分析：

### 1. 资料质量检查
检查以下低级错误：
- 文档是否完整、清晰
- 是否存在明显的格式问题
- 关键信息是否缺失
- 数据是否一致

### 2. 重复性检查
对比已有技术数据库，分析：
- 是否存在重复或雷同的技术
- 创新点是否明确
- 与已有技术的差异化程度

### 3. 评价严苛程度建议
基于项目特点，建议：
- 评审应该严格还是宽松
- 重点关注哪些方面
- 是否需要额外验证

请以JSON格式返回结果：
{{
  "quality_check": {{
    "score": 0-100,
    "issues": ["问题1", "问题2"],
    "suggestions": ["建议1", "建议2"]
  }},
  "similarity_check": {{
    "similarity_level": "低/中/高",
    "similar_projects": ["相似项目1", "相似项目2"],
    "innovation_assessment": "创新性评估"
  }},
  "review_strictness": {{
    "level": "严格/标准/宽松",
    "focus_areas": ["重点关注1", "重点关注2"],
    "reasoning": "判断理由"
  }},
  "overall_assessment": "总体评估"
}}"""
        
        try:
            # 调用LLM
            response = llm_service.chat(prompt)
            
            # 解析JSON响应
            import json
            result = json.loads(response)
            
            return {
                "success": True,
                "result": result
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"智能审查失败：{str(e)}"
            }
    
    def _format_doc_list(self, docs: List[Dict]) -> str:
        """格式化文档列表"""
        if not docs:
            return "无"
        
        lines = []
        for doc in docs:
            lines.append(f"- {doc['name']} ({doc['type']}, {doc['size']} bytes, {doc['status']})")
        return "\n".join(lines)
    
    def _format_existing_techs(self, techs: List[Dict]) -> str:
        """格式化已有技术列表"""
        if not techs:
            return "暂无已有技术"
        
        lines = []
        for tech in techs[:10]:  # 最多显示10个
            score_str = f", 评分{tech['score']}" if tech['score'] else ""
            lines.append(f"- {tech['name']} ({tech['domain'] or '未分类'}{score_str})")
        return "\n".join(lines)


# 全局实例
archive_agent = ArchiveAgent()
