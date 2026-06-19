// src/components/editor/EditorWorkspace.tsx
import { useState, useEffect } from 'react';
import { readDirectory, readFile, writeFile, FileEntry } from '../../lib/tauri';
import MonacoEditor from './MonacoEditor';

interface Props {
  repoPath: string;
  activeModel: string; // Added to fix the TypeScript error
}

export function EditorWorkspace({ repoPath, activeModel }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');

  useEffect(() => {
    if (repoPath) {
      readDirectory(repoPath).then(setFiles).catch(console.error);
    }
  }, [repoPath]);

  const handleFileClick = async (path: string, isDir: boolean) => {
    if (isDir) return; 
    setActiveFile(path);
    try {
      const text = await readFile(path);
      setContent(text);
    } catch (err) {
      setContent(`// Error reading file: ${err}`);
    }
  };

  const handleSave = async (newContent: string) => {
    if (activeFile) {
      try {
        await writeFile(activeFile, newContent);
        setContent(newContent);
        window.dispatchEvent(new CustomEvent('flowstate-file-saved', { detail: activeFile }));
      } catch (err) {
        console.error("Failed to save file:", err);
      }
    }
  };

  return (
    <div className="flex h-full w-full">
      {/* File Tree Sidebar */}
      <div className="w-[200px] bg-[var(--bg-titlebar)] border-r border-[var(--border)] overflow-y-auto scrollbar-thin shrink-0">
        <div className="px-3 py-2 text-[11px] uppercase text-[var(--text-secondary)] font-semibold tracking-wider">
          Explorer
        </div>
        {files.map(file => (
          <div 
            key={file.path}
            onClick={() => handleFileClick(file.path, file.is_dir)}
            className={`px-3 py-1.5 text-[13px] cursor-pointer truncate flex items-center gap-2 ${
              activeFile === file.path 
                ? 'bg-[var(--bg-tab-active)] text-[var(--text-primary)]' 
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tabbar)]'
            }`}
          >
            <span className="text-[10px]">{file.is_dir ? '📁' : '📄'}</span>
            {file.name}
          </div>
        ))}
      </div>
      
      {/* Monaco Editor Area */}
      <div className="flex-1 h-full overflow-hidden">
        <MonacoEditor 
          filePath={activeFile} 
          initialContent={content} 
          onSave={handleSave} 
          activeModel={activeModel} // Passed down for AI completion
        />
      </div>
    </div>
  );
}