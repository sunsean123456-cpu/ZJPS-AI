import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '../services/api';

interface User {
  id: number;
  name: string;
  phone: string;
  email?: string;
  role: 'admin' | 'expert' | 'user';
  organization?: string;
  status: string;
}

interface AuthResult {
  success: boolean;
  error?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  accounts: Array<{ user: User; token: string }>;
  login: (phone: string, password: string) => Promise<AuthResult>;
  register: (data: { name: string; phone: string; password: string; organization?: string }) => Promise<AuthResult>;
  logout: () => void;
  switchAccount: (userId: number) => void;
  removeAccount: (userId: number) => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      accounts: [],

      login: async (phone: string, password: string) => {
        try {
          const res = await authApi.login({ phone, password });
          const { user, access_token } = res.data;
          localStorage.setItem('token', access_token);
          localStorage.setItem('user', JSON.stringify(user));
          
          // 添加到账号列表（如果不存在）
          const { accounts } = get();
          const existingIndex = accounts.findIndex(acc => acc.user.id === user.id);
          if (existingIndex === -1) {
            const newAccounts = [...accounts, { user, token: access_token }];
            set({ user, token: access_token, isAuthenticated: true, accounts: newAccounts });
          } else {
            set({ user, token: access_token, isAuthenticated: true });
          }
          return { success: true };
        } catch (error: any) {
          console.error('Login failed:', error);
          const msg = error?.response?.data?.detail || error?.message || '登录失败';
          return { success: false, error: msg };
        }
      },

      register: async (data) => {
        try {
          const res = await authApi.register(data);
          const { user, access_token } = res.data;
          localStorage.setItem('token', access_token);
          localStorage.setItem('user', JSON.stringify(user));
          
          // 添加到账号列表
          const { accounts } = get();
          const newAccounts = [...accounts, { user, token: access_token }];
          set({ user, token: access_token, isAuthenticated: true, accounts: newAccounts });
          return { success: true };
        } catch (error: any) {
          console.error('Register failed:', error);
          const detail = error?.response?.data?.detail;
          let msg = '注册失败';
          if (Array.isArray(detail)) {
            msg = detail.map((d: any) => d.msg || d.message).join('; ');
          } else if (typeof detail === 'string') {
            msg = detail;
          } else if (error?.message) {
            msg = error.message;
          }
          return { success: false, error: msg };
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
      },

      switchAccount: (userId: number) => {
        const { accounts } = get();
        const account = accounts.find(acc => acc.user.id === userId);
        if (account) {
          localStorage.setItem('token', account.token);
          localStorage.setItem('user', JSON.stringify(account.user));
          set({ user: account.user, token: account.token, isAuthenticated: true });
        }
      },

      removeAccount: (userId: number) => {
        const { accounts, user } = get();
        const newAccounts = accounts.filter(acc => acc.user.id !== userId);
        set({ accounts: newAccounts });
        
        // 如果删除的是当前账号，切换到第一个账号或登出
        if (user?.id === userId) {
          if (newAccounts.length > 0) {
            const firstAccount = newAccounts[0];
            localStorage.setItem('token', firstAccount.token);
            localStorage.setItem('user', JSON.stringify(firstAccount.user));
            set({ user: firstAccount.user, token: firstAccount.token, isAuthenticated: true });
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            set({ user: null, token: null, isAuthenticated: false });
          }
        }
      },

      loadFromStorage: () => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            set({ user, token, isAuthenticated: true });
          } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
