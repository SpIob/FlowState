// src/components/ai/ChatMessage.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
}

interface ChatMessageProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end w-full px-3 mb-2">
        <div className="bg-[#1e3a5f] text-[var(--text-primary)] rounded-lg p-2 px-3 max-w-[85%] text-[13px] leading-normal break-words">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start w-full px-3 mb-2">
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .cursor-blink {
          animation: blink 1s step-end infinite;
        }
      `}</style>
      {message.model && (
        <span className="text-[10px] text-[var(--text-secondary)] mb-1 px-1">
          {message.model}
        </span>
      )}
      <div className="bg-[var(--bg-tab-active)] text-[var(--text-primary)] rounded-lg p-2 px-3 max-w-[85%] text-[13px] leading-normal break-words">
        <div className="markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => (
                <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>
              ),
              em: ({ children }) => <em className="italic">{children}</em>,
              h1: ({ children }) => (
                <h1 className="text-[14px] font-semibold mt-3 mb-1.5 first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-[13px] font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-[13px] font-semibold mt-2 mb-1 first:mt-0">{children}</h3>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>
              ),
              li: ({ children }) => <li>{children}</li>,
              code: ({ className, children, ...props }) => {
                const isBlock = className?.includes('language-');
                if (isBlock) {
                  return (
                    <pre className="bg-[#0d0d0d] border border-[var(--border)] rounded-md p-2.5 my-2 overflow-x-auto">
                      <code className="font-mono text-[12px] text-[var(--text-primary)]" {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                }
                return (
                  <code
                    className="bg-[#2d2d2d] text-[var(--accent)] px-1 rounded-sm font-mono text-[12px]"
                    {...props}
                  >
                    {children}
                  </code>
                );
              },
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline"
                >
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="border-collapse text-[12px]">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-[var(--border)] px-2 py-1 text-left font-semibold bg-[#1a1a1a]">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-[var(--border)] px-2 py-1">{children}</td>
              ),
              hr: () => <hr className="border-[var(--border)] my-2" />,
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
        {isStreaming && (
          <span className="text-[var(--accent)] cursor-blink">|</span>
        )}
      </div>
    </div>
  );
}