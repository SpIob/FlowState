// src/hooks/useChat.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { chatStream } from '../lib/tauri';
import { listen } from '@tauri-apps/api/event';
import type { ChatMessage } from '../types/ai.types';

const SYSTEM_PROMPT = "You are a helpful coding assistant integrated into FlowState Desktop, a local-first developer workspace. Be concise and precise. Prefer code examples over lengthy explanations.";

export function useChat(model: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const unlistenChunk = useRef<(() => void) | null>(null);
  const unlistenDone = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      unlistenChunk.current?.();
      unlistenDone.current?.();
    };
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (isStreaming) return;

    const userMessage: ChatMessage = { role: 'user', content };
    const assistantMessage: ChatMessage = { role: 'assistant', content: '', model };
    
    const newMessages = [...messages, userMessage, assistantMessage];
    setMessages(newMessages);
    setIsStreaming(true);

    const payloadMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...newMessages.slice(0, -1) // Exclude the empty assistant placeholder
    ];

    try {
      unlistenChunk.current = await listen<string>('ai-stream-chunk', (event) => {
        setMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            updated[updated.length - 1] = {
              ...lastMsg,
              content: lastMsg.content + event.payload,
            };
          }
          return updated;
        });
      });

      unlistenDone.current = await listen<string>('ai-stream-done', async () => {
        setIsStreaming(false);
        unlistenChunk.current?.();
        unlistenDone.current?.();
      });

      await chatStream(model, payloadMessages);
    } catch (err) {
      console.error("Chat stream failed:", err);
      setIsStreaming(false);
      unlistenChunk.current?.();
      unlistenDone.current?.();
    }
  }, [messages, model, isStreaming]);

  return {
    messages,
    sendMessage,
    isStreaming,
    clearMessages,
  };
}