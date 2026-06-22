import { create } from 'zustand';
import { projectApi } from '../services/api';

export interface Project {
  id: number;
  name: string;
  domain?: string;
  status: string;
  current_step?: number;
  sandbox_triggered?: boolean;
  archive_path?: string;
  ai_score?: number;
  total_score?: number;
  grade?: string;
  document_count?: number;
  created_at?: string;
  updated_at?: string;
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  loading: boolean;
  loadProjects: () => Promise<void>;
  selectProject: (project: Project) => void;
  addProject: (project: Project) => void;
  updateProject: (id: number, data: Partial<Project>) => void;
  removeProject: (id: number) => void;
  removeProjects: (ids: number[]) => void;
  setProjects: (projects: Project[]) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProject: null,
  loading: false,

  loadProjects: async () => {
    set({ loading: true });
    try {
      const res = await projectApi.list({ page: 1, page_size: 100 });
      set({ projects: res.data.items || [], loading: false });
    } catch (error) {
      console.error('Load projects failed:', error);
      set({ loading: false });
    }
  },

  selectProject: (project) => {
    set({ currentProject: project });
  },

  addProject: (project) => {
    set((state) => ({ projects: [project, ...state.projects] }));
  },

  updateProject: (id, data) => {
    set((state) => ({
      projects: state.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
      currentProject: state.currentProject?.id === id 
        ? { ...state.currentProject, ...data } 
        : state.currentProject,
    }));
  },

  removeProject: (id) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject: state.currentProject?.id === id ? null : state.currentProject,
    }));
  },

  removeProjects: (ids) => {
    set((state) => ({
      projects: state.projects.filter((p) => !ids.includes(p.id)),
      currentProject: state.currentProject && ids.includes(state.currentProject.id) ? null : state.currentProject,
    }));
  },

  setProjects: (projects) => {
    set({ projects });
  },
}));
