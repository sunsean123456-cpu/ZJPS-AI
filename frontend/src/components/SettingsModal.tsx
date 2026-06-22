import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'users' | 'skills' | 'models'>('users');
  const { user } = useAuthStore();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ 系统设置</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="settings-body">
          <div className="settings-tabs">
            <button
              className={`tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 用户管理
            </button>
            <button
              className={`tab ${activeTab === 'skills' ? 'active' : ''}`}
              onClick={() => setActiveTab('skills')}
            >
              🧩 Skill管理
            </button>
            <button
              className={`tab ${activeTab === 'models' ? 'active' : ''}`}
              onClick={() => setActiveTab('models')}
            >
              🤖 模型管理
            </button>
          </div>

          <div className="settings-content">
            {activeTab === 'users' && <UsersManagement />}
            {activeTab === 'skills' && <SkillsManagement />}
            {activeTab === 'models' && <ModelsManagement />}
          </div>
        </div>
      </div>
    </div>
  );
};

// 用户管理
const UsersManagement: React.FC = () => {
  return (
    <div className="management-panel">
      <div className="panel-toolbar">
        <input type="text" placeholder="搜索用户..." className="search-input" />
        <button className="btn-primary">+ 添加用户</button>
      </div>
      <div className="data-table">
        <table>
          <thead>
            <tr>
              <th>用户名</th>
              <th>邮箱</th>
              <th>角色</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>admin</td>
              <td>admin@example.com</td>
              <td><span className="badge admin">管理员</span></td>
              <td><span className="badge active">活跃</span></td>
              <td>
                <button className="btn-sm">编辑</button>
                <button className="btn-sm danger">禁用</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Skill管理
const SkillsManagement: React.FC = () => {
  return (
    <div className="management-panel">
      <div className="panel-toolbar">
        <input type="text" placeholder="搜索Skill..." className="search-input" />
        <button className="btn-primary">+ 添加Skill</button>
      </div>
      <div className="skills-grid">
        <div className="skill-card">
          <div className="skill-icon">📋</div>
          <div className="skill-info">
            <h4>材料预审</h4>
            <p>自动检查申报材料的完整性</p>
          </div>
          <div className="skill-actions">
            <button className="btn-sm">配置</button>
            <button className="btn-sm">禁用</button>
          </div>
        </div>
        <div className="skill-card">
          <div className="skill-icon">🔍</div>
          <div className="skill-info">
            <h4>智能评审</h4>
            <p>基于AI的多维度评审</p>
          </div>
          <div className="skill-actions">
            <button className="btn-sm">配置</button>
            <button className="btn-sm">禁用</button>
          </div>
        </div>
        <div className="skill-card">
          <div className="skill-icon">📊</div>
          <div className="skill-info">
            <h4>报告生成</h4>
            <p>自动生成评审报告</p>
          </div>
          <div className="skill-actions">
            <button className="btn-sm">配置</button>
            <button className="btn-sm">禁用</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 模型管理
const ModelsManagement: React.FC = () => {
  return (
    <div className="management-panel">
      <div className="panel-toolbar">
        <button className="btn-primary">+ 添加模型</button>
      </div>
      <div className="models-list">
        <div className="model-card active">
          <div className="model-header">
            <h4>Qwen2.5-72B</h4>
            <span className="badge active">当前使用</span>
          </div>
          <div className="model-info">
            <div className="info-row">
              <span className="label">提供商:</span>
              <span className="value">阿里云</span>
            </div>
            <div className="info-row">
              <span className="label">API端点:</span>
              <span className="value">https://dashscope.aliyuncs.com</span>
            </div>
            <div className="info-row">
              <span className="label">状态:</span>
              <span className="value success">✓ 正常</span>
            </div>
          </div>
          <div className="model-actions">
            <button className="btn-sm">测试</button>
            <button className="btn-sm">配置</button>
          </div>
        </div>
        <div className="model-card">
          <div className="model-header">
            <h4>DeepSeek-V3</h4>
          </div>
          <div className="model-info">
            <div className="info-row">
              <span className="label">提供商:</span>
              <span className="value">DeepSeek</span>
            </div>
            <div className="info-row">
              <span className="label">API端点:</span>
              <span className="value">https://api.deepseek.com</span>
            </div>
            <div className="info-row">
              <span className="label">状态:</span>
              <span className="value">未测试</span>
            </div>
          </div>
          <div className="model-actions">
            <button className="btn-sm">启用</button>
            <button className="btn-sm">配置</button>
            <button className="btn-sm danger">删除</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
