import React, { useState, useRef, useEffect } from 'react';
import { useProjectStore, Project } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import AccountManagerModal from './AccountManagerModal';
import HelpCenterModal from './HelpCenterModal';

interface TopNavBarProps {
  selectedProject: Project | null;
  onBackToBoard?: () => void;
}

const TopNavBar: React.FC<TopNavBarProps> = ({ selectedProject, onBackToBoard }) => {
  const { user, logout } = useAuthStore();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showToast, setShowToast] = useState('');
  const [showAccountManager, setShowAccountManager] = useState(false);
  const [showHelpCenter, setShowHelpCenter] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭下拉
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleWorkbench = () => {
    onBackToBoard?.();
  };

  const handleKnowledge = () => {
    setShowToast('📚 知识库功能即将上线，敬请期待');
    setTimeout(() => setShowToast(''), 3000);
  };

  const handleHelp = () => {
    setShowHelpCenter(true);
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
    }
  };

  return (
    <div className="top-nav-bar">
      {/* Logo 区域 */}
      <div className="nav-left">
        <div className="nav-logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 2L4 7V21L14 26L24 21V7L14 2Z" fill="#10b981" stroke="#059669" strokeWidth="1.5"/>
            <path d="M14 8L8 11V17L14 20L20 17V11L14 8Z" fill="#ecfdf5" stroke="#10b981" strokeWidth="1"/>
            <circle cx="14" cy="14" r="2" fill="#059669"/>
          </svg>
        </div>
        <div className="nav-title">
          <span className="nav-title-text">绿建评价 4.0</span>
          <span className="nav-slogan">绿色 智能 高效</span>
        </div>
      </div>

      {/* 项目选择器 */}
      <div className="nav-center">
        {selectedProject ? (
          <div className="nav-project-selector">
            <span className="nav-project-name">{selectedProject.name}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            {selectedProject.domain && (
              <span className="nav-project-tag">{selectedProject.domain}</span>
            )}
          </div>
        ) : (
          <div className="nav-project-selector">
            <span className="nav-project-name">选择项目</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        )}
      </div>

      {/* 右侧功能入口 */}
      <div className="nav-right">
        <div className="nav-menu-item" onClick={handleWorkbench} title="返回工作台">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          <span>工作台</span>
        </div>
        <div className="nav-menu-item" onClick={handleKnowledge} title="知识库">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span>知识库</span>
        </div>
        <div className="nav-menu-item" onClick={handleHelp} title="帮助中心">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span>帮助中心</span>
        </div>
        
        {/* 通知铃铛 */}
        <div className="nav-notification" ref={notifRef} onClick={() => setShowNotifications(!showNotifications)}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span className="nav-notification-badge">3</span>
          {showNotifications && (
            <div className="nav-dropdown-menu">
              <div className="nav-dropdown-header">通知</div>
              <div className="nav-dropdown-item">
                <span className="nav-dropdown-dot" style={{ background: '#10b981' }}></span>
                <span>项目「测试项目1」评审完成</span>
              </div>
              <div className="nav-dropdown-item">
                <span className="nav-dropdown-dot" style={{ background: '#f59e0b' }}></span>
                <span>材料预审通过，可以启动评审</span>
              </div>
              <div className="nav-dropdown-item">
                <span className="nav-dropdown-dot" style={{ background: '#3b82f6' }}></span>
                <span>系统更新：新增智能审查功能</span>
              </div>
            </div>
          )}
        </div>

        {/* 用户头像 */}
        <div className="nav-avatar" ref={userRef} onClick={() => setShowUserMenu(!showUserMenu)}>
          <span>{user?.name?.[0] || 'A'}</span>
          {showUserMenu && (
            <div className="nav-dropdown-menu nav-user-dropdown">
              <div className="nav-dropdown-header">{user?.name || '系统管理员'}</div>
              <div className="nav-dropdown-item" onClick={() => { setShowUserMenu(false); setShowAccountManager(true); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>账号管理</span>
              </div>
              <div className="nav-dropdown-item" onClick={() => { setShowUserMenu(false); setShowToast('⚙️ 个人设置功能即将上线'); setTimeout(() => setShowToast(''), 3000); }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                <span>个人设置</span>
              </div>
              <div className="nav-dropdown-item danger" onClick={handleLogout}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span>退出登录</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast 提示 */}
      {showToast && (
        <div className="nav-toast">{showToast}</div>
      )}

      {/* 模态框 */}
      <AccountManagerModal isOpen={showAccountManager} onClose={() => setShowAccountManager(false)} />
      <HelpCenterModal isOpen={showHelpCenter} onClose={() => setShowHelpCenter(false)} />
    </div>
  );
};

export default TopNavBar;
