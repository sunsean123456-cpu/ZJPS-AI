import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';

const LoginOverlay: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    if (isRegister) {
      result = await register({ name, phone, password, organization });
    } else {
      result = await login(phone, password);
    }

    if (!result.success) {
      setError(result.error || (isRegister ? '注册失败，请检查信息' : '登录失败'));
    }
    setLoading(false);
  };

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-header">
          <div className="login-icon">🏢</div>
          <h1>绿色建筑技术智能评价系统</h1>
          <p>基于 AI 的先进技术评审系统</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {isRegister && (
            <>
              <div className="form-group">
                <label>姓名</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="请输入姓名"
                  required
                />
              </div>
              <div className="form-group">
                <label>单位</label>
                <input
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="请输入单位名称（选填）"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>手机号</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="请输入手机号"
              required
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? '处理中...' : isRegister ? '注册' : '登录'}
          </button>

          <div className="login-footer">
            <a href="#" onClick={(e) => { e.preventDefault(); setIsRegister(!isRegister); }}>
              {isRegister ? '已有账号？去登录' : '没有账号？去注册'}
            </a>
          </div>
        </form>

        <div className="login-info">
          <p>默认管理员账号：13800000000 / admin123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginOverlay;
