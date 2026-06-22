import React, { useState, useMemo } from 'react';
import { useProjectStore, Project } from '../stores/projectStore';
import { useChatStore } from '../stores/chatStore';
import { projectApi } from '../services/api';

interface ProjectBoardProps {
  onSelectProject: (project: Project) => void;
}

const ProjectBoard: React.FC<ProjectBoardProps> = ({ onSelectProject }) => {
  const { projects, loadProjects } = useProjectStore();
  const { clearMessages } = useChatStore();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDomain, setNewProjectDomain] = useState('');

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      alert('请输入项目名称');
      return;
    }
    try {
      await projectApi.create({ name: newProjectName, domain: newProjectDomain });
      await loadProjects();
      setNewProjectName('');
      setNewProjectDomain('');
      setShowNewProject(false);
    } catch (error: any) {
      alert('创建失败：' + (error.response?.data?.message || error.message));
    }
  };

  const handleSelectProject = (project: Project) => {
    clearMessages();
    onSelectProject(project);
  };

  // 按状态分组
  const columns = useMemo(() => {
    const todo = projects.filter(p => ['draft'].includes(p.status));
    const inProgress = projects.filter(p => ['submitted', 'pre_check', 'needs_supplement'].includes(p.status));
    const inReview = projects.filter(p => p.status === 'reviewing');
    const done = projects.filter(p => ['completed', 'sandbox_triggered'].includes(p.status));
    return { todo, inProgress, inReview, done };
  }, [projects]);

  const getStatusTag = (status: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      draft: { label: '草稿', color: '#6b7280', bg: '#f3f4f6' },
      submitted: { label: '已提交', color: '#f59e0b', bg: '#fef3c7' },
      pre_check: { label: '预审中', color: '#3b82f6', bg: '#dbeafe' },
      reviewing: { label: '评审中', color: '#8b5cf6', bg: '#ede9fe' },
      completed: { label: '已完成', color: '#10b981', bg: '#d1fae5' },
      sandbox_triggered: { label: '沙箱', color: '#06b6d4', bg: '#cffafe' },
      needs_supplement: { label: '需补正', color: '#ef4444', bg: '#fee2e2' },
    };
    return map[status] || { label: status, color: '#6b7280', bg: '#f3f4f6' };
  };

  const getProgress = (project: Project) => {
    if (project.total_score) return 100;
    const stepMap: Record<string, number> = {
      draft: 10,
      submitted: 30,
      pre_check: 50,
      needs_supplement: 40,
      reviewing: 70,
      completed: 100,
      sandbox_triggered: 90,
    };
    return stepMap[project.status] || 0;
  };

  const getProgressColor = (project: Project) => {
    if (project.total_score) return '#10b981';
    const colorMap: Record<string, string> = {
      draft: '#d1d5db',
      submitted: '#f59e0b',
      pre_check: '#3b82f6',
      needs_supplement: '#ef4444',
      reviewing: '#8b5cf6',
      completed: '#10b981',
      sandbox_triggered: '#06b6d4',
    };
    return colorMap[project.status] || '#d1d5db';
  };

  const renderCard = (project: Project) => {
    const tag = getStatusTag(project.status);
    const progress = getProgress(project);
    const progressColor = getProgressColor(project);
    return (
      <div
        key={project.id}
        className="kanban-card"
        onClick={() => handleSelectProject(project)}
      >
        <div className="kanban-card-title">{project.name}</div>
        <div className="kanban-card-tags">
          <span className="kanban-tag" style={{ color: tag.color, background: tag.bg }}>
            {tag.label}
          </span>
          {project.domain && (
            <span className="kanban-tag domain-tag">#{project.domain}</span>
          )}
        </div>
        <div className="kanban-card-progress">
          <div className="kanban-progress-bar">
            <div
              className="kanban-progress-fill"
              style={{ width: `${progress}%`, background: progressColor }}
            />
          </div>
          <span className="kanban-progress-text">{progress}%</span>
        </div>
        <div className="kanban-card-footer">
          <span className="kanban-card-date">
            {project.created_at ? new Date(project.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : ''}
          </span>
          {project.total_score !== null && project.total_score !== undefined && (
            <span className="kanban-card-score">{project.total_score.toFixed(1)}分</span>
          )}
        </div>
      </div>
    );
  };

  // 统计数据
  const stats = useMemo(() => {
    const total = projects.length;
    const todo = columns.todo.length;
    const inProgress = columns.inProgress.length;
    const inReview = columns.inReview.length;
    const done = columns.done.length;
    return { total, todo, inProgress, inReview, done };
  }, [projects, columns]);

  return (
    <div className="kanban-board">
      {/* 顶部栏 */}
      <div className="kanban-header">
        <div className="kanban-header-left">
          <h2>项目看板</h2>
          <span className="kanban-date">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </span>
        </div>
        <div className="kanban-header-right">
          <button className="kanban-new-btn" onClick={() => setShowNewProject(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新建项目
          </button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="kanban-stats">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">总项目数</div>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">📝</div>
          <div className="stat-info">
            <div className="stat-value">{stats.todo}</div>
            <div className="stat-label">待评审</div>
          </div>
        </div>
        <div className="stat-card reviewing">
          <div className="stat-icon">🔍</div>
          <div className="stat-info">
            <div className="stat-value">{stats.inProgress + stats.inReview}</div>
            <div className="stat-label">评审中</div>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <div className="stat-value">{stats.done}</div>
            <div className="stat-label">已完成</div>
          </div>
        </div>
      </div>

      {/* 看板列 */}
      <div className="kanban-columns">
        {/* 待评审 */}
        <div className="kanban-column">
          <div className="kanban-column-header todo">
            <span className="kanban-column-dot" />
            <span className="kanban-column-title">待评审</span>
            <span className="kanban-column-count">{columns.todo.length}</span>
          </div>
          <div className="kanban-column-body">
            {columns.todo.map(renderCard)}
            {columns.todo.length === 0 && <div className="kanban-empty">暂无项目</div>}
          </div>
        </div>

        {/* 进行中 */}
        <div className="kanban-column">
          <div className="kanban-column-header in-progress">
            <span className="kanban-column-dot" />
            <span className="kanban-column-title">进行中</span>
            <span className="kanban-column-count">{columns.inProgress.length}</span>
          </div>
          <div className="kanban-column-body">
            {columns.inProgress.map(renderCard)}
            {columns.inProgress.length === 0 && <div className="kanban-empty">暂无项目</div>}
          </div>
        </div>

        {/* 评审中 */}
        <div className="kanban-column">
          <div className="kanban-column-header in-review">
            <span className="kanban-column-dot" />
            <span className="kanban-column-title">评审中</span>
            <span className="kanban-column-count">{columns.inReview.length}</span>
          </div>
          <div className="kanban-column-body">
            {columns.inReview.map(renderCard)}
            {columns.inReview.length === 0 && <div className="kanban-empty">暂无项目</div>}
          </div>
        </div>

        {/* 已完成 */}
        <div className="kanban-column">
          <div className="kanban-column-header done">
            <span className="kanban-column-dot" />
            <span className="kanban-column-title">已完成</span>
            <span className="kanban-column-count">{columns.done.length}</span>
          </div>
          <div className="kanban-column-body">
            {columns.done.map(renderCard)}
            {columns.done.length === 0 && <div className="kanban-empty">暂无项目</div>}
          </div>
        </div>
      </div>

      {/* 新建项目弹窗 */}
      {showNewProject && (
        <div className="modal-overlay" onClick={() => setShowNewProject(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3>新建申报项目</h3>
            <div className="form-group">
              <label>项目名称</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="请输入项目名称"
                autoFocus
              />
            </div>
            <div className="form-group">
              <label>技术领域</label>
              <select value={newProjectDomain} onChange={(e) => setNewProjectDomain(e.target.value)}>
                <option value="">请选择</option>
                <option value="装配式建筑">装配式建筑</option>
                <option value="节能技术">节能技术</option>
                <option value="绿色建筑">绿色建筑</option>
                <option value="智能建造">智能建造</option>
                <option value="其他">其他</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={() => setShowNewProject(false)}>取消</button>
              <button className="primary" onClick={handleCreateProject}>创建</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectBoard;
