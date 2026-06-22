import React from 'react';

interface TitleBarProps {
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const TitleBar: React.FC<TitleBarProps> = ({
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <div className="title-bar">
      <div className="title-left">
        <div className="app-title">
          <span className="app-name">绿色建筑技术智能评价系统</span>
        </div>
      </div>
      <div className="title-right">
        <button className="title-btn" onClick={onToggleDarkMode}>
          {isDarkMode ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
