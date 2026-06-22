import React, { useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useChatStore } from '../stores/chatStore';
import { archiveApi, evaluationApi } from '../services/api';
import FileDropZone from './FileDropZone';
import MaterialChecklist from './MaterialChecklist';

interface StagePanelProps {
  stage: number;
}

const StagePanel: React.FC<StagePanelProps> = ({ stage }) => {
  const { currentProject, updateProject } = useProjectStore();
  const { addMessage } = useChatStore();
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);

  if (!currentProject) return null;

  // Stage 0: 创建项目
  if (stage === 0) {
    return (
      <div className="stage-panel">
        <h3>📝 阶段1：创建项目</h3>
        <div className="stage-content">
          <p>项目已创建：{currentProject.name}</p>
          <p>技术领域：{currentProject.domain || '未指定'}</p>
          <button className="stage-btn primary" onClick={handleInitArchive}>
            初始化档案目录
          </button>
        </div>
      </div>
    );
  }

  // Stage 1: 上传资料
  if (stage === 1) {
    return (
      <div className="stage-panel">
        <h3>📤 阶段2：上传资料</h3>
        <div className="stage-content">
          <FileDropZone projectId={currentProject.id} onUploadComplete={handleUploadComplete} />
          <MaterialChecklist projectId={currentProject.id} />
        </div>
      </div>
    );
  }

  // Stage 2: 本地预检
  if (stage === 2) {
    return (
      <div className="stage-panel">
        <h3>🔍 阶段3：资料完整性检查</h3>
        <div className="stage-content">
          {checkResult ? (
            <div className={`check-result ${checkResult.passed ? 'passed' : 'failed'}`}>
              <div className="check-icon">{checkResult.passed ? '✅' : '❌'}</div>
              <div className="check-summary">{checkResult.summary}</div>
              <div className="check-score">完整性：{checkResult.completeness}%</div>
              {checkResult.issues.length > 0 && (
                <ul className="check-issues">
                  {checkResult.issues.map((issue: any, i: number) => (
                    <li key={i}>{issue.message}</li>
                  ))}
                </ul>
              )}
              {checkResult.passed ? (
                <button className="stage-btn primary" onClick={handleStartEvaluation}>
                  确认提交，启动AI评审
                </button>
              ) : (
                <button className="stage-btn" onClick={handleBackToUpload}>
                  返回补充材料
                </button>
              )}
            </div>
          ) : (
            <button className="stage-btn primary" onClick={handlePreCheck} disabled={isChecking}>
              {isChecking ? '检查中...' : '开始检查'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Stage 3: AI评审中
  if (stage === 3) {
    return (
      <div className="stage-panel">
        <h3>⚙️ 阶段4：AI评审进行中</h3>
        <div className="stage-content">
          <div className="evaluating-status">
            <div className="spinner"></div>
            <p>正在对 {currentProject.name} 进行多维度评估...</p>
            <p className="eval-note">评估维度：技术先进性、绿色低碳、工程成熟度、经济适用性、材料质量</p>
          </div>
        </div>
      </div>
    );
  }

  // Stage 4: 评审结果
  if (stage === 4) {
    return (
      <div className="stage-panel">
        <h3>✅ 阶段5：评审结果</h3>
        <div className="stage-content">
          <div className="result-summary">
            <div className="result-score">{currentProject.total_score?.toFixed(1)}</div>
            <div className="result-grade">{currentProject.grade}</div>
          </div>
          <button className="stage-btn" onClick={handleViewResult}>
            查看详细报告
          </button>
          {currentProject.sandbox_triggered && (
            <button className="stage-btn primary" onClick={handleSandbox}>
              进入研创沙箱
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;

  async function handleInitArchive() {
    if (!currentProject) return;
    try {
      const res = await archiveApi.init(currentProject.id);
      updateProject(currentProject.id, { archive_path: res.data.archive_path });
      addMessage({
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `✅ 档案目录已初始化\n\n路径：${res.data.archive_path}\n\n请上传申报材料。`,
        timestamp: new Date().toISOString(),
        type: 'system'
      });
    } catch (error: any) {
      addMessage({
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `❌ 初始化失败：${error.message}`,
        timestamp: new Date().toISOString(),
        type: 'system'
      });
    }
  }

  function handleUploadComplete() {
    addMessage({
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: '文件上传完成，请点击【资料检查】验证完整性。',
      timestamp: new Date().toISOString(),
      type: 'system'
    });
  }

  async function handlePreCheck() {
    if (!currentProject) return;
    setIsChecking(true);
    try {
      const res = await archiveApi.preCheck(currentProject.id);
      setCheckResult(res.data);
    } catch (error: any) {
      addMessage({
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `❌ 检查失败：${error.message}`,
        timestamp: new Date().toISOString(),
        type: 'system'
      });
    } finally {
      setIsChecking(false);
    }
  }

  function handleBackToUpload() {
    setCheckResult(null);
  }

  async function handleStartEvaluation() {
    if (!currentProject) return;
    try {
      const res = await evaluationApi.start(currentProject.id);
      if (res.data.success) {
        addMessage({
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `🚀 AI评审已启动\n\n${res.data.message}`,
          timestamp: new Date().toISOString(),
          type: 'system'
        });
      } else {
        addMessage({
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${res.data.message}`,
          timestamp: new Date().toISOString(),
          type: 'system'
        });
      }
    } catch (error: any) {
      addMessage({
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: `❌ 启动失败：${error.message}`,
        timestamp: new Date().toISOString(),
        type: 'system'
      });
    }
  }

  function handleViewResult() {
    addMessage({
      id: `msg_${Date.now()}`,
      role: 'user',
      content: '查看评审结果',
      timestamp: new Date().toISOString(),
      type: 'text'
    });
  }

  function handleSandbox() {
    addMessage({
      id: `msg_${Date.now()}`,
      role: 'user',
      content: '进入研创沙箱',
      timestamp: new Date().toISOString(),
      type: 'text'
    });
  }
};

export default StagePanel;
