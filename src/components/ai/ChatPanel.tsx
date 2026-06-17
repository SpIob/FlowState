// src/components/ai/ChatPanel.tsx
import React, { useEffect, useRef } from 'react';
import { useChat } from '../../hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatPanelProps {
  model: string;
}

export function ChatPanel({ model }: ChatPanelProps) {
  const { messages, sendMessage, isStreaming } = useChat(model);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)]">
      <div className="flex-1 overflow-y-auto scrollbar-thin py-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[var(--text-secondary)] text-[13px]">
            Ask anything about your code.
          </div>
        ) : (
          messages.map((msg, index) => (
            <ChatMessage
              key={index}
              message={msg}
              isStreaming={isStreaming && index === messages.length - 1}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
      <div className="shrink-0">
        <ChatInput onSend={sendMessage} disabled={isStreaming} />
      </div>
    </div>
  );
}