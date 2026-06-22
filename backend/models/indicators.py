"""
绿色建筑先进性技术评价指标体系
基于住建部5.27评价指标体系
"""

from dataclasses import dataclass
from typing import List, Optional
from enum import Enum


class IndicatorLevel(Enum):
    L1 = 1  # 一级指标
    L2 = 2  # 二级指标
    L3 = 3  # 三级指标（评价要素）


@dataclass
class EvaluationIndicator:
    """评价指标"""
    id: str
    parent_id: Optional[str]
    level: IndicatorLevel
    name: str
    max_score: float
    weight: float
    description: str
    scoring_criteria: str  # 评分标准描述（供LLM比对）
    sort_order: int


# 评价指标体系完整定义
INDICATORS_TREE = [
    # 一级指标1：技术先进性 (20分)
    EvaluationIndicator(
        id="L1_01",
        parent_id=None,
        level=IndicatorLevel.L1,
        name="技术先进性",
        max_score=20.0,
        weight=0.20,
        description="评估技术的创新程度、路线清晰度及知识产权基础",
        scoring_criteria="",
        sort_order=1
    ),
    # 二级指标1.1：技术创新程度 (8分)
    EvaluationIndicator(
        id="L2_01_01",
        parent_id="L1_01",
        level=IndicatorLevel.L2,
        name="技术创新程度",
        max_score=8.0,
        weight=0.40,
        description="核验是否具有原创性、集成创新或明显改进；是否优于现有同类技术；是否解决关键硬核痛点",
        scoring_criteria="""
        8分：具有重大原创性突破，明显优于国际同类技术
        6-7分：具有显著集成创新，优于国内同类技术
        4-5分：有一定改进，优于区域/行业现有技术
        2-3分：改进有限，与现有技术相当
        0-1分：无明显创新
        """,
        sort_order=1
    ),
    # 二级指标1.2：技术路线清晰度 (6分)
    EvaluationIndicator(
        id="L2_01_02",
        parent_id="L1_01",
        level=IndicatorLevel.L2,
        name="技术路线清晰度",
        max_score=6.0,
        weight=0.30,
        description="核验技术原理、构造形式、工艺路线、系统边界是否清楚；技术方案是否完整合乎逻辑",
        scoring_criteria="""
        6分：技术原理、构造、工艺、边界极其清晰，方案完整严谨
        4-5分：技术路线清晰，方案完整
        3分：技术路线基本清晰，方案较完整
        1-2分：技术路线有模糊之处，方案有缺漏
        0分：技术路线混乱，方案不完整
        """,
        sort_order=2
    ),
    # 二级指标1.3：知识产权与成果基础 (6分)
    EvaluationIndicator(
        id="L2_01_03",
        parent_id="L1_01",
        level=IndicatorLevel.L2,
        name="知识产权与成果基础",
        max_score=6.0,
        weight=0.30,
        description="清点并核验专利（发明/实用新型）、软著、工法、标准图集、获奖等支撑材料的真实权属",
        scoring_criteria="""
        6分：发明专利≥3项，或国家级获奖，知识产权体系完整
        4-5分：发明专利≥1项或实用新型≥5项，省部级获奖
        3分：实用新型≥2项，市级获奖
        1-2分：有少量知识产权，权属清晰
        0分：无知识产权或权属存疑
        """,
        sort_order=3
    ),
    
    # 一级指标2：绿色低碳与性能效果 (25分)
    EvaluationIndicator(
        id="L1_02",
        parent_id=None,
        level=IndicatorLevel.L1,
        name="绿色低碳与性能效果",
        max_score=25.0,
        weight=0.25,
        description="评估节能降碳效果、绿建性能贡献及检测评价支撑",
        scoring_criteria="",
        sort_order=2
    ),
    # 二级指标2.1：节能降碳效果 (10分)
    EvaluationIndicator(
        id="L2_02_01",
        parent_id="L1_02",
        level=IndicatorLevel.L2,
        name="节能降碳效果",
        max_score=10.0,
        weight=0.40,
        description="审查是否具备明确的节能率、减碳量、能效提升、资源节约等量化指标，核验数据可靠性",
        scoring_criteria="""
        10分：节能率≥50%或减碳量≥60%，数据经第三方权威检测
        8-9分：节能率≥30%或减碳量≥40%，数据可靠
        5-7分：节能率≥15%或减碳量≥20%，有检测数据
        3-4分：节能率≥5%或减碳量≥10%，数据支撑一般
        0-2分：节能降碳效果不明显或数据不足
        """,
        sort_order=1
    ),
    # 二级指标2.2：绿色建筑性能贡献 (8分)
    EvaluationIndicator(
        id="L2_02_02",
        parent_id="L1_02",
        level=IndicatorLevel.L2,
        name="绿色建筑性能贡献",
        max_score=8.0,
        weight=0.32,
        description="评估是否对安全耐久、健康舒适、生活便利、资源节约、环境宜居等绿建目标具有明显支撑",
        scoring_criteria="""
        8分：对≥4项绿建目标有显著支撑，有量化证据
        6-7分：对≥3项绿建目标有明显支撑
        4-5分：对≥2项绿建目标有支撑
        2-3分：对1项绿建目标有支撑
        0-1分：绿建性能贡献不明显
        """,
        sort_order=2
    ),
    # 二级指标2.3：检测评价支撑 (7分)
    EvaluationIndicator(
        id="L2_02_03",
        parent_id="L1_02",
        level=IndicatorLevel.L2,
        name="检测评价支撑",
        max_score=7.0,
        weight=0.28,
        description="核验是否具备法定的第三方检测报告、评价证书、验收证明、验收证明、运行监测数据等客观材料",
        scoring_criteria="""
        7分：具备国家级检测机构报告+评价证书+验收证明+运行数据
        5-6分：具备第三方检测报告+验收证明
        3-4分：具备基本检测报告
        1-2分：检测材料不完整
        0分：无检测评价材料
        """,
        sort_order=3
    ),
    
    # 一级指标3：工程成熟度与应用基础 (20分)
    EvaluationIndicator(
        id="L1_03",
        parent_id=None,
        level=IndicatorLevel.L1,
        name="工程成熟度与应用基础",
        max_score=20.0,
        weight=0.20,
        description="评估技术成熟度、典型案例质量及运行稳定性",
        scoring_criteria="",
        sort_order=3
    ),
    # 二级指标3.1：技术成熟度 (7分)
    EvaluationIndicator(
        id="L2_03_01",
        parent_id="L1_03",
        level=IndicatorLevel.L2,
        name="技术成熟度",
        max_score=7.0,
        weight=0.35,
        description="核验是否完成实验室验证、中试验证、工程示范或规模化应用，评估成熟技术阶段",
        scoring_criteria="""
        7分：已规模化应用（≥10个项目），技术完全成熟
        5-6分：已完成工程示范（≥3个项目），技术成熟
        3-4分：已完成中试验证，进入工程示范阶段
        2分：完成实验室验证，进入中试阶段
        0-1分：处于实验室阶段，未经验证
        """,
        sort_order=1
    ),
    # 二级指标3.2：典型案例质量 (7分)
    EvaluationIndicator(
        id="L2_03_02",
        parent_id="L1_03",
        level=IndicatorLevel.L2,
        name="典型案例质量",
        max_score=7.0,
        weight=0.35,
        description="评估典型案例的真实性、完整性、代表性；是否提供项目单位盖章的用户意见与反馈",
        scoring_criteria="""
        7分：≥5个代表性案例，材料完整，有盖章用户反馈
        5-6分：≥3个案例，材料完整
        3-4分：≥2个案例，材料基本完整
        1-2分：1个案例，或材料有缺漏
        0分：无典型案例
        """,
        sort_order=2
    ),
    # 二级指标3.3：运行稳定性 (6分)
    EvaluationIndicator(
        id="L2_03_03",
        parent_id="L1_03",
        level=IndicatorLevel.L2,
        name="运行稳定性",
        max_score=6.0,
        weight=0.30,
        description="审查是否经过一定周期的实际运行检验，运行效果是否稳定，运维问题是否完全可控",
        scoring_criteria="""
        6分：运行≥3年，效果稳定，运维完全可控
        4-5分：运行≥2年，效果稳定
        2-3分：运行≥1年，效果基本稳定
        1分：运行<1年，有少量运维问题
        0分：未实际运行或运维问题严重
        """,
        sort_order=3
    ),
    
    # 一级指标4：经济适用性与推广价值 (20分)
    EvaluationIndicator(
        id="L1_04",
        parent_id=None,
        level=IndicatorLevel.L1,
        name="经济适用性与推广价值",
        max_score=20.0,
        weight=0.20,
        description="评估成本可控性、适用范围清晰度及可复制可推广性",
        scoring_criteria="",
        sort_order=4
    ),
    # 二级指标4.1：成本可控性 (7分)
    EvaluationIndicator(
        id="L2_04_01",
        parent_id="L1_04",
        level=IndicatorLevel.L2,
        name="成本可控性",
        max_score=7.0,
        weight=0.35,
        description="分析初始投资、运行维护成本、增量投资回收期是否合理；与同类技术相比是否具备显著经济优势",
        scoring_criteria="""
        7分：增量成本回收期<2年，全寿命周期成本优势≥30%
        5-6分：增量成本回收期<5年，有经济优势
        3-4分：增量成本回收期<8年，经济性一般
        1-2分：增量成本回收期≥8年，经济性较差
        0分：经济性不可行
        """,
        sort_order=1
    ),
    # 二级指标4.2：适用范围清晰度 (6分)
    EvaluationIndicator(
        id="L2_04_02",
        parent_id="L1_04",
        level=IndicatorLevel.L2,
        name="适用范围清晰度",
        max_score=6.0,
        weight=0.30,
        description="核验适用地区、气候区、建筑类型、工程部位、应用阶段和使用条件是否明确定义",
        scoring_criteria="""
        6分：适用范围极其清晰，覆盖≥3种气候区/建筑类型
        4-5分：适用范围清晰，覆盖≥2种气候区/建筑类型
        3分：适用范围基本清晰
        1-2分：适用范围有模糊之处
        0分：适用范围不明确
        """,
        sort_order=2
    ),
    # 二级指标4.3：可复制可推广性 (7分)
    EvaluationIndicator(
        id="L2_04_03",
        parent_id="L1_04",
        level=IndicatorLevel.L2,
        name="可复制可推广性",
        max_score=7.0,
        weight=0.35,
        description="评估是否具备规模化推广物理条件，是否适合在不同区域、不同建筑类型中低成本复制",
        scoring_criteria="""
        7分：具备全国规模化推广条件，复制成本极低
        5-6分：具备区域推广条件，复制成本较低
        3-4分：可有限复制，推广有一定限制
        1-2分：复制难度大，推广受限
        0分：无法复制推广
        """,
        sort_order=3
    ),
    
    # 一级指标5：申报材料质量与合规性 (15分)
    EvaluationIndicator(
        id="L1_05",
        parent_id=None,
        level=IndicatorLevel.L1,
        name="申报材料质量与合规性",
        max_score=15.0,
        weight=0.15,
        description="检查材料完整性、合规性及数据可信度",
        scoring_criteria="",
        sort_order=5
    ),
    # 二级指标5.1：材料完整性 (5分)
    EvaluationIndicator(
        id="L2_05_01",
        parent_id="L1_05",
        level=IndicatorLevel.L2,
        name="材料完整性",
        max_score=5.0,
        weight=0.33,
        description="检查申报书、信息表、承诺书、技术总结报告、检测报告、案例盖章件等是否规范齐全",
        scoring_criteria="""
        5分：所有材料齐全、规范
        4分：材料齐全，个别格式不规范
        3分：缺少1-2项非核心材料
        1-2分：缺少核心材料
        0分：材料严重缺失
        """,
        sort_order=1
    ),
    # 二级指标5.2：合规性与权属清晰度 (6分)
    EvaluationIndicator(
        id="L2_05_02",
        parent_id="L1_05",
        level=IndicatorLevel.L2,
        name="合规性与权属清晰度",
        max_score=6.0,
        weight=0.40,
        description="核验是否符合国家法律法规与强制性条文；是否存在知识产权争议、涉密、限制或禁止使用问题",
        scoring_criteria="""
        6分：完全合规，权属清晰无争议
        4-5分：合规，权属基本清晰
        3分：有轻微合规问题或权属模糊
        1-2分：有明显合规问题
        0分：严重违规或权属争议
        """,
        sort_order=2
    ),
    # 二级指标5.3：表达与数据可信度 (4分)
    EvaluationIndicator(
        id="L2_05_03",
        parent_id="L1_05",
        level=IndicatorLevel.L2,
        name="表达与数据可信度",
        max_score=4.0,
        weight=0.27,
        description="技术描述是否准确清楚；数据来源是否可靠可核验；是否存在夸大宣传或前后数据矛盾",
        scoring_criteria="""
        4分：描述准确，数据可靠可核验，无矛盾
        3分：描述清楚，数据基本可靠
        2分：描述有瑕疵，数据需进一步核验
        1分：描述不清，数据可信度存疑
        0分：存在夸大宣传或数据矛盾
        """,
        sort_order=3
    ),
]


def get_all_indicators() -> List[EvaluationIndicator]:
    """获取所有指标"""
    return INDICATORS_TREE


def get_l1_indicators() -> List[EvaluationIndicator]:
    """获取所有一级指标"""
    return [i for i in INDICATORS_TREE if i.level == IndicatorLevel.L1]


def get_l2_indicators() -> List[EvaluationIndicator]:
    """获取所有二级指标"""
    return [i for i in INDICATORS_TREE if i.level == IndicatorLevel.L2]


def get_l2_by_l1(l1_id: str) -> List[EvaluationIndicator]:
    """根据一级指标获取其下所有二级指标"""
    return [i for i in INDICATORS_TREE if i.parent_id == l1_id]


def get_indicator_by_id(indicator_id: str) -> Optional[EvaluationIndicator]:
    """根据ID获取指标"""
    for i in INDICATORS_TREE:
        if i.id == indicator_id:
            return i
    return None
