import React from 'react';

interface SkeletonProps {
  type?: 'text' | 'card' | 'avatar' | 'list';
  count?: number;
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ type = 'text', count = 1, className = '' }) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'avatar':
        return (
          <div className={`skeleton skeleton-avatar ${className}`}>
            <div className="skeleton-circle" />
            <div className="skeleton-lines">
              <div className="skeleton-line" style={{ width: '60%' }} />
              <div className="skeleton-line short" style={{ width: '40%' }} />
            </div>
          </div>
        );
      case 'card':
        return (
          <div className={`skeleton skeleton-card ${className}`}>
            <div className="skeleton-line" style={{ width: '70%', height: '20px' }} />
            <div className="skeleton-line" style={{ width: '100%' }} />
            <div className="skeleton-line" style={{ width: '90%' }} />
            <div className="skeleton-line short" style={{ width: '40%' }} />
          </div>
        );
      case 'list':
        return Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`skeleton skeleton-list-item ${className}`}>
            <div className="skeleton-circle small" />
            <div className="skeleton-lines">
              <div className="skeleton-line" style={{ width: '80%' }} />
              <div className="skeleton-line short" style={{ width: '50%' }} />
            </div>
          </div>
        ));
      default:
        return Array.from({ length: count }).map((_, i) => (
          <div key={i} className={`skeleton skeleton-text ${className}`}>
            <div className="skeleton-line" />
          </div>
        ));
    }
  };

  return <>{renderSkeleton()}</>;
};

export default Skeleton;
