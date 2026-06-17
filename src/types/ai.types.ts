// src/types/ai.types.ts
export interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string; // present on assistant messages — the model that generated this response
}

export interface ChatSession {
  id: number;
  model: string;
  created_at: string;
}