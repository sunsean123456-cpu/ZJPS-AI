"""
AI对话 API路由
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from database import get_db
from models.db_models import User, Project, Document, AIScore, ProjectStatus
from schemas import ChatMessageRequest, ChatMessageResponse
from services.auth_service import get_current_user
from services.llm_service import llm_service

router = APIRouter(prefix="/api/chat", tags=["AI对话"])


@router.post("/message", response_model=dict)
async def chat_message(
    request: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    AI对话消息
    基于项目上下文，调用LLM生成回复
    """
    # 获取项目信息
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 构建上下文
    context = _build_project_context(project, db)
    
    # 构建消息
    system_prompt = f"""你是绿色建筑先进适用技术智能评审系统的AI助手。

当前用户正在评审项目：{project.name}
技术领域：{project.domain or '未指定'}
项目状态：{project.status.value}

{context}

你的职责：
1. 解答绿色建筑技术评价相关问题
2. 指导用户完成评审流程
3. 提供材料上传、预审、评审的建议
4. 解释评分标准和改进建议

请用专业、友好的语气回答用户问题。"""
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": request.message}
    ]
    
    try:
        # 调用LLM
        response = await llm_service.chat(messages, temperature=0.7, max_tokens=2048)
        
        return {
            "success": True,
            "response": response,
            "session_id": request.session_id,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        # LLM调用失败，返回友好提示
        return {
            "success": False,
            "response": f"⚠️ AI服务暂时不可用，请稍后重试。\n\n错误信息：{str(e)}",
            "session_id": request.session_id,
            "timestamp": datetime.utcnow().isoformat()
        }


def _build_project_context(project: Project, db: Session) -> str:
    """构建项目上下文信息"""
    context_parts = []
    
    # 项目基本信息
    context_parts.append(f"## 项目信息\n- 名称：{project.name}\n- 领域：{project.domain or '未指定'}\n- 状态：{project.status.value}")
    
    # 文档信息
    documents = db.query(Document).filter(Document.project_id == project.id).all()
    if documents:
        context_parts.append("\n## 已上传文档")
        for doc in documents:
            context_parts.append(f"- {doc.file_name} ({doc.doc_type})")
    else:
        context_parts.append("\n## 已上传文档\n暂无文档")
    
    # 评审结果
    if project.total_score is not None:
        scores = db.query(AIScore).filter(AIScore.project_id == project.id).all()
        if scores:
            context_parts.append(f"\n## 评审结果\n- 总分：{project.total_score}\n- 等级：{project.grade or '未评定'}")
    
    return "\n".join(context_parts)
