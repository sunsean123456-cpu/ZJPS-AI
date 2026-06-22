"""
LLM 服务 - 使用通义千问 qwen3.7-plus
遵循 GBAT-IAFL V1.0 基本法规范
"""
import os
import json
import httpx
from typing import List, Dict, Any, Optional, AsyncGenerator
from dotenv import load_dotenv

load_dotenv()

from services.gbat_constitution import SYSTEM_PROMPT


class LLMService:
    """大语言模型服务 - 遵循GBAT-IAFL V1.0"""
    
    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "openai")
        self.base_url = os.getenv("LLM_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
        self.model = os.getenv("LLM_MODEL", "qwen-plus")
        self.api_key = os.getenv("LLM_API_KEY", "")
        self.timeout = int(os.getenv("LLM_TIMEOUT", "120"))
    
    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> str:
        """同步对话，返回完整结果"""
        # 确保第一条消息是系统提示词（基本法宪法）
        if not messages or messages[0].get("role") != "system":
            messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
        
        return await self._openai_chat(messages, temperature, max_tokens)
    
    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.3,
        max_tokens: int = 4096,
    ) -> AsyncGenerator[str, None]:
        """流式对话"""
        if not messages or messages[0].get("role") != "system":
            messages.insert(0, {"role": "system", "content": SYSTEM_PROMPT})
        
        async for chunk in self._openai_chat_stream(messages, temperature, max_tokens):
            yield chunk
    
    async def _openai_chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> str:
        """OpenAI兼容接口调用"""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    
    async def _openai_chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float,
        max_tokens: int,
    ) -> AsyncGenerator[str, None]:
        """OpenAI兼容接口流式调用"""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }
        
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError):
                            continue


# ═══════════════════════════════════════════════════════
# 评审专用 Prompt 构建器
# ═══════════════════════════════════════════════════════

def build_evaluation_prompt(
    tech_name: str,
    indicators: list,
    document_text: str,
    extracted_data: dict,
    existing_techs: list = None,
) -> List[Dict[str, str]]:
    """构建评审Prompt - 遵循GBAT-IAFL V1.0"""
    
    # 构建指标说明
    indicator_desc = ""
    for ind in indicators:
        indicator_desc += f"""
### {ind.id} {ind.name}（满分{ind.max_score}分，权重{ind.weight}）
- 说明：{ind.description}
- 评分标准：{ind.scoring_criteria}
"""
    
    # 构建已有技术比对信息
    existing_tech_text = ""
    if existing_techs:
        existing_tech_text = "\n\n## 已有入库技术（用于查重和横向比较）\n"
        for tech in existing_techs[:20]:
            existing_tech_text += f"- {tech.get('name', '')} ({tech.get('domain', '')}) 评分:{tech.get('score', 'N/A')}\n"
    
    user_prompt = f"""请对以下绿色建筑技术进行评审打分。

## 申报技术名称
{tech_name}

## 评价指标体系（5.27标准）
{indicator_desc}

## 申报材料内容
{document_text[:15000]}

## 自动提取的关键数据
{json.dumps(extracted_data, ensure_ascii=False, indent=2)}
{existing_tech_text}
## 评审要求

根据GBAT-IAFL V1.0基本法，你必须：

1. **逐项评分**：对每个二级指标给出评分，必须附带证据链
2. **证据优先**：每个评分必须引用申报材料中的具体内容
3. **横向比较**：与已有入库技术进行比对，识别雷同/重复
4. **风险标注**：识别技术风险、市场风险、合规风险
5. **可信等级**：对每个评分给出置信度(A/B/C/D/E)
6. **禁止编造**：缺失材料必须降级评价，不得自动编造

请严格按以下JSON格式输出：
{{
    "scores": [
        {{
            "indicator_id": "指标ID",
            "score": 得分,
            "max_score": 满分,
            "confidence": 置信度(0-1),
            "confidence_level": "A/B/C/D/E",
            "evidence": "评分依据（引用原文）",
            "reasoning": "推理过程",
            "risks": ["风险点"],
            "comparison": "与已有技术比较"
        }}
    ],
    "summary": "总体评价摘要",
    "suggestions": ["改进建议"],
    "risk_flags": ["重大风险标注"],
    "overall_confidence": 总体置信度
}}"""
    
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]


