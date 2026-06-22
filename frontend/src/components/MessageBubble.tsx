import React from 'react';
import { Message } from '../stores/chatStore';
import AIIcon from './AIIcon';

interface MessageBubbleProps {
  message: Message;
  onFollowUp?: (question: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onFollowUp }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const formatContent = (content: string) => {
    // 简单的 Markdown 渲染
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  };

  // 生成智能追问建议（基于 AI 回复内容）
  const generateFollowUps = (): string[] => {
    if (isUser || isSystem) return [];
    
    const content = message.content.toLowerCase();
    const suggestions: string[] = [];
    
    if (content.includes('评审') || content.includes('评分')) {
      suggestions.push('如何提升这个维度的得分？');
      suggestions.push('有哪些常见的扣分点？');
    }
    
    if (content.includes('材料') || content.includes('上传')) {
      suggestions.push('必传材料清单是什么？');
      suggestions.push('材料格式有什么要求？');
    }
    
    if (content.includes('得分') || content.includes('分数')) {
      suggestions.push('各维度的权重是多少？');
      suggestions.push('如何达到更高等级？');
    }
    
    if (content.includes('建议') || content.includes('改进')) {
      suggestions.push('有具体的改进案例吗？');
      suggestions.push('改进后能提升多少分？');
    }
    
    // 默认建议
    if (suggestions.length === 0) {
      suggestions.push('能详细解释一下吗？');
      suggestions.push('还有其他需要注意的吗？');
    }
    
    return suggestions.slice(0, 3); // 最多 3 个
  };

  // 使用消息自带的追问建议，没有则基于内容生成
  const followUps = message.followUp && message.followUp.length > 0
    ? message.followUp
    : generateFollowUps();

  if (isSystem) {
    return (
      <div className="message system">
        <div className="message-content system">{message.content}</div>
      </div>
    );
  }

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      {!isUser && <div className="message-avatar"><AIIcon size={28} /></div>}
      <div className={`message-content ${isUser ? 'user' : 'assistant'}`}>
        {message.type === 'evaluation' ? (
          <div className="evaluation-card">
            <div
              className="evaluation-content"
              dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
            />
          </div>
        ) : (
          <div
            className="message-text"
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />
        )}
        <div className="message-time">
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        
        {/* 智能追问按钮 */}
        {!isUser && followUps.length > 0 && onFollowUp && (
          <div className="follow-up-section">
            <div className="follow-up-label">💡 你可以继续问：</div>
            <div className="follow-up-list">
              {followUps.map((q, i) => (
                <button
                  key={i}
                  className="follow-up-btn"
                  onClick={() => onFollowUp(q)}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      {isUser && <div className="message-avatar user">🙂</div>}
    </div>
  );
};

export default MessageBubble;
