import React from 'react';

interface AIIconProps {
  size?: number;
  className?: string;
}

const AIIcon: React.FC<AIIconProps> = ({ size = 32, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 柔和渐变 */}
      <defs>
        <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <filter id="aiGlow">
          <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* 主圆形 - 绿色主题 */}
      <circle cx="16" cy="16" r="14" fill="url(#aiGradient)" filter="url(#aiGlow)" />
      
      {/* 建筑图标 */}
      <path 
        d="M10 22V12L16 8L22 12V22H18V17H14V22H10Z" 
        fill="white" 
        strokeWidth="1.5"
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* 装饰光点 */}
      <circle cx="16" cy="16" r="1.5" fill="white" opacity="0.9" />
    </svg>
  );
};

export default AIIcon;
