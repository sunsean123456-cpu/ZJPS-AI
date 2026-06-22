import React, { useState, useRef, useEffect } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { useProjectStore, Project } from '../stores/projectStore';
import { useChatStore, Message } from '../stores/chatStore';
import { evaluationApi, documentApi, archiveApi } from '../services/api';
import MessageBubble from './MessageBubble';
import FlowProgress from './FlowProgress';
import DocumentList from './DocumentList';
import AIIcon from './AIIcon';

interface ChatPanelProps {
  project: Project;
  onBack: () => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ project, onBack }) => {
  const { projects, updateProject } = useProjectStore();
  const { messages, addMessage, isStreaming, setStreaming } = useChatStore();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showAnimation, setShowAnimation] = useState(true);
  const [animationStep, setAnimationStep] = useState(0);
  const [previewFiles, setPreviewFiles] = useState<File[]>([]);
  const [transitioning, setTransitioning] = useState(false);
  const prevProjectId = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (project && project.id !== prevProjectId.current) {
      setTransitioning(true);
      const timer = setTimeout(() => setTransitioning(false), 150);
      prevProjectId.current = project.id;
      return () => clearTimeout(timer);
    }
  }, [project]);

  useEffect(() => {
    if (project) {
      setCurrentStage(project.current_step || 0);
    }
  }, [project]);

  useEffect(() => {
    if (virtuosoRef.current && messages.length > 0) {
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({
          index: messages.length - 1,
          behavior: 'smooth',
        });
      }, 100);
    }
  }, [messages.length]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '凌晨好';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  const quickQuestions = [
    '如何提升项目得分？',
    '必传材料清单是什么？',
    '绿色建筑三星标准有哪些？',
    '如何撰写申报材料？',
  ];

  const quickActionCards = [
    { icon: '📎', label: '上传文件', action: 'upload' },
    { icon: '📋', label: '材料预审', action: 'precheck' },
    { icon: '📝', label: '工作报告', action: 'report' },
    { icon: '📄', label: '导出报告', action: 'export' },
  ];

  const handleSend = async () => {
    if (!inputText.trim() || !project || isLoading || isStreaming) return;
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: inputText,
      timestamp: new Date().toISOString(),
      type: 'text',
    };
    addMessage(userMessage);
    const currentInput = inputText;
    setInputText('');
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: currentInput,
          project_id: project.id,
          session_id: `session_${project.id}_${Date.now()}`
        })
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      addMessage({
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        type: 'text',
      });
    } catch (error) {
      console.error('AI对话失败:', error);
      addMessage({
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: '⚠️ AI 响应失败，请检查后端服务是否运行或稍后重试',
        timestamp: new Date().toISOString(),
        type: 'text',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (q: string) => {
    setInputText(q);
  };

  const handleQuickActionCard = (action: string) => {
    switch (action) {
      case 'upload':
        fileInputRef.current?.click();
        break;
      case 'precheck':
        handleQuickAction('📋 材料预审');
        break;
      case 'report':
        handleQuickAction('📝 工作报告');
        break;
      case 'export':
        handleQuickAction('📄 导出报告');
        break;
    }
  };

  const handleQuickAction = async (action: string) => {
    if (!project) return;
    addMessage({
      id: `msg_${Date.now()}`,
      role: 'user',
      content: action,
      timestamp: new Date().toISOString(),
      type: 'text',
    });
    setIsLoading(true);
    try {
      let response = '';
      if (action.includes('材料预审')) {
        const res = await archiveApi.preCheck(project.id);
        const data = res.data;
        response = `📋 **材料预审结果**\n\n完整性：${data.completeness}%\n通过：${data.passed_count}/${data.total_required}\n\n${data.passed ? '✅ 可以启动评审' : '❌ 还需补充材料'}\n\n${data.issues.length > 0 ? '问题：\n' + data.issues.map((i: any) => `- ${i.message}`).join('\n') : ''}`;
        setCurrentStage(2);
        updateProject(project.id, { current_step: 2 });
      } else if (action.includes('启动评审')) {
        handleStartStreamEvaluation();
        return;
      } else if (action.includes('查看结果')) {
        const res = await evaluationApi.getResult(project.id);
        const data = res.data as any;
        if (data.success !== false) {
          response = `📊 **评审结果**\n\n总分：${data.total_score}\n等级：${data.grade}\n\n${data.summary}`;
        } else {
          response = `⚠️ ${data.message}`;
        }
      } else if (action.includes('工作报告')) {
        response = `📝 **工作报告生成**\n\n正在生成工作报告...\n\n报告类型：月报\n统计周期：${new Date().getFullYear()}年${new Date().getMonth() + 1}月\n\n报告内容：\n- 本月评审项目总数：${projects.length}\n- 已完成评审：${projects.filter(p => p.status === 'completed').length}\n- 评审中：${projects.filter(p => p.status === 'reviewing').length}\n- 待评审：${projects.filter(p => p.status === 'draft').length}`;
      } else if (action.includes('导出报告')) {
        response = `📄 **导出评审报告**\n\n正在生成 PDF 报告...\n\n报告内容：\n- 项目基本信息\n- 评审得分与等级\n- 各维度详细评分\n- 改进建议\n\nPDF 报告已生成，可通过以下链接下载：\n[点击下载评审报告](/api/evaluation/export/${project.id}/pdf)`;
      } else {
        response = `收到您的问题："${action}"`;
      }
      addMessage({
        id: `msg_${Date.now()}_ai`,
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
        type: 'text',
      });
    } catch (error: any) {
      addMessage({
        id: `msg_${Date.now()}_error`,
        role: 'assistant',
        content: `⚠️ 操作失败：${error.message}`,
        timestamp: new Date().toISOString(),
        type: 'text',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (!project) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    setPreviewFiles(files);
    addMessage({ id: `msg_${Date.now()}`, role: 'user', content: `📎 上传了 ${files.length} 个文件`, timestamp: new Date().toISOString(), type: 'file' });
    setIsLoading(true);
    const uploaded: string[] = [];
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        await archiveApi.upload(project.id, formData);
        uploaded.push(file.name);
      } catch (error: any) {
        console.error(`上传失败: ${file.name}`, error);
      }
    }
    addMessage({ id: `msg_${Date.now()}_ai`, role: 'assistant', content: `✅ 文件上传完成\n\n已上传：${uploaded.join('、')}\n\n请点击【📋 材料预审】检查材料完整性。`, timestamp: new Date().toISOString(), type: 'text' });
    setIsLoading(false);
    setRefreshKey(k => k + 1);
    if (project.current_step !== undefined && project.current_step < 1) {
      setCurrentStage(1);
      updateProject(project.id, { current_step: 1 });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!project) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    addMessage({ id: `msg_${Date.now()}`, role: 'user', content: `📎 选择了 ${files.length} 个文件`, timestamp: new Date().toISOString(), type: 'file' });
    setIsLoading(true);
    const uploaded: string[] = [];
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        await archiveApi.upload(project.id, formData);
        uploaded.push(file.name);
      } catch (error: any) {
        console.error(`上传失败: ${file.name}`, error);
      }
    }
    addMessage({ id: `msg_${Date.now()}_ai`, role: 'assistant', content: `✅ 文件上传完成\n\n已上传：${uploaded.join('、')}\n\n请点击【📋 材料预审】检查材料完整性。`, timestamp: new Date().toISOString(), type: 'text' });
    setIsLoading(false);
    setRefreshKey(k => k + 1);
    if (project.current_step !== undefined && project.current_step < 1) {
      setCurrentStage(1);
      updateProject(project.id, { current_step: 1 });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFollowUp = async (question: string) => {
    if (!project || isLoading || isStreaming) return;
    addMessage({ id: `msg_${Date.now()}`, role: 'user', content: question, timestamp: new Date().toISOString(), type: 'text' });
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/chat/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: question,
          project_id: project.id,
          session_id: `session_${project.id}_${Date.now()}`
        })
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      addMessage({ id: `msg_${Date.now()}_ai`, role: 'assistant', content: data.response, timestamp: new Date().toISOString(), type: 'text' });
    } catch (error) {
      console.error('AI对话失败:', error);
      addMessage({ id: `msg_${Date.now()}_error`, role: 'assistant', content: '⚠️ AI 响应失败，请检查后端服务是否运行或稍后重试', timestamp: new Date().toISOString(), type: 'text' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartStreamEvaluation = async () => {
    if (!project) return;
    try {
      const preCheckRes = await archiveApi.preCheck(project.id);
      if (!preCheckRes.data.passed) {
        addMessage({ id: `msg_${Date.now()}`, role: 'assistant', content: `❌ 材料不完整，无法启动评审\n\n完整性：${preCheckRes.data.completeness}%\n\n问题：\n${preCheckRes.data.issues.map((i: any) => `- ${i.message}`).join('\n')}`, timestamp: new Date().toISOString(), type: 'text' });
        return;
      }
    } catch (err: any) { console.error('预检失败:', err); }
    addMessage({ id: `msg_${Date.now()}`, role: 'user', content: '🚀 启动 AI 评审', timestamp: new Date().toISOString(), type: 'text' });
    window.dispatchEvent(new CustomEvent('startStreamEvaluation', { detail: { projectId: project.id } }));
  };

  const handleStartReview = async () => {
    if (!project) return;
    setIsEvaluating(true);
    setIsPaused(false);
    abortControllerRef.current = new AbortController();
    addMessage({ id: `msg_${Date.now()}`, role: 'user', content: '🚀 启动评审', timestamp: new Date().toISOString(), type: 'text' });
    setIsLoading(true);
    try {
      const preCheckRes = await archiveApi.preCheck(project.id);
      const preCheck = preCheckRes.data;
      setCurrentStage(2);
      updateProject(project.id, { current_step: 2 });
      if (abortControllerRef.current.signal.aborted) {
        addMessage({ id: `msg_${Date.now()}_ai`, role: 'assistant', content: '⏸️ 评审已暂停', timestamp: new Date().toISOString(), type: 'text' });
        return;
      }
      let response = `📋 **智能预检结果**\n\n完整性：**${preCheck.completeness.toFixed(1)}%**\n通过：${preCheck.passed_count}/${preCheck.total_required}\n\n`;
      if (preCheck.issues && preCheck.issues.length > 0) {
        response += `⚠️ **发现以下问题：**\n`;
        preCheck.issues.forEach((issue: any) => { response += `- ${issue.message}\n`; });
        response += `\n`;
      }
      if (preCheck.passed) {
        response += `✅ 材料完整，可以进入正式评审。\n\n**请选择：**\n1. 点击【继续评审】启动正式评审\n2. 点击【补充材料】继续上传缺失文件`;
        addMessage({ id: `msg_${Date.now()}_ai`, role: 'assistant', content: response, timestamp: new Date().toISOString(), type: 'text', followUp: ['继续评审', '补充材料'] });
      } else {
        response += `❌ 材料不完整，建议先补充缺失文件。\n\n**请选择：**\n1. 点击【补充材料】上传缺失文件\n2. 点击【继续评审】强制启动评审（不推荐）`;
        addMessage({ id: `msg_${Date.now()}_ai`, role: 'assistant', content: response, timestamp: new Date().toISOString(), type: 'text', followUp: ['补充材料', '继续评审'] });
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        addMessage({ id: `msg_${Date.now()}_ai`, role: 'assistant', content: '⏸️ 评审已暂停', timestamp: new Date().toISOString(), type: 'text' });
      } else {
        addMessage({ id: `msg_${Date.now()}_error`, role: 'assistant', content: `⚠️ 预检失败：${error.message}`, timestamp: new Date().toISOString(), type: 'text' });
      }
    } finally {
      setIsLoading(false);
      setIsEvaluating(false);
    }
  };

  const handlePause = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsPaused(true);
      setIsEvaluating(false);
    }
  };

  return (
    <div className="chat-panel">
      <div className="chat-body-with-docs">
        <div className="chat-main-column">

          {/* 欢迎 Banner */}
          <div className="chat-welcome-banner">
            <div className="welcome-content">
              <div className="welcome-greeting">
                <h2>{getGreeting()}！我是绿色建筑技术评价助手</h2>
                <span className="welcome-leaf">🍃</span>
              </div>
              <p className="welcome-subtitle">
                我可以解答绿色建筑技术评价相关问题，提供技术支持与评审建议，帮助您高效完成申报工作
              </p>
            </div>
            <div className="welcome-illustration">
              <svg viewBox="0 0 200 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="45" width="35" height="55" rx="3" fill="#d1fae5" stroke="#10b981" strokeWidth="1.5"/>
                <rect x="25" y="55" width="8" height="8" rx="1" fill="#a7f3d0"/>
                <rect x="37" y="55" width="8" height="8" rx="1" fill="#a7f3d0"/>
                <rect x="25" y="68" width="8" height="8" rx="1" fill="#a7f3d0"/>
                <rect x="37" y="68" width="8" height="8" rx="1" fill="#a7f3d0"/>
                <rect x="65" y="30" width="50" height="70" rx="3" fill="#a7f3d0" stroke="#059669" strokeWidth="1.5"/>
                <rect x="72" y="40" width="10" height="10" rx="1" fill="#86efac"/>
                <rect x="88" y="40" width="10" height="10" rx="1" fill="#86efac"/>
                <rect x="72" y="55" width="10" height="10" rx="1" fill="#86efac"/>
                <rect x="88" y="55" width="10" height="10" rx="1" fill="#86efac"/>
                <rect x="72" y="70" width="10" height="10" rx="1" fill="#86efac"/>
                <rect x="88" y="70" width="10" height="10" rx="1" fill="#86efac"/>
                <rect x="125" y="50" width="40" height="50" rx="3" fill="#d1fae5" stroke="#10b981" strokeWidth="1.5"/>
                <rect x="132" y="60" width="8" height="8" rx="1" fill="#a7f3d0"/>
                <rect x="144" y="60" width="8" height="8" rx="1" fill="#a7f3d0"/>
                <rect x="132" y="73" width="8" height="8" rx="1" fill="#a7f3d0"/>
                <rect x="144" y="73" width="8" height="8" rx="1" fill="#a7f3d0"/>
                <line x1="10" y1="100" x2="180" y2="100" stroke="#059669" strokeWidth="2"/>
                <circle cx="90" cy="18" r="10" fill="#fbbf24" opacity="0.8"/>
                <path d="M5 80 Q20 60 30 80" stroke="#6ee7b7" strokeWidth="1.5" fill="none"/>
                <path d="M160 80 Q170 65 175 85" stroke="#6ee7b7" strokeWidth="1.5" fill="none"/>
                <circle cx="45" cy="38" r="3" fill="#6ee7b7" opacity="0.5"/>
                <circle cx="155" cy="42" r="2.5" fill="#6ee7b7" opacity="0.5"/>
              </svg>
            </div>
          </div>

          {/* 推荐问题 */}
          <div className="chat-quick-questions">
            <div className="quick-questions-title">💡 您可以试着问：</div>
            <div className="quick-questions-list">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  className="quick-question-btn"
                  onClick={() => handleQuickQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* 消息区域 */}
          <div className="chat-body-new">
            <div
              className={`messages-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragging && (
                <div className="drag-overlay">
                  <div className="drag-hint">
                    <div className="drag-icon">📁</div>
                    <div>释放文件以上传</div>
                  </div>
                </div>
              )}

              {messages.length === 0 ? (
                <div className="empty-messages">
                  <div className="empty-greeting">
                    <p style={{ fontSize: 14, color: '#475569' }}>👋 欢迎使用绿色建筑技术评价系统</p>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                      已加载项目：<strong>{project.name}</strong> — 您可以拖拽文件到此处上传
                    </p>
                  </div>
                </div>
              ) : (
                <Virtuoso
                  ref={virtuosoRef}
                  data={messages}
                  followOutput="smooth"
                  itemContent={(index, message) => (
                    <MessageBubble
                      key={message.id || index}
                      message={message}
                      onFollowUp={handleFollowUp}
                    />
                  )}
                  style={{ height: '100%' }}
                />
              )}
              {isLoading && (
                <div className="typing-indicator">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
              )}
            </div>
          </div>

          {/* 快捷操作卡片栏 + 输入框 */}
          <div className="chat-bottom-area">
            <div className="quick-actions-cards">
              {quickActionCards.map((card, i) => (
                <div
                  key={i}
                  className="quick-action-card"
                  onClick={() => handleQuickActionCard(card.action)}
                >
                  <span className="quick-action-icon">{card.icon}</span>
                  <span className="quick-action-label">{card.label}</span>
                </div>
              ))}
              <div
                className="quick-action-card primary"
                onClick={handleStartReview}
              >
                <span className="quick-action-icon">🚀</span>
                <span className="quick-action-label">启动评审</span>
              </div>
            </div>

            <div className="input-row-centered">
              <button
                className="input-icon-btn"
                onClick={() => fileInputRef.current?.click()}
                title="上传文件"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
                rows={2}
                disabled={isLoading || isStreaming}
              />
              {isLoading || isEvaluating ? (
                <button className="action-btn pause" onClick={handlePause} title="暂停">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16" rx="1"/>
                    <rect x="14" y="4" width="4" height="16" rx="1"/>
                  </svg>
                </button>
              ) : (
                <button
                  className="action-btn send"
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  title="发送"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 右侧文档列表 */}
        <div className="doc-sidebar">
          {project && <DocumentList key={refreshKey} projectId={project.id} />}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default ChatPanel;
