"""
AI 评审引擎 - 优化版
支持：
- 本地预检（零流量）
- 文档解析
- LLM 多维度评分
- 评分依据追溯
"""
import json
import os
from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from models.db_models import (
    Project, Document, AIScore, PreCheck, ProjectStatus, DocumentStatus
)
from models.indicators import get_all_indicators, get_l1_indicators, get_l2_by_l1
from services.llm_service import llm_service, build_evaluation_prompt
from services.document_parser import parser
from services.archive_agent import archive_agent


class EvaluationEngine:
    """AI 评审引擎"""
    
    async def run_full_evaluation(
        self,
        project_id: int,
        db: Session,
        user_id: int = None
    ) -> Dict:
        """
        执行完整评审流程
        1. 本地预检（零流量）
        2. 文档解析
        3. LLM 评分
        4. 结果存储
        """
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"项目不存在: {project_id}")
        
        # Step 1: 本地预检
        pre_check_result = archive_agent.local_pre_check(project, db)
        if not pre_check_result["passed"]:
            return {
                "success": False,
                "stage": "pre_check",
                "message": "材料不完整，请先补充必传材料",
                "pre_check": pre_check_result
            }
        
        # Step 2: 解析所有文档
        documents = db.query(Document).filter(Document.project_id == project_id).all()
        full_text = ""
        extracted_data_list = []
        
        for doc in documents:
            if doc.status != DocumentStatus.parsed:
                # 解析文档
                if os.path.exists(doc.file_url):
                    parse_result = await parser.parse(doc.file_url, doc.file_type or "pdf")
                    if parse_result.get("success"):
                        doc.parsed_text = parse_result.get("text", "")
                        doc.extracted_data = parse_result.get("extracted", {})
                        doc.ocr_quality = parse_result.get("ocr_quality", 1.0)
                        doc.status = DocumentStatus.parsed
                    else:
                        doc.status = DocumentStatus.failed
                    db.commit()
            
            if doc.parsed_text:
                full_text += f"\n\n=== {doc.file_name} ===\n{doc.parsed_text}"
                if doc.extracted_data:
                    extracted_data_list.append({
                        "file_name": doc.file_name,
                        "data": doc.extracted_data
                    })
        
        if not full_text.strip():
            return {
                "success": False,
                "stage": "parse",
                "message": "文档解析失败，无法提取文本内容"
            }
        
        # Step 3: 获取已有入库技术（用于横向比较和查重）
        existing_projects = db.query(Project).filter(
            Project.id != project_id,
            Project.status.in_([ProjectStatus.completed, ProjectStatus.sandbox_triggered])
        ).all()
        existing_techs = [
            {
                "name": ep.name,
                "domain": ep.domain,
                "score": ep.total_score,
                "description": ep.description or ""
            }
            for ep in existing_projects
        ]
        
        # Step 4: 调用 LLM 评审（遵循GBAT-IAFL V1.0基本法）
        all_indicators = get_all_indicators()
        messages = build_evaluation_prompt(
            tech_name=project.name,
            indicators=all_indicators,
            document_text=full_text[:15000],
            extracted_data={
                "project_name": project.name,
                "domain": project.domain,
                "extracted": extracted_data_list
            },
            existing_techs=existing_techs
        )
        
        try:
            llm_response = await llm_service.chat(messages, temperature=0.3, max_tokens=8192)
            eval_result = self._parse_evaluation_response(llm_response)
        except Exception as e:
            # LLM 调用失败，使用降级方案
            eval_result = self._fallback_evaluation(all_indicators)
        
        # Step 4: 保存评分结果
        total_score = self._save_scores(project_id, eval_result, all_indicators, db)
        
        # Step 5: 计算等级
        grade = self._calculate_grade(total_score)
        
        # Step 6: 更新项目状态
        project.ai_score = total_score
        project.total_score = total_score
        project.grade = grade
        project.status = ProjectStatus.completed
        project.current_step = 5
        project.completed_at = datetime.utcnow()
        
        # 判断是否触发研创沙箱
        innovation_score = self._get_indicator_score(eval_result, "L2_01_01")
        carbon_score = self._get_indicator_score(eval_result, "L2_02_01")
        
        if 60 <= total_score <= 78 and innovation_score >= 7 and carbon_score >= 9:
            project.sandbox_triggered = True
            project.status = ProjectStatus.sandbox_triggered
        
        db.commit()
        
        return {
            "success": True,
            "stage": "completed",
            "project_id": project_id,
            "total_score": total_score,
            "grade": grade,
            "scores": eval_result.get("scores", []),
            "summary": eval_result.get("summary", ""),
            "suggestions": eval_result.get("suggestions", []),
            "sandbox_recommended": project.sandbox_triggered
        }
    
    def _parse_evaluation_response(self, response: str) -> Dict:
        """解析 LLM 评审响应"""
        try:
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]
            else:
                json_str = response
            
            return json.loads(json_str)
        except json.JSONDecodeError:
            return self._fallback_evaluation(get_all_indicators())
    
    def _fallback_evaluation(self, indicators: list) -> Dict:
        """降级评审（LLM 失败时使用）"""
        scores = []
        for ind in indicators:
            if ind.level.value == 2:
                scores.append({
                    "indicator_id": ind.id,
                    "score": ind.max_score * 0.6,
                    "confidence": 0.3,
                    "evidence": "LLM 响应解析失败，使用默认评分",
                    "reasoning": "降级处理"
                })
        
        return {
            "scores": scores,
            "summary": "评审结果生成异常，已使用默认评分",
            "suggestions": ["建议重新提交评审"]
        }
    
    def _save_scores(
        self,
        project_id: int,
        eval_result: Dict,
        all_indicators: list,
        db: Session
    ) -> float:
        """保存评分结果并计算总分"""
        total_score = 0.0
        l1_scores = {}
        
        for score_item in eval_result.get("scores", []):
            indicator_id = score_item.get("indicator_id")
            score = score_item.get("score", 0)
            confidence = score_item.get("confidence", 0.5)
            evidence = score_item.get("evidence", "")
            reasoning = score_item.get("reasoning", "")
            
            indicator = next((i for i in all_indicators if i.id == indicator_id), None)
            if not indicator:
                continue
            
            max_score = indicator.max_score
            
            # 保存二级指标评分
            if indicator.level.value == 2:
                ai_score = AIScore(
                    project_id=project_id,
                    indicator_id=indicator_id,
                    score=score,
                    max_score=max_score,
                    confidence=confidence,
                    evidence_text=evidence,
                    reasoning=reasoning
                )
                db.add(ai_score)
                
                # 累加到一级指标
                l1_id = indicator.parent_id
                if l1_id not in l1_scores:
                    l1_scores[l1_id] = 0.0
                l1_scores[l1_id] += score
        
        # 计算总分（按一级指标权重）
        l1_indicators = get_l1_indicators()
        for l1 in l1_indicators:
            l1_score = l1_scores.get(l1.id, 0.0)
            total_score += l1_score * l1.weight
        
        return round(total_score, 1)
    
    def _calculate_grade(self, total_score: float) -> str:
        """计算等级"""
        if total_score >= 85:
            return "优秀"
        elif total_score >= 70:
            return "良好"
        elif total_score >= 60:
            return "合格"
        else:
            return "不合格"
    
    def _get_indicator_score(self, eval_result: Dict, indicator_id: str) -> float:
        """获取指定指标得分"""
        for score in eval_result.get("scores", []):
            if score.get("indicator_id") == indicator_id:
                return score.get("score", 0)
        return 0.0


# 全局实例
evaluation_engine = EvaluationEngine()
