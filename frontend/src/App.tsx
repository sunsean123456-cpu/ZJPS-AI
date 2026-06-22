import React, { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useProjectStore, Project } from './stores/projectStore';
import { authApi } from './services/api';
import LoginOverlay from './components/LoginOverlay';
import TopNavBar from './components/TopNavBar';
import LeftPanel from './components/LeftPanel';
import ChatPanel from './components/ChatPanel';
import ProjectBoard from './components/ProjectBoard';
import ToastContainer from './components/ToastContainer';
import { ToastProvider, useToast } from './contexts/ToastContext';
import './styles/app.css';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fee2e2', color: '#991b1b', margin: 20, borderRadius: 8 }}>
          <h3>❌ 组件加载失败</h3>
          <pre style={{ fontSize: 12, whiteSpace: 'pre-wrap' }}>{this.state.error}</pre>
          <button onClick={() => this.setState({ hasError: false, error: '' })}
                  style={{ marginTop: 10, padding: '6px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { isAuthenticated, logout } = useAuthStore();
  const { loadProjects } = useProjectStore();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('darkMode') === 'true';
  });
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [authValid, setAuthValid] = useState<boolean | null>(null);
  const { toasts, removeToast } = useToast();

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    if (!isAuthenticated) {
      setAuthValid(false);
      return;
    }
    authApi.getMe()
      .then(() => setAuthValid(true))
      .catch(() => {
        logout();
        setAuthValid(false);
      });
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && authValid) {
      loadProjects();
    }
  }, [isAuthenticated, authValid]);

  if (!isAuthenticated || authValid === null || authValid === false) {
    return <LoginOverlay />;
  }

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
  };

  const handleBackToBoard = () => {
    setSelectedProject(null);
  };

  return (
    <div className={`app-window ${isDarkMode ? 'dark' : ''}`}>
      <ErrorBoundary>
        <TopNavBar selectedProject={selectedProject} onBackToBoard={handleBackToBoard} />
      </ErrorBoundary>
      <div className="app-body">
        <ErrorBoundary>
          <LeftPanel
            onSelectProject={handleSelectProject}
          />
        </ErrorBoundary>
        <ErrorBoundary>
          {selectedProject ? (
            <ChatPanel project={selectedProject} onBack={handleBackToBoard} />
          ) : (
            <ProjectBoard onSelectProject={handleSelectProject} />
          )}
        </ErrorBoundary>
      </div>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
