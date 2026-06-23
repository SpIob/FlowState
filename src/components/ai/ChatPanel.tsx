import { useState, useRef, useEffect } from 'react';
import { chatStream } from '../../lib/tauri';
import { listen } from '@tauri-apps/api/event';
import { ChatMessage } from '../../types/ai.types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatPanelProps { 
  model: string; 
}

export function ChatPanel({ model }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      let unlistenChunk: (() => void) | undefined;
      let unlistenDone: (() => void) | undefined;
      let isActive = true; // Flag to track if the component is still mounted

      const setupListeners = async () => {
        const chunkFn = await listen<string>('chat-chunk', (event) => {
          if (!isActive) return; // Ignore events if unmounted
          const chunk = event.payload;
          setMessages(prev => {
            const last = prev[prev.length - 1];
            if (last && last.role === 'assistant') {
              return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
            }
            return [...prev, { role: 'assistant', content: chunk }];
          });
        });

        const doneFn = await listen('chat-done', () => {
          if (!isActive) return;
          setStreaming(false);
        });

        if (isActive) {
          // Component is still mounted, save the unlisten functions for later cleanup
          unlistenChunk = chunkFn;
          unlistenDone = doneFn;
        } else {
          // Component unmounted BEFORE promises resolved (Strict Mode trap!)
          // Immediately destroy the listeners we just created
          chunkFn();
          doneFn();
        }
      };

      setupListeners();

      return () => {
        isActive = false;
        unlistenChunk?.();
        unlistenDone?.();
      };
    }, []);

  useEffect(() => { 
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); 
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || streaming) return;
    const userMsg: ChatMessage = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setStreaming(true);
    
    try {
      await chatStream(model, updated);
    } catch (err: any) {
      console.error("Chat stream failed:", err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️ Error: ${err?.message || err || 'Failed to connect to Ollama.'}` 
      }]);
    } finally {
      setStreaming(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setStreaming(false);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="h-[36px] shrink-0 flex items-center justify-end px-4 border-b border-[var(--border-subtle)]">
        <button 
          onClick={handleNewChat}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          New chat
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-[var(--text-muted)] text-sm">
            Ask anything about your code.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`
                  ${msg.role === 'user' 
                    ? 'bg-[var(--bg-elevated)] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm text-[var(--text-primary)] max-w-[80%] ml-auto' 
                    : 'bg-transparent px-1 py-2 text-sm text-[var(--text-primary)] max-w-[90%]'}
                `}>
                  {msg.role === 'assistant' ? (
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                        pre: ({node, ...props}) => <pre className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-3 rounded-md overflow-x-auto text-xs my-3 font-mono" {...props} />,
                        code: ({node, className, children, ...props}: any) => {
                          const isInline = !className;
                          return isInline 
                            ? <code className="bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded text-[var(--accent)] text-[0.9em] font-mono" {...props}>{children}</code>
                            : <code className={className} {...props}>{children}</code>;
                        },
                        ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
                        a: ({node, ...props}) => <a className="text-[var(--accent)] hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-[var(--accent-dim)] pl-4 italic my-3 text-[var(--text-muted)]" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <pre className="whitespace-pre-wrap font-sans m-0">{msg.content}</pre>
                  )}
                </div>
                
                {msg.role === 'assistant' && (
                  <span className="text-xs text-[var(--text-muted)] mt-1 px-1">
                    · {model}
                  </span>
                )}
              </div>
            ))}
            
            {streaming && (messages.length === 0 || messages[messages.length - 1].role === 'user') && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 px-1 py-2">
                  <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full typing-dot" />
                  <div className="w-2 h-2 bg-[var(--text-muted)] rounded-full typing-dot" />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="p-4 border-t border-[var(--border-subtle)] shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask a question..."
            disabled={streaming}
            className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-3 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] outline-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming}
            className="px-3 py-2 text-[var(--text-muted)] hover:text-[var(--accent)] disabled:opacity-30 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}