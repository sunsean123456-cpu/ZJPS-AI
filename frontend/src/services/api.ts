/**
 * API 服务层 - 连接后端接口
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // FastAPI HTTPBearer 在无 token 或 token 无效时返回 403
    const detail = error.response?.data?.message || error.response?.data?.detail || '';
    const isAuthError = status === 401 || (status === 403 && (
      detail.includes('认证') || detail.includes('禁用') || detail.includes('Not authenticated')
    ));
    if (isAuthError) {
      // 清除认证信息
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 重新加载页面以重置应用状态
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

// ── 类型定义 ──────────────────────────────────────────

export interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: 'admin' | 'expert' | 'user';
  organization?: string;
  status: string;
  avatar_url?: string;
  created_at?: string;
}

export interface LoginRequest {
  phone: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  phone: string;
  email?: string;
  password: string;
  organization?: string;
  qualification?: string;
}

export interface Project {
  id: number;
  enterprise_id: number;
  name: string;
  domain?: string;
  description?: string;
  status: string;
  ai_score?: number;
  total_score?: number;
  grade?: string;
  sandbox_triggered: boolean;
  current_step: number;
  pre_check_score?: number;
  quality_score?: number;
  documents?: Document[];
  created_at?: string;
  updated_at?: string;
  submitted_at?: string;
  completed_at?: string;
}

export interface Document {
  id: number;
  project_id: number;
  file_name: string;
  file_type?: string;
  file_size?: number;
  file_url: string;
  doc_type?: string;
  is_required: boolean;
  status: string;
  parsed_text?: string;
  ocr_quality?: number;
  extracted_data?: Record<string, any>;
  created_at?: string;
}

export interface PreCheckIssue {
  doc_type: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

export interface PreCheckResult {
  id: number;
  project_id: number;
  completeness_score: number;
  quality_score: number;
  issues: PreCheckIssue[];
  summary: string;
}

export interface ScoreDimension {
  indicator_id: string;
  name: string;
  score: number;
  max_score: number;
  weight: number;
  confidence: number;
  evidence: string;
  reasoning: string;
  children?: ScoreDimension[];
}

export interface EvaluationResult {
  project_id: number;
  total_score: number;
  grade: string;
  dimensions: ScoreDimension[];
  summary: string;
  suggestions: string[];
  sandbox_recommended: boolean;
}

export interface Notification {
  id: number;
  title: string;
  content?: string;
  notification_type?: string;
  is_read: boolean;
  related_project_id?: number;
  created_at?: string;
}

// ── 认证 API ──────────────────────────────────────────

export const authApi = {
  login: (data: LoginRequest) => 
    api.post<{ access_token: string; user: User }>('/api/auth/login', data),
  
  register: (data: RegisterRequest) => 
    api.post<{ access_token: string; user: User }>('/api/auth/register', data),
  
  getMe: () => 
    api.get<User>('/api/auth/me'),
  
  updateMe: (data: Partial<User>) => 
    api.put<User>('/api/auth/me', data),
  
  initAdmin: () => 
    api.post('/api/auth/init-admin'),
};

// ── 项目 API ──────────────────────────────────────────

export const projectApi = {
  list: (params?: { page?: number; page_size?: number; status?: string }) => 
    api.get<{ items: Project[]; total: number }>('/api/projects', { params }),
  
  get: (id: number) => 
    api.get<Project>(`/api/projects/${id}`),
  
  create: (data: { name: string; domain?: string; description?: string }) => 
    api.post<Project>('/api/projects', data),
  
  update: (id: number, data: Partial<Project>) => 
    api.put<Project>(`/api/projects/${id}`, data),
  
  submit: (id: number) => 
    api.post(`/api/projects/${id}/submit`),
  
  delete: (id: number) => 
    api.delete(`/api/projects/${id}`),
  
  archive: (id: number) => 
    api.post(`/api/projects/${id}/archive`),
  
  getKanban: () => 
    api.get('/api/projects/board/kanban'),
};

// ── 文档 API ──────────────────────────────────────────

export const documentApi = {
  list: (projectId: number) => 
    api.get<Document[]>(`/api/projects/${projectId}/documents`),
  
  upload: (projectId: number, file: File, docType: string, isRequired: boolean) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('is_required', String(isRequired));
    return api.post(`/api/projects/${projectId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  delete: (projectId: number, docId: number) => 
    api.delete(`/api/projects/${projectId}/documents/${docId}`),
  
  parse: (docId: number) => 
    api.post(`/api/evaluation/parse-document/${docId}`),
};

// ── 档案管理 API ──────────────────────────────────────

export const archiveApi = {
  init: (projectId: number) =>
    api.post(`/api/archive/init/${projectId}`),

  upload: (projectId: number, formData: FormData) =>
    api.post(`/api/archive/upload/${projectId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  importLocal: (projectId: number, localPath: string) =>
    api.post(`/api/archive/import-local/${projectId}`, null, {
      params: { local_path: localPath },
    }),

  listFiles: (projectId: number) =>
    api.get(`/api/archive/files/${projectId}`),

  getStats: (projectId: number) =>
    api.get(`/api/archive/stats/${projectId}`),

  preCheck: (projectId: number) =>
    api.post(`/api/archive/pre-check/${projectId}`),

  getVersions: (documentId: number) =>
    api.get(`/api/archive/versions/${documentId}`),

  rollback: (documentId: number, version: number) =>
    api.post(`/api/archive/rollback/${documentId}/${version}`),

  deleteFile: (documentId: number) =>
    api.delete(`/api/archive/file/${documentId}`),

  intelligentReview: (projectId: number) =>
    api.post(`/api/archive/intelligent-review/${projectId}`),
};

// ── 评审 API ──────────────────────────────────────────

export const evaluationApi = {
  start: (projectId: number) => 
    api.post('/api/evaluation/start', { project_id: projectId }),
  
  getResult: (projectId: number) => 
    api.get<EvaluationResult>(`/api/evaluation/result/${projectId}`),
  
  getScores: (projectId: number) => 
    api.get(`/api/evaluation/scores/${projectId}`),
  
  preCheck: (projectId: number) => 
    api.post<PreCheckResult>(`/api/evaluation/pre-check/${projectId}`),
};

// ── 沙箱 API ──────────────────────────────────────────

export const sandboxApi = {
  start: (projectId: number, plan: {
    objective: string;
    parameters: Record<string, any>;
    methodology: string;
    expected_outcome: string;
  }) => 
    api.post('/api/sandbox/start', { project_id: projectId, plan }),
  
  getResult: (projectId: number) => 
    api.get(`/api/sandbox/result/${projectId}`),
  
  getHistory: (projectId: number) => 
    api.get(`/api/sandbox/history/${projectId}`),
};

// ── 系统 API ──────────────────────────────────────────

export const systemApi = {
  // 用户管理
  listUsers: (params?: { page?: number; page_size?: number; role?: string; status?: string }) => 
    api.get('/api/system/users', { params }),
  
  updateUser: (userId: number, data: Partial<User>) => 
    api.put(`/api/system/users/${userId}`, data),
  
  toggleUserStatus: (userId: number) => 
    api.post(`/api/system/users/${userId}/toggle-status`),
  
  // 审计日志
  getAuditLogs: (params?: { page?: number; page_size?: number; module?: string; action?: string }) => 
    api.get('/api/system/audit-logs', { params }),
  
  getAuditStats: (days?: number) => 
    api.get('/api/system/audit-logs/stats', { params: { days } }),
  
  // 通知
  getNotifications: (unreadOnly?: boolean) => 
    api.get<Notification[]>('/api/system/notifications', { params: { unread_only: unreadOnly } }),
  
  markNotificationRead: (id: number) => 
    api.post(`/api/system/notifications/${id}/read`),
  
  markAllNotificationsRead: () => 
    api.post('/api/system/notifications/read-all'),
  
  // 指标体系
  getIndicators: () => 
    api.get('/api/system/indicators'),
  
  getIndicatorsTree: () => 
    api.get('/api/system/indicators/tree'),
  
  // 系统统计
  getStats: () => 
    api.get('/api/system/stats'),
};

// ── 评价标准 API ──────────────────────────────────────

export const standardsApi = {
  list: () =>
    api.get('/api/standards'),

  getActive: (countryCode: string = 'CN') =>
    api.get('/api/standards/active', { params: { country_code: countryCode } }),

  upload: (formData: FormData) =>
    api.post('/api/standards/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  switch: (countryCode: string) =>
    api.post('/api/standards/switch', null, {
      params: { country_code: countryCode },
    }),
};

export default api;
