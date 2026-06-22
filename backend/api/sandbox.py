"""
研创沙箱 API 路由
"""
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from database import get_db
from models.db_models import User, Project, SandboxRecord, ProjectStatus, AuditLog
from schemas import SandboxRequest, SandboxResponse, MessageResponse
from services.auth_service import get_current_user, require_role
from services.llm_service import llm_service

router = APIRouter(prefix="/api/sandbox", tags=["研创沙箱"])


@router.post("/start", response_model=MessageResponse)
async def start_sandbox(
    request: SandboxRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_role(["admin", "expert"])),
    db: Session = Depends(get_db)
):
    """启动研创沙箱"""
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")
    
    # 检查是否满足沙箱触发条件
    if project.total_score and not (60 <= project.total_score <= 78):
        raise HTTPException(
            status_code=400,
            detail=f"项目得分 {project.total_score:.1f}，不在沙箱触发范围（60-78分）"
        )
    
    # 创建沙箱记录
    sandbox = SandboxRecord(
        project_id=request.project_id,
        trigger_score=project.total_score,
        simulation_plan={
            "objective": request.plan.objective,
            "parameters": request.plan.parameters,
            "methodology": request.plan.methodology,
            "expected_outcome": request.plan.expected_outcome
        },
        status="pending"
    )
    db.add(sandbox)
    
    # 更新项目状态
    project.status = ProjectStatus.sandbox_triggered
    project.sandbox_triggered = True
    db.commit()
    
    # 记录日志
    log = AuditLog(
        user_id=current_user.id,
        action="start_sandbox",
        module="sandbox",
        detail=f"启动研创沙箱: 项目 {project.name}"
    )
    db.add(log)
    db.commit()
    
    # 后台执行仿真
    background_tasks.add_task(
        _run_sandbox_task,
        sandbox_id=sandbox.id,
        project_id=project.id
    )
    
    return MessageResponse(
        message="研创沙箱已启动",
        data={"sandbox_id": sandbox.id, "status": "pending"}
    )


@router.get("/result/{project_id}", response_model=SandboxResponse)
async def get_sandbox_result(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取沙箱结果"""
    sandbox = db.query(SandboxRecord).filter(
        SandboxRecord.project_id == project_id
    ).order_by(SandboxRecord.created_at.desc()).first()
    
    if not sandbox:
        raise HTTPException(status_code=404, detail="未找到沙箱记录")
    
    return SandboxResponse(
        id=sandbox.id,
        project_id=sandbox.project_id,
        trigger_score=sandbox.trigger_score,
        simulation_plan=sandbox.simulation_plan,
        result_data=sandbox.result_data,
        report_url=sandbox.report_url,
        status=sandbox.status,
        created_at=sandbox.created_at,
        completed_at=sandbox.completed_at
    )


@router.get("/history/{project_id}", response_model=list)
async def get_sandbox_history(
    project_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取沙箱历史"""
    sandboxes = db.query(SandboxRecord).filter(
        SandboxRecord.project_id == project_id
    ).order_by(SandboxRecord.created_at.desc()).all()
    
    return [
        SandboxResponse(
            id=s.id,
            project_id=s.project_id,
            trigger_score=s.trigger_score,
            simulation_plan=s.simulation_plan,
            result_data=s.result_data,
            report_url=s.report_url,
            status=s.status,
            created_at=s.created_at,
            completed_at=s.completed_at
        )
        for s in sandboxes
    ]


# ── 后台任务 ──────────────────────────────────────────

async def _run_sandbox_task(sandbox_id: int, project_id: int):
    """后台执行沙箱仿真"""
    from database import SessionLocal
    
    db = SessionLocal()
    try:
        sandbox = db.query(SandboxRecord).filter(SandboxRecord.id == sandbox_id).first()
        if not sandbox:
            return
        
        # 更新状态
        sandbox.status = "running"
        db.commit()
        
        # 获取项目信息
        project = db.query(Project).filter(Project.id == project_id).first()
        
        # 调用 LLM 生成仿真方案
        prompt = f"""你是一位绿色建筑技术研创专家。请基于以下信息设计仿真方案：

## 项目信息
- 项目名称: {project.name}
- 当前评分: {project.total_score:.1f}分
- 技术领域: {project.domain or '未指定'}

## 仿真目标
{sandbox.simulation_plan.get('objective', '提升技术评分')}

## 参数约束
{sandbox.simulation_plan.get('parameters', {})}

## 方法论
{sandbox.simulation_plan.get('methodology', '对比分析法')}

请输出：
1. 仿真方案设计
2. 预期效果分析
3. 改进建议
4. 风险评估"""
        
        messages = [
            {"role": "system", "content": "你是绿色建筑技术研创专家，擅长通过仿真分析优化技术方案。"},
            {"role": "user", "content": prompt}
        ]
        
        result = await llm_service.chat(messages, temperature=0.5, max_tokens=4096)
        
        # 保存结果
        sandbox.result_data = {
            "simulation_result": result,
            "improvement_suggestions": [],
            "risk_assessment": ""
        }
        sandbox.status = "completed"
        sandbox.completed_at = datetime.utcnow()
        db.commit()
        
        # 记录日志
        log = AuditLog(
            action="sandbox_completed",
            module="sandbox",
            detail=f"沙箱仿真完成: 项目 {project.name}"
        )
        db.add(log)
        db.commit()
        
    except Exception as e:
        sandbox = db.query(SandboxRecord).filter(SandboxRecord.id == sandbox_id).first()
        if sandbox:
            sandbox.status = "failed"
            sandbox.result_data = {"error": str(e)}
            db.commit()
    finally:
        db.close()
