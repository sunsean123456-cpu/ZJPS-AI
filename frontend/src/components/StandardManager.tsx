import React, { useState, useEffect } from 'react';
import { standardsApi } from '../services/api';

interface StandardManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onStandardChange?: (countryCode: string) => void;
}

interface Standard {
  id: number;
  country_code: string;
  country_name: string;
  standard_name: string;
  standard_version?: string;
  has_file: boolean;
  created_at?: string;
}

const StandardManager: React.FC<StandardManagerProps> = ({ 
  isOpen, 
  onClose,
  onStandardChange 
}) => {
  const [standards, setStandards] = useState<Standard[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('CN');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    country_code: '',
    country_name: '',
    standard_name: '',
    standard_version: '',
    file: null as File | null
  });

  useEffect(() => {
    if (isOpen) {
      loadStandards();
    }
  }, [isOpen]);

  const loadStandards = async () => {
    setLoading(true);
    try {
      const res = await standardsApi.list();
      setStandards(res.data.data || []);
    } catch (error) {
      console.error('加载评价标准失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.file || !uploadForm.country_code || !uploadForm.standard_name) {
      alert('请填写完整信息');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('country_code', uploadForm.country_code);
      formData.append('country_name', uploadForm.country_name || uploadForm.country_code);
      formData.append('standard_name', uploadForm.standard_name);
      if (uploadForm.standard_version) {
        formData.append('standard_version', uploadForm.standard_version);
      }

      await standardsApi.upload(formData);
      alert('评价标准上传成功');
      setShowUploadForm(false);
      setUploadForm({
        country_code: '',
        country_name: '',
        standard_name: '',
        standard_version: '',
        file: null
      });
      loadStandards();
    } catch (error: any) {
      console.error('上传失败:', error);
      alert('上传失败: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  const handleSwitch = async (countryCode: string) => {
    try {
      await standardsApi.switch(countryCode);
      setSelectedCountry(countryCode);
      onStandardChange?.(countryCode);
      alert('已切换评价标准');
    } catch (error: any) {
      console.error('切换失败:', error);
      alert('切换失败: ' + (error.response?.data?.message || error.message));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <h3>评价标准管理</h3>
        
        <div style={{ marginBottom: 16 }}>
          <button 
            className="quick-btn" 
            onClick={() => setShowUploadForm(!showUploadForm)}
            style={{ marginBottom: 12 }}
          >
            {showUploadForm ? '取消上传' : '+ 上传新标准'}
          </button>
        </div>

        {showUploadForm && (
          <div style={{ 
            padding: 16, 
            background: '#f8fafc', 
            borderRadius: 8, 
            marginBottom: 16,
            border: '1px solid #e2e8f0'
          }}>
            <div className="form-group">
              <label>国家代码 *</label>
              <input
                type="text"
                value={uploadForm.country_code}
                onChange={(e) => setUploadForm({ ...uploadForm, country_code: e.target.value.toUpperCase() })}
                placeholder="如：CN、US、EU"
                maxLength={10}
              />
            </div>
            <div className="form-group">
              <label>国家名称</label>
              <input
                type="text"
                value={uploadForm.country_name}
                onChange={(e) => setUploadForm({ ...uploadForm, country_name: e.target.value })}
                placeholder="如：中国、美国、欧盟"
              />
            </div>
            <div className="form-group">
              <label>标准名称 *</label>
              <input
                type="text"
                value={uploadForm.standard_name}
                onChange={(e) => setUploadForm({ ...uploadForm, standard_name: e.target.value })}
                placeholder="如：绿色建筑评价标准"
              />
            </div>
            <div className="form-group">
              <label>标准版本</label>
              <input
                type="text"
                value={uploadForm.standard_version}
                onChange={(e) => setUploadForm({ ...uploadForm, standard_version: e.target.value })}
                placeholder="如：2026版"
              />
            </div>
            <div className="form-group">
              <label>标准文件 *</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setUploadForm({ 
                  ...uploadForm, 
                  file: e.target.files?.[0] || null 
                })}
              />
            </div>
            <button 
              className="quick-btn primary" 
              onClick={handleUpload}
              disabled={uploading}
              style={{ marginTop: 8 }}
            >
              {uploading ? '上传中...' : '确认上传'}
            </button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}>加载中...</div>
        ) : standards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8' }}>
            暂无评价标准，请先上传
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {standards.map((standard) => (
              <div
                key={standard.id}
                style={{
                  padding: 12,
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: selectedCountry === standard.country_code ? '#eff6ff' : 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => handleSwitch(standard.country_code)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {standard.country_name} ({standard.country_code})
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      {standard.standard_name}
                      {standard.standard_version && ` - ${standard.standard_version}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {standard.has_file ? (
                      <span style={{ fontSize: 12, color: '#10b981' }}>✓ 已上传</span>
                    ) : (
                      <span style={{ fontSize: 12, color: '#f59e0b' }}>⚠ 未上传</span>
                    )}
                    {selectedCountry === standard.country_code && (
                      <span style={{ 
                        fontSize: 11, 
                        background: '#3b82f6', 
                        color: 'white', 
                        padding: '2px 8px',
                        borderRadius: 4
                      }}>
                        当前使用
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
};

export default StandardManager;
