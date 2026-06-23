import Editor from '@monaco-editor/react';
import { useEffect, useState } from 'react';
import { useCompletion } from '../../hooks/useCompletion';

interface MonacoEditorProps {
  filePath: string | null;
  initialContent: string;
  onSave: (content: string) => void;
  activeModel: string;
}

export default function MonacoEditor({ filePath, initialContent, onSave, activeModel }: MonacoEditorProps) {
  const [value, setValue] = useState(initialContent);
  const { registerCompletionProvider } = useCompletion(activeModel);

  useEffect(() => { setValue(initialContent); }, [filePath, initialContent]);

  const handleMount = (editor: any, monaco: any) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const currentValue = editor.getModel()?.getValue() || '';
      onSave(currentValue);
    });
    registerCompletionProvider(editor, monaco);
  };

  if (!filePath) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--bg-base)] text-[var(--text-muted)] text-sm">
        Select a file from the explorer to start editing.
      </div>
    );
  }

  const ext = filePath.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    'js': 'javascript', 'ts': 'typescript', 'py': 'python',
    'rs': 'rust', 'json': 'json', 'md': 'markdown', 'html': 'html', 'css': 'css'
  };
  const language = languageMap[ext || ''] || 'plaintext';

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(v) => setValue(v || '')}
      onMount={handleMount}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        padding: { top: 16 },
        scrollBeyondLastLine: false,
        renderLineHighlight: 'gutter',
        scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
      }}
    />
  );
}