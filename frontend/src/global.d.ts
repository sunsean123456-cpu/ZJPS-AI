/// <reference types="vite/client" />

// Electron API 类型定义
export interface ElectronAPI {
  window: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
  };
  dialog: {
    openFile: (options?: { filters?: Array<{ name: string; extensions: string[] }> }) => Promise<{ canceled: boolean; filePaths: string[] }>;
    openFiles: (options?: { filters?: Array<{ name: string; extensions: string[] }> }) => Promise<{ canceled: boolean; filePaths: string[] }>;
    saveFile: (options?: { defaultPath?: string; filters?: Array<{ name: string; extensions: string[] }> }) => Promise<{ canceled: boolean; filePath?: string }>;
  };
  shell: {
    openExternal: (url: string) => Promise<void>;
  };
  app: {
    getInfo: () => Promise<{ version: string; name: string; platform: string; isPackaged: boolean }>;
  };
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export const isElectron = typeof window !== 'undefined' && !!window.electronAPI?.isElectron;

export const electronAPI = window.electronAPI;
