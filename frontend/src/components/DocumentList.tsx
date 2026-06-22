import React, { useEffect, useState } from 'react';
import { archiveApi } from '../services/api';
import Skeleton from './Skeleton';

interface DocumentListProps {
  projectId: number;
  onRefresh?: () => void;
}

interface Document {
  id: number;
  file_name: string;
  file_size: number;
  doc_type: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

const getFileFormat = (fileName: string): { icon: string; label: string; color: string } => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (ext === 'pdf') return { icon: '📄', label: 'PDF', color: '#dc2626' };
  if (['doc', 'docx'].includes(ext)) return { icon: '📝', label: 'Word', color: '#2563eb' };
  if (['xls', 'xlsx'].includes(ext)) return { icon: '📊', label: 'Excel', color: '#16a34a' };
  if (['ppt', 'pptx'].includes(ext)) return { icon: '📽️', label: 'PPT', color: '#ea580c' };
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    if (fileName.toLowerCase().includes('scan') || fileName.toLowerCase().includes('扫描')) {
      return { icon: '📋', label: '扫描件', color: '#7c3aed' };
    }
    return { icon: '🖼️', label: '图片', color: '#0891b2' };
  }
  if (['zip', 'rar', '7z'].includes(ext)) return { icon: '🗜️', label: '压缩包', color: '#ca8a04' };
  return { icon: '📎', label: ext.toUpperCase() || '文件', color: '#64748b' };
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const DocumentList: React.FC<DocumentListProps> = ({ projectId, onRefresh }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  useEffect(() => {
    loadDocuments();
  }, [projectId]);

  useEffect(() => {
    const handleClick = () => setMenuOpenId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await archiveApi.listFiles(projectId);
      setDocuments(res.data);
    } catch (error) {
      console.error('加载文档列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 显示骨架屏加载状态（必须在所有 hooks 之后）
  if (loading) {
    return (
      <div className="doc-list-container">
        <div className="doc-list-header">
          <span className="doc-list-title">加载中...</span>
        </div>
        <div className="doc-list-body">
          <Skeleton type="list" count={3} />
        </div>
      </div>
    );
  }

  const handleDelete = async (doc: Document) => {
    setMenuOpenId(null);
    if (!confirm(`确定要删除文件「${doc.file_name}」吗？`)) return;
    try {
      await archiveApi.deleteFile(doc.id);
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
      onRefresh?.();
    } catch (error: any) {
      alert('删除失败：' + error.message);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个文件吗？`)) return;
    
    try {
      for (const id of selectedIds) {
        await archiveApi.deleteFile(id);
      }
      setDocuments(prev => prev.filter(d => !selectedIds.has(d.id)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
      onRefresh?.();
    } catch (error: any) {
      alert('批量删除失败：' + error.message);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map(d => d.id)));
    }
  };

  if (loading) {
    return <div className="doc-list-loading">加载中...</div>;
  }

  return (
    <div className="doc-list-container">
      <div className="doc-list-header">
        <span className="doc-list-title">已上传文档 ({documents.length})</span>
        <div className="doc-list-actions">
          {isSelectMode ? (
            <>
              <button className="doc-action-btn" onClick={() => { setIsSelectMode(false); setSelectedIds(new Set()); }}>
                取消
              </button>
              {selectedIds.size > 0 && (
                <button className="doc-action-btn danger" onClick={handleBatchDelete}>
                  删除 ({selectedIds.size})
                </button>
              )}
            </>
          ) : (
            <>
              <button className="doc-action-btn" onClick={() => setIsSelectMode(true)}>
                选择
              </button>
              <button className="doc-action-btn" onClick={loadDocuments}>🔄</button>
            </>
          )}
        </div>
      </div>

      {isSelectMode && (
        <div className="doc-select-bar">
          <label className="doc-checkbox">
            <input
              type="checkbox"
              checked={selectedIds.size === documents.length && documents.length > 0}
              onChange={toggleSelectAll}
            />
            <span>全选</span>
          </label>
        </div>
      )}

      <div className="doc-list-body">
        {documents.length === 0 ? (
          <div className="doc-list-empty">
            <div className="empty-icon">📁</div>
            <p>暂无文档</p>
            <p className="hint">拖拽文件到对话框或点击上传</p>
          </div>
        ) : (
          documents.map((doc) => {
            const format = getFileFormat(doc.file_name);
            const isSelected = selectedIds.has(doc.id);
            return (
              <div 
                key={doc.id} 
                className={`doc-item ${isSelected ? 'selected' : ''}`}
                onClick={() => isSelectMode && toggleSelect(doc.id)}
              >
                {isSelectMode && (
                  <div className="doc-checkbox-wrap">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(doc.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                )}
                <div className="doc-format-tag" style={{ color: format.color }}>
                  <span className="doc-format-icon">{format.icon}</span>
                  <span className="doc-format-label">{format.label}</span>
                </div>
                <div className="doc-info">
                  <div className="doc-name" title={doc.file_name}>{doc.file_name}</div>
                  <div className="doc-meta">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span className="doc-dot">·</span>
                    <span>{new Date(doc.created_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
                {!isSelectMode && (
                  <div className="doc-actions">
                    <button
                      className="doc-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === doc.id ? null : doc.id);
                      }}
                    >
                      ⋯
                    </button>
                    {menuOpenId === doc.id && (
                      <div className="doc-dropdown-menu">
                        <div className="dropdown-item" onClick={() => setMenuOpenId(null)}>预览</div>
                        <div className="dropdown-item" onClick={() => setMenuOpenId(null)}>下载</div>
                        <div className="dropdown-item danger" onClick={() => handleDelete(doc)}>删除</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DocumentList;
