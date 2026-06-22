/**
 * Zustand Store - 全局状态管理
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Project, Notification, EvaluationResult, ScoreDimension } from '../services/api';

// ── 认证状态 ──────────────────────────────────────────

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      
      setAuth: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: true 
      }),
      
      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false 
        });
      },
      
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      })),
    }),
    {
      name: 'auth-storage',
    }
  )
);

// ── 项目状态 ──────────────────────────────────────────

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  addProject: (project: Project) => void;
  updateProject: (id: number, data: Partial<Project>) => void;
  removeProject: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  loading: false,
  error: null,
  
  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),
  addProject: (project) => set((state) => ({ 
    projects: [project, ...state.projects] 
  })),
  updateProject: (id, data) => set((state) => ({
    projects: state.projects.map((p) => 
      p.id === id ? { ...p, ...data } : p
    ),
    currentProject: state.currentProject?.id === id 
      ? { ...state.currentProject, ...data } 
      : state.currentProject
  })),
  removeProject: (id) => set((state) => ({
    projects: state.projects.filter((p) => p.id !== id),
    currentProject: state.currentProject?.id === id ? null : state.currentProject
  })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// ── 评审状态 ──────────────────────────────────────────

interface EvaluationState {
  evaluationResult: EvaluationResult | null;
  isEvaluating: boolean;
  preCheckResult: {
    completeness_score: number;
    quality_score: number;
    issues: any[];
    summary: string;
  } | null;
  
  // Actions
  setEvaluationResult: (result: EvaluationResult | null) => void;
  setIsEvaluating: (evaluating: boolean) => void;
  setPreCheckResult: (result: any) => void;
  reset: () => void;
}

export const useEvaluationStore = create<EvaluationState>((set) => ({
  evaluationResult: null,
  isEvaluating: false,
  preCheckResult: null,
  
  setEvaluationResult: (result) => set({ evaluationResult: result }),
  setIsEvaluating: (evaluating) => set({ isEvaluating: evaluating }),
  setPreCheckResult: (result) => set({ preCheckResult: result }),
  reset: () => set({ 
    evaluationResult: null, 
    isEvaluating: false, 
    preCheckResult: null 
  }),
}));

// ── 通知状态 ──────────────────────────────────────────

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  
  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  updateUnreadCount: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    set({ notifications, unreadCount });
  },
  
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + (notification.is_read ? 0 : 1)
  })),
  
  markAsRead: (id) => set((state) => ({
    notifications: state.notifications.map((n) => 
      n.id === id ? { ...n, is_read: true } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1)
  })),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
    unreadCount: 0
  })),
  
  updateUnreadCount: () => set((state) => ({
    unreadCount: state.notifications.filter((n) => !n.is_read).length
  })),
}));

// ── UI 状态 ──────────────────────────────────────────

interface UIState {
  sidebarCollapsed: boolean;
  aiAssistantVisible: boolean;
  theme: 'light' | 'dark';
  
  // Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleAIAssistant: () => void;
  setAIAssistantVisible: (visible: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      aiAssistantVisible: false,
      theme: 'light',
      
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleAIAssistant: () => set((state) => ({ 
        aiAssistantVisible: !state.aiAssistantVisible 
      })),
      setAIAssistantVisible: (visible) => set({ aiAssistantVisible: visible }),
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'ui-storage',
    }
  )
);

// ── 看板状态 ──────────────────────────────────────────

interface KanbanState {
  columns: Record<string, Project[]>;
  loading: boolean;
  
  // Actions
  setColumns: (columns: Record<string, Project[]>) => void;
  moveProject: (projectId: number, fromColumn: string, toColumn: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useKanbanStore = create<KanbanState>((set) => ({
  columns: {
    draft: [],
    submitted: [],
    pre_check: [],
    reviewing: [],
    completed: [],
    needs_supplement: [],
  },
  loading: false,
  
  setColumns: (columns) => set({ columns }),
  moveProject: (projectId, fromColumn, toColumn) => set((state) => {
    const fromProjects = state.columns[fromColumn] || [];
    const toProjects = state.columns[toColumn] || [];
    const project = fromProjects.find((p) => p.id === projectId);
    
    if (!project) return state;
    
    return {
      columns: {
        ...state.columns,
        [fromColumn]: fromProjects.filter((p) => p.id !== projectId),
        [toColumn]: [...toProjects, project],
      }
    };
  }),
  setLoading: (loading) => set({ loading }),
}));
