import React, { useState, useEffect } from 'react';
import { useProjectStore, Project } from '../stores/projectStore';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { projectApi, evaluationApi } from '../services/api';
import SettingsModal from './SettingsModal';
import HelpCenterModal from './HelpCenterModal';
import AccountManagerModal from './AccountManagerModal';
import Skeleton from './Skeleton';

interface LeftPanelProps {
  onSelectProject?: (project: Project) => void;
}

const LeftPanel: React.FC<LeftPanelProps> = ({ onSelectProject }) => {
  const { projects, currentProject, selectProject } = useProjectStore();
  const { clearMessages, addMessage } = useChatStore();
  const { user, logout, accounts, switchAccount, removeAccount } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewProject, setShowNewProject] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDomain, setNewProjectDomain] = useState('');
  const [selectedModel, setSelectedModel] = useState('Qwen2.5-72B');
  const [webSearch, setWebSearch] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('CN');
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (projects.length > 0) setLoading(false);
  }, [projects]);

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedProjects = {
    reviewing: filteredProjects.filter((p) =>
      ['draft', 'submitted', 'pre_check', 'needs_supplement', 'reviewing'].includes(p.status)
    ),
    history: filteredProjects.filter((p) =>
      ['completed', 'sandbox_triggered', 'archived'].includes(p.status)
    ),
  };

  const handleSelectProject = (project: Project) => {
    selectProject(project);
    clearMessages();
    addMessage({
      id: `welcome_${project.id}`,
      role: 'assistant',
      content: `已加载项目：**${project.name}**\n\n您可以：\n- 拖拽文件到对话框上传\n- 点击【材料预审】检查材料完整性\n- 点击【启动评审】开始AI评审`,
      timestamp: new Date().toISOString(),
      type: 'text',
    });
    onSelectProject?.(project);
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const res = await projectApi.create({ name: newProjectName, domain: newProjectDomain });
      useProjectStore.getState().addProject(res.data);
      setNewProjectName('');
      setNewProjectDomain('');
      setShowNewProject(false);
    } catch (error) {
      console.error('Create project failed:', error);
    }
  };

  const handleLogout = () => logout();

  const handleSwitchAccount = (userId: number) => {
    switchAccount(userId);
    setShowAccountManager(false);
  };

  const handleRemoveAccount = (userId: number) => {
    if (confirm('确定要移除该账号吗？')) {
      removeAccount(userId);
    }
  };

  const reviewingCount = groupedProjects.reviewing.length;

  return (
    <div className="left-panel">
      {/* 评审中状态卡片 */}
      <div className="lp-status-card">
        <span className="lp-status-label">评审中</span>
        <span className="lp-status-count">{reviewingCount}</span>
      </div>

      {/* 项目列表 */}
      <div className="lp-section">
        <div className="lp-section-title">项目列表</div>
        <div className="lp-search-wrap">
          <svg className="lp-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="lp-search-input"
            type="text"
            placeholder="搜索项目名称"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="lp-skeleton">
            <Skeleton type="list" count={3} />
          </div>
        ) : (
          <div className="lp-project-list">
            {groupedProjects.reviewing.map((project) => (
              <div
                key={project.id}
                className={`lp-project-item ${currentProject?.id === project.id ? 'active' : ''}`}
                onClick={() => handleSelectProject(project)}
              >
                <span className="lp-project-icon">📁</span>
                <div className="lp-project-info">
                  <div className="lp-project-name">{project.name}</div>
                  {project.total_score != null && (
                    <div className="lp-project-score">{project.total_score.toFixed(1)}分</div>
                  )}
                </div>
                <span className="lp-project-count">{project.id}</span>
              </div>
            ))}
          </div>
        )}

        <div className="lp-history-link" onClick={() => setShowHistory(!showHistory)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>历史项目 ({groupedProjects.history.length})</span>
        </div>

        {showHistory && (
          <div className="lp-project-list" style={{ marginTop: 8 }}>
            {groupedProjects.history.map((project) => (
              <div
                key={project.id}
                className={`lp-project-item ${currentProject?.id === project.id ? 'active' : ''}`}
                onClick={() => handleSelectProject(project)}
              >
                <span className="lp-project-icon">📁</span>
                <div className="lp-project-info">
                  <div className="lp-project-name">{project.name}</div>
                  {project.total_score != null && (
                    <div className="lp-project-score">{project.total_score.toFixed(1)}分</div>
                  )}
                </div>
                <span className="lp-project-count">{project.id}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 底部设置区 */}
      <div className="lp-settings">
        <div className="lp-setting-row">
          <span className="lp-setting-label">模型选择</span>
          <select className="lp-select" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
            <option value="Qwen2.5-72B">Qwen2.5-72B</option>
            <option value="DeepSeek-V3">DeepSeek-V3</option>
            <option value="GPT-4o">GPT-4o</option>
          </select>
        </div>

        <div className="lp-setting-row">
          <span className="lp-setting-label">联网搜索</span>
          <div className={`lp-toggle ${webSearch ? 'active' : ''}`} onClick={() => setWebSearch(!webSearch)}>
            <div className="lp-toggle-knob"></div>
          </div>
        </div>

        <div className="lp-setting-row">
          <span className="lp-setting-label">评价标准</span>
          <select className="lp-select" value={selectedCountry} onChange={e => setSelectedCountry(e.target.value)}>
            <option value="CN">中国</option>
            <option value="US">美国</option>
            <option value="EU">欧盟</option>
          </select>
        </div>

        <div className="lp-setting-actions">
          <button className="lp-action-btn" onClick={() => setShowSettings(true)}>系统设置</button>
          <button className="lp-action-btn" onClick={() => setShowAccountManager(true)}>账号管理</button>
        </div>

        <div className="lp-user-info">
          <span className="lp-user-name">{user?.name || '系统管理员'}</span>
        </div>
      </div>

      {/* 新建项目弹窗 */}
      {showNewProject && (
        <div className="modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>新建申报项目</h3>
            <div className="form-group">
              <label>项目名称</label>
              <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="请输入项目名称" />
            </div>
            <div className="form-group">
              <label>技术领域</label>
              <select value={newProjectDomain} onChange={(e) => setNewProjectDomain(e.target.value)}>
                <option value="">请选择</option>
                <option value="装配式建筑">装配式建筑</option>
                <option value="节能技术">节能技术</option>
                <option value="绿色建筑">绿色建筑</option>
                <option value="智能建造">智能建造</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowNewProject(false)}>取消</button>
              <button className="primary" onClick={handleCreateProject}>创建</button>
            </div>
          </div>
        </div>
      )}

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <AccountManagerModal
        isOpen={showAccountManager}
        onClose={() => setShowAccountManager(false)}
      />
    </div>
  );
};

export default LeftPanel;
