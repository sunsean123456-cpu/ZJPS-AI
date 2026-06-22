import React, { useState } from 'react';

interface HelpCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpCenterModal: React.FC<HelpCenterModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'faq' | 'contact'>('guide');

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ width: '700px', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
        <h3>帮助中心</h3>
        
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb' }}>
          <button
            onClick={() => setActiveTab('guide')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'guide' ? '#ecfdf5' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'guide' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'guide' ? '#059669' : '#64748b',
              fontWeight: activeTab === 'guide' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            使用指南
          </button>
          <button
            onClick={() => setActiveTab('faq')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'faq' ? '#ecfdf5' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'faq' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'faq' ? '#059669' : '#64748b',
              fontWeight: activeTab === 'faq' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            常见问题
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'contact' ? '#ecfdf5' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'contact' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'contact' ? '#059669' : '#64748b',
              fontWeight: activeTab === 'contact' ? 600 : 400,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            联系我们
          </button>
        </div>

        <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '0 4px' }}>
          {activeTab === 'guide' && (
            <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#1e293b' }}>
              <h4 style={{ color: '#059669', marginTop: 0, marginBottom: '12px' }}>📖 快速开始</h4>
              <ol style={{ paddingLeft: '20px', marginBottom: '20px' }}>
                <li style={{ marginBottom: '12px' }}>
                  <strong>创建项目</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                    点击左侧"新建项目"按钮，输入项目名称和描述即可创建新的绿色建筑技术评价项目。
                  </p>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <strong>上传材料</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                    在项目详情页，点击"上传文件"按钮或直接拖拽文件到上传区域。支持 PDF、Word、Excel 等格式。
                  </p>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <strong>材料预审</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                    点击"材料预审"按钮，系统将自动检查材料的完整性和合规性，并给出修改建议。
                  </p>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <strong>启动评审</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                    材料预审通过后，点击"启动评审"按钮，AI 将从技术先进性、绿色低碳、工程成熟度、经济适用性、材料质量五个维度进行全面评审。
                  </p>
                </li>
                <li style={{ marginBottom: '12px' }}>
                  <strong>查看结果</strong>
                  <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '13px' }}>
                    评审完成后，系统将生成详细的评审报告，包括总分、等级、各维度得分和改进建议。
                  </p>
                </li>
              </ol>

              <h4 style={{ color: '#059669', marginTop: '24px', marginBottom: '12px' }}>🎯 评价标准</h4>
              <p style={{ margin: '0 0 12px 0', color: '#64748b', fontSize: '13px' }}>
                本系统基于《绿色建筑先进适用技术评价标准》进行评审，主要评价维度包括：
              </p>
              <ul style={{ paddingLeft: '20px', margin: 0, color: '#64748b', fontSize: '13px' }}>
                <li style={{ marginBottom: '8px' }}><strong>技术先进性（20%）</strong>：技术创新性、专利数量、行业领先程度</li>
                <li style={{ marginBottom: '8px' }}><strong>绿色低碳（25%）</strong>：节能减排效果、碳足迹分析、环境友好性</li>
                <li style={{ marginBottom: '8px' }}><strong>工程成熟度（20%）</strong>：应用案例数量、工程规模、运行稳定性</li>
                <li style={{ marginBottom: '8px' }}><strong>经济适用性（20%）</strong>：投资回报率、成本效益分析、推广价值</li>
                <li style={{ marginBottom: '8px' }}><strong>材料质量（15%）</strong>：材料性能、耐久性、可回收性</li>
              </ul>
            </div>
          )}

          {activeTab === 'faq' && (
            <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#1e293b' }}>
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#059669', margin: '0 0 8px 0' }}>Q: 支持哪些文件格式？</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                  A: 目前支持 PDF、Word（.doc/.docx）、Excel（.xls/.xlsx）、图片（.jpg/.png）等常见格式。单个文件大小不超过 50MB。
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#059669', margin: '0 0 8px 0' }}>Q: 评审需要多长时间？</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                  A: 根据材料复杂度和数量，通常需要 3-10 分钟。系统会实时显示评审进度，您可以随时查看当前状态。
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#059669', margin: '0 0 8px 0' }}>Q: 评审结果可以修改吗？</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                  A: 评审结果一旦生成即锁定，不可修改。如果对结果有异议，可以补充材料后重新发起评审。
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#059669', margin: '0 0 8px 0' }}>Q: 如何查看历史评审记录？</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                  A: 在左侧边栏点击"历史项目"，可以查看所有已完成评审的项目列表，点击项目可查看详细的评审报告。
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#059669', margin: '0 0 8px 0' }}>Q: 如何导出评审报告？</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                  A: 在项目详情页点击"导出报告"按钮，可以选择导出 PDF 或 Word 格式的完整评审报告。
                </p>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ color: '#059669', margin: '0 0 8px 0' }}>Q: 支持多账号登录吗？</h4>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                  A: 支持。您可以在左侧边栏底部或顶部导航栏的用户头像处管理多个账号，快速切换不同身份。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'contact' && (
            <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#1e293b' }}>
              <div style={{ background: '#ecfdf5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ color: '#059669', margin: '0 0 12px 0' }}>📧 技术支持</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                  <strong>邮箱：</strong>support@greenbuilding-ai.com
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                  <strong>电话：</strong>400-888-8888（工作日 9:00-18:00）
                </p>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  <strong>在线客服：</strong>点击右下角客服图标
                </p>
              </div>

              <div style={{ background: '#f0f9ff', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                <h4 style={{ color: '#0284c7', margin: '0 0 12px 0' }}>💡 功能建议</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                  如果您有任何功能建议或改进意见，欢迎通过以下方式反馈：
                </p>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  <strong>反馈邮箱：</strong>feedback@greenbuilding-ai.com
                </p>
              </div>

              <div style={{ background: '#fef3c7', padding: '20px', borderRadius: '8px' }}>
                <h4 style={{ color: '#d97706', margin: '0 0 12px 0' }}>📚 文档资源</h4>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                  <strong>用户手册：</strong>
                  <a href="#" style={{ color: '#059669', textDecoration: 'none' }}>下载 PDF 版本</a>
                </p>
                <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>
                  <strong>API 文档：</strong>
                  <a href="#" style={{ color: '#059669', textDecoration: 'none' }}>查看在线文档</a>
                </p>
                <p style={{ margin: 0, fontSize: '13px' }}>
                  <strong>视频教程：</strong>
                  <a href="#" style={{ color: '#059669', textDecoration: 'none' }}>观看教学视频</a>
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
};

export default HelpCenterModal;
