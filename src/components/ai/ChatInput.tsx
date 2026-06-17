// src/components/ai/ChatInput.tsx
import React, { useState, useRef } from 'react';

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    const trimmed = content.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const isActive = content.trim().length > 0 && !disabled;

  return (
    <div className="flex flex-row items-end gap-2 px-3 py-2 bg-[var(--bg-titlebar)] border-t border-[var(--border)]">
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Ask about your code…"
        className="flex-1 bg-transparent border-none outline-none resize-none text-[var(--text-primary)] text-[13px] leading-normal placeholder:text-[var(--text-secondary)] min-h-[20px] max-h-[100px] overflow-y-auto"
        style={{ height: 'auto' }}
      />
      <button
        onClick={handleSend}
        disabled={!isActive}
        className={`w-7 h-7 rounded-md flex-shrink-0 flex items-center justify-center ${
          isActive ? 'bg-[var(--accent)] cursor-pointer' : 'bg-[#1e1e1e] cursor-default'
        }`}
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
          <path
            d="M8 13V3M3 8l5-5 5 5"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isActive ? 'stroke-[#0d0d0d]' : 'stroke-[#6e7681]'}
          />
        </svg>
      </button>
    </div>
  );
}