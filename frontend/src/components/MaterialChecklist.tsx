import React, { useState, useEffect } from 'react';
import { archiveApi } from '../services/api';

interface MaterialChecklistProps {
  projectId: number;
}

interface MaterialStatus {
  name: string;
  uploaded: boolean;
  required_dir: string;
}

const MaterialChecklist: React.FC<MaterialChecklistProps> = ({ projectId }) => {
  const [materials, setMaterials] = useState<MaterialStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, [projectId]);

  const loadStats = async () => {
    try {
      const res = await archiveApi.getStats(projectId);
      const requiredStatus = res.data.required_status || {};
      const materialList: MaterialStatus[] = Object.entries(requiredStatus).map(([name, status]: [string, any]) => ({
        name,
        uploaded: status.uploaded,
        required_dir: status.required_dir
      }));
      setMaterials(materialList);
    } catch (error) {
      console.error('加载统计失败', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="material-checklist loading">加载中...</div>;
  }

  const uploadedCount = materials.filter(m => m.uploaded).length;
  const totalCount = materials.length;

  return (
    <div className="material-checklist">
      <div className="checklist-header">
        <h4>必传材料清单</h4>
        <div className="checklist-progress">
          {uploadedCount} / {totalCount} 已上传
        </div>
      </div>

      <div className="checklist-items">
        {materials.map((material, index) => (
          <div key={index} className={`checklist-item ${material.uploaded ? 'uploaded' : 'missing'}`}>
            <div className="item-icon">
              {material.uploaded ? '✅' : '❌'}
            </div>
            <div className="item-info">
              <div className="item-name">{material.name}</div>
              <div className="item-dir">{material.required_dir}</div>
            </div>
          </div>
        ))}
      </div>

      {uploadedCount === totalCount && totalCount > 0 && (
        <div className="checklist-complete">
          ✅ 所有必传材料已上传完成
        </div>
      )}
    </div>
  );
};

export default MaterialChecklist;
