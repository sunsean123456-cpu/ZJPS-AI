import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

interface AccountManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountManagerModal: React.FC<AccountManagerModalProps> = ({ isOpen, onClose }) => {
  const { user, accounts, switchAccount, removeAccount, logout } = useAuthStore();
  const [showLogin, setShowLogin] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSwitch = (userId: number) => {
    switchAccount(userId);
    onClose();
  };

  const handleRemove = (userId: number) => {
    if (confirm('确定要移除该账号吗？')) {
      removeAccount(userId);
    }
  };

  const handleAddAccount = async () => {
    if (!phone || !password) {
      setError('请填写手机号和密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { login } = useAuthStore.getState();
      const result = await login(phone, password);
      
      if (result.success) {
        setShowLogin(false);
        setPhone('');
        setPassword('');
        onClose();
      } else {
        setError(result.error || '登录失败');
      }
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      logout();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ width: '500px', maxWidth: '90vw' }} onClick={(e) => e.stopPropagation()}>
        <h3>账号管理</h3>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>当前账号</span>
          </div>
          {user && (
            <div style={{
              padding: '12px 16px',
              background: '#ecfdf5',
              borderRadius: '8px',
              border: '2px solid #10b981',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: '16px',
                  fontWeight: 600
                }}>
                  {user.name?.[0] || 'U'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{user.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{user.phone}</div>
                </div>
                <div style={{
                  padding: '4px 10px',
                  background: '#10b981',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600
                }}>
                  {user.role === 'admin' ? '管理员' : user.role === 'expert' ? '专家' : '用户'}
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>其他账号</span>
            <button
              onClick={() => setShowLogin(!showLogin)}
              style={{
                padding: '6px 12px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              + 添加账号
            </button>
          </div>

          {showLogin && (
            <div style={{
              padding: '16px',
              background: '#f8fafc',
              borderRadius: '8px',
              marginBottom: '16px'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#64748b' }}>手机号</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#64748b' }}>密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                />
              </div>
              {error && (
                <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleAddAccount}
                  disabled={loading}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: loading ? '#d1d5db' : '#10b981',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {loading ? '登录中...' : '登录并添加'}
                </button>
                <button
                  onClick={() => { setShowLogin(false); setError(''); setPhone(''); setPassword(''); }}
                  style={{
                    padding: '8px 16px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {accounts.filter(acc => acc.user.id !== user?.id).map((acc) => (
              <div
                key={acc.user.id}
                style={{
                  padding: '12px 16px',
                  background: '#fff',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: '#f0fdf4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#059669',
                  fontSize: '14px',
                  fontWeight: 600
                }}>
                  {acc.user.name?.[0] || 'U'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>{acc.user.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{acc.user.phone}</div>
                </div>
                <button
                  onClick={() => handleSwitch(acc.user.id)}
                  style={{
                    padding: '6px 12px',
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #10b981',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginRight: '8px'
                  }}
                >
                  切换
                </button>
                <button
                  onClick={() => handleRemove(acc.user.id)}
                  style={{
                    padding: '6px 10px',
                    background: '#fef2f2',
                    color: '#ef4444',
                    border: '1px solid #ef4444',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  移除
                </button>
              </div>
            ))}
            {accounts.filter(acc => acc.user.id !== user?.id).length === 0 && (
              <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8', fontSize: '13px' }}>
                暂无其他账号，点击"添加账号"登录新账号
              </div>
            )}
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={handleLogout}>退出登录</button>
          <button onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  );
};

export default AccountManagerModal;
