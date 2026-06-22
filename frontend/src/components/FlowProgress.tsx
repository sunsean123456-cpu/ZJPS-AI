import React, { useState, useEffect, useRef } from 'react';

interface FlowProgressProps {
  currentStep: number; // 0-5
  onStepClick?: (step: number) => void;
  projectId?: number; // 用于流式评审
}

interface StepState {
  id: number;
  name: string;
  icon: string;
  status: 'pending' | 'running' | 'completed';
  progress: number;
  estimatedTime: number;
  message?: string;
}

const STEPS = [
  { id: 0, label: '创建', icon: '📝' },
  { id: 1, label: '上传', icon: '📤' },
  { id: 2, label: '预检', icon: '🔍' },
  { id: 3, label: '评审', icon: '⚙️' },
  { id: 4, label: '结果', icon: '✅' },
];

const FlowProgress: React.FC<FlowProgressProps> = ({ currentStep, onStepClick, projectId }) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [totalSteps, setTotalSteps] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [finalResult, setFinalResult] = useState<{ score: number; grade: string } | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // 监听启动流式评审事件
    const handleStartEvent = (e: CustomEvent) => {
      if (e.detail.projectId) {
        startStreamEvaluation(e.detail.projectId);
      }
    };
    
    window.addEventListener('startStreamEvaluation', handleStartEvent as EventListener);
    
    return () => {
      eventSourceRef.current?.close();
      window.removeEventListener('startStreamEvaluation', handleStartEvent as EventListener);
    };
  }, []);

  // 启动流式评审
  const startStreamEvaluation = (projectId: number) => {
    if (!projectId) return;
    
    setIsStreaming(true);
    setFinalResult(null);
    
    const token = localStorage.getItem('token');
    const url = `http://localhost:8000/api/evaluation/stream/${projectId}?token=${token}`;
    
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'start':
          setTotalSteps(data.total_steps);
          setSteps([]);
          break;
          
        case 'step_start':
          setSteps(prev => [...prev, {
            id: data.step,
            name: data.name,
            icon: data.icon,
            status: 'running',
            progress: 0,
            estimatedTime: data.estimated_time,
          }]);
          setCurrentStepIndex(data.step);
          break;
          
        case 'step_progress':
          setSteps(prev => prev.map(s => 
            s.id === data.step ? { ...s, progress: data.progress } : s
          ));
          break;
          
        case 'step_complete':
          setSteps(prev => prev.map(s => 
            s.id === data.step ? { ...s, status: 'completed', progress: 100, message: data.message } : s
          ));
          break;
          
        case 'complete':
          setFinalResult({ score: data.total_score, grade: data.grade });
          setIsStreaming(false);
          eventSource.close();
          break;
      }
    };
    
    eventSource.onerror = () => {
      console.error('SSE error');
      setIsStreaming(false);
      eventSource.close();
    };
  };

  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  // 流式评审模式
  if (isStreaming || steps.length > 0) {
    return (
      <div className="flow-progress streaming">
        <div className="streaming-header">
          <div className="streaming-title">
            {isStreaming ? '🔄 AI 评审进行中...' : '✅ 评审完成'}
          </div>
          {finalResult && (
            <div className="streaming-result">
              总分：<span className="result-score">{finalResult.score}</span>
              等级：<span className="result-grade">{finalResult.grade}</span>
            </div>
          )}
        </div>
        
        <div className="streaming-steps">
          {steps.map((step, index) => (
            <div key={step.id} className={`streaming-step ${step.status}`}>
              <div className="step-header">
                <span className="step-icon">{step.icon}</span>
                <span className="step-name">{step.name}</span>
                {step.status === 'running' && (
                  <span className="step-time">预计 {step.estimatedTime}s</span>
                )}
                {step.status === 'completed' && (
                  <span className="step-check">✓</span>
                )}
              </div>
              {step.status === 'running' && (
                <div className="step-progress-bar">
                  <div 
                    className="step-progress-fill" 
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              )}
              {step.message && (
                <div className="step-message">{step.message}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 普通模式（静态进度条）
  return (
    <div className="flow-progress">
      {STEPS.map((step, index) => {
        const isCompleted = step.id < currentStep;
        const isCurrent = step.id === currentStep;
        const isClickable = onStepClick && step.id <= currentStep;
        
        return (
          <React.Fragment key={step.id}>
            <div
              className={`flow-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isClickable ? 'clickable' : ''}`}
              onClick={() => isClickable && onStepClick(step.id)}
            >
              <div className="step-icon">
                {isCompleted ? '✓' : step.icon}
              </div>
              <div className="step-label">{step.label}</div>
            </div>
            {index < STEPS.length - 1 && (
              <div className={`flow-connector ${isCompleted ? 'completed' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default FlowProgress;
