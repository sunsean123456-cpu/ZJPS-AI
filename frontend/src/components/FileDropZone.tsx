import React, { useState, useRef } from 'react';
import { archiveApi } from '../services/api';

interface FileDropZoneProps {
  projectId: number;
  onUploadComplete?: () => void;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({ projectId, onUploadComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
  };

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    const newFiles: string[] = [];

    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await archiveApi.upload(projectId, formData);
        newFiles.push(res.data.file_name);
      } catch (error: any) {
        console.error(`上传失败: ${file.name}`, error);
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
    setUploading(false);
    onUploadComplete?.();
  };

  return (
    <div className="file-drop-zone">
      <div
        className={`drop-area ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="drop-icon">📁</div>
        <div className="drop-text">
          {uploading ? '上传中...' : '拖拽文件到此处，或点击选择文件'}
        </div>
        <div className="drop-hint">支持 PDF、Word、图片格式</div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="uploaded-list">
          <div className="uploaded-title">已上传文件：</div>
          {uploadedFiles.map((name, i) => (
            <div key={i} className="uploaded-item">
              ✅ {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileDropZone;