def build_pre_check_prompt(
    doc_types: list,
    extracted_data_list: list
) -> List[Dict[str, str]]:
    """构建预审Prompt"""
    
    required_docs = [
        {"type": "application", "name": "申报书", "required": True},
        {"type": "info_sheet", "name": "信息表", "required": True},
        {"type": "commitment", "name": "承诺书", "required": True},
        {"type": "tech_report", "name": "技术总结报告", "required": True},
        {"type": "test_report", "name": "检测报告", "required": True},
        {"type": "case_study", "name": "典型案例材料", "required": True},
        {"type": "patent", "name": "专利证书", "required": False},
    ]
    
    user_prompt = f"""请检查以下申报材料的完整性和质量。

## 必传材料清单
{json.dumps(required_docs, ensure_ascii=False, indent=2)}

## 已上传材料
{json.dumps(doc_types, ensure_ascii=False, indent=2)}

## 各文档提取的关键数据
{json.dumps(extracted_data_list, ensure_ascii=False, indent=2)}

根据GBAT-IAFL V1.0基本法，请输出：
1. 完整性评分（0-100）
2. 质量评分（0-100）
3. 问题清单（缺少什么、什么不合格）
4. 改进建议
5. 可信等级（A/B/C/D/E）"""
    
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]


def build_vector_dedup_prompt(
    tech_name: str,
    tech_description: str,
    existing_techs: list,
) -> List[Dict[str, str]]:
    """构建向量查重Prompt - 技术拓扑基因级解构"""
    
    existing_text = ""
    for tech in existing_techs:
        existing_text += f"\n- {tech.get('name', '')} ({tech.get('domain', '')}): {tech.get('description', '')[:200]}"
    
    user_prompt = f"""请对以下申报技术进行"技术拓扑基因级"解构和查重分析。

## 申报技术
名称：{tech_name}
描述：{tech_description[:3000]}

## 已有入库技术
{existing_text}

## 分析要求

1. **技术基因解构**：提取申报技术的核心技术特征向量
2. **语义空间对齐**：与已有技术进行语义比对
3. **雷同检测**：识别包装化、同质化的雷同技术描述
4. **排他性评估**：评估入库技术的绝对排他性

请输出JSON格式：
{{
    "tech_genes": ["核心技术特征1", "核心技术特征2"],
    "similarity_analysis": [
        {{
            "existing_tech": "相似技术名称",
            "similarity_score": 0.0-1.0,
            "overlapping_genes": ["重叠特征"],
            "differentiation": "差异化分析"
        }}
    ],
    "dedup_result": {{
        "reduction_rate": "削减百分比",
        "homogeneous_descriptions": ["同质化描述列表"],
        "unique_features": ["独有特征"]
    }},
    "exclusivity_assessment": "排他性评估结论",
    "risk_level": "低/中/高",
    "recommendation": "建议"
}}"""
    
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]


def build_full_simulation_prompt(
    project_data: dict,
    evaluation_result: dict,
) -> List[Dict[str, str]]:
    """构建全时模拟Prompt"""
    
    user_prompt = f"""请基于以下项目数据和评审结果，生成全时模拟方案。

## 项目数据
{json.dumps(project_data, ensure_ascii=False, indent=2)}

## 评审结果
{json.dumps(evaluation_result, ensure_ascii=False, indent=2)}

## 模拟要求

1. **生命周期模拟**：模拟技术在全生命周期内的表现
2. **场景推演**：不同应用场景下的效果预测
3. **风险演化**：风险因素随时间的变化趋势
4. **优化路径**：提出技术改进和优化的时间线

请输出JSON格式：
{{
    "simulation_plan": {{
        "objective": "模拟目标",
        "timeline": "模拟时间跨度",
        "scenarios": ["场景列表"],
        "methodology": "模拟方法"
    }},
    "lifecycle_prediction": [
        {{
            "phase": "阶段",
            "performance": "性能预测",
            "risks": ["风险"],
            "milestones": ["里程碑"]
        }}
    ],
    "optimization_path": [
        {{
            "timeframe": "时间框架",
            "action": "优化行动",
            "expected_improvement": "预期提升"
        }}
    ],
    "risk_evolution": "风险演化趋势",
    "conclusion": "模拟结论"
}}"""
    
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]


# 全局实例
llm_service = LLMService()
