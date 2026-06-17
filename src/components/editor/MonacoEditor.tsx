/* src/components/editor/MonacoEditor.tsx */
import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { useCompletion } from '../../hooks/useCompletion';

interface MonacoEditorProps {
  filePath?: string;
  activeModel: string;
}

interface Tab {
  id: string;
  label: string;
  language: string;
}

const tabs: Tab[] = [
  { id: 'main', label: 'main.rs', language: 'rust' },
  { id: 'server', label: 'server.rs', language: 'rust' },
  { id: 'cargo', label: 'Cargo.toml', language: 'toml' },
];

export function MonacoEditor({ filePath, activeModel }: MonacoEditorProps) {
  const [activeTab, setActiveTab] = useState<string>('main');
  console.log(activeModel);
  const { registerCompletionProvider } = useCompletion(activeModel);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-panel)]">
      {/* Tab bar */}
      <div className="h-[35px] flex items-center bg-[var(--bg-tabbar)] border-b border-[var(--border)] shrink-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <div
              key={tab.id}
              className={`h-full flex items-center px-4 text-[13px] cursor-pointer border-r border-[var(--border)] shrink-0
                ${isActive
                  ? 'bg-[var(--bg-tab-active)] text-[var(--text-primary)] border-t-2 border-t-[var(--accent)]'
                  : 'bg-[var(--bg-tab-inactive)] text-[var(--text-secondary)]'
                }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <button
                className="ml-3 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs leading-none"
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                ×
              </button>
            </div>
          );
        })}
        <div className="flex-1 bg-[var(--bg-tabbar)] h-full" />
      </div>

      {/* Editor surface */}
      <div className="flex-1 overflow-hidden">
        <Editor
          theme="vs-dark"
          defaultLanguage="rust"
          height="100%"
          defaultPath={filePath}
          options={{
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            lineNumbers: 'on',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 8 },
            renderLineHighlight: 'all',
            lineNumbersMinChars: 3,
            inlineSuggest: { enabled: true, mode: 'subwordSmart' },
            quickSuggestions: { other: false, comments: false, strings: false },
          }}
          onMount={(editor, monacoInstance) => {
            editor.focus();
            registerCompletionProvider(editor, monacoInstance);
          }}
        />
      </div>
    </div>
  );
}