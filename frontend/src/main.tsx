import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 调试信息
console.log('🚀 main.tsx 开始执行');

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('❌ 找不到 #root 元素');
  document.body.innerHTML = '<div style="color: red; padding: 20px;">错误：找不到 #root 元素</div>';
  throw new Error('Root element not found');
}

console.log('✅ 找到 #root 元素:', rootElement);

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 拒绝:', event.reason);
});

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('✅ React root 创建成功');
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  
  console.log('✅ React 应用已挂载');
} catch (error) {
  console.error('❌ React 挂载失败:', error);
  rootElement.innerHTML = `
    <div style="color: red; padding: 20px; font-family: monospace;">
      <h2>React 挂载失败</h2>
      <pre>${error instanceof Error ? error.stack : String(error)}</pre>
    </div>
  `;
}
