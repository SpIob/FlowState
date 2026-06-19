// src/components/docs/DocsPanel.tsx
import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { readDirectory, readFile, FileEntry } from '../../lib/tauri';

interface Props { repoPath: string; }

export function DocsPanel({ repoPath }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Recursively scan for .md files
  const scanMarkdownFiles = async (dirPath: string, baseDir: string): Promise<FileEntry[]> => {
    let mdFiles: FileEntry[] = [];
    try {
      const entries = await readDirectory(dirPath);
      for (const entry of entries) {
        if (entry.is_dir) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules' && entry.name !== 'target') {
            const subFiles = await scanMarkdownFiles(entry.path, baseDir);
            mdFiles = [...mdFiles, ...subFiles];
          }
        } else if (entry.name.toLowerCase().endsWith('.md')) {
          mdFiles.push({
            ...entry,
            name: entry.path.replace(baseDir, '').replace(/^[\\/]/, ''),
            path: entry.path
          });
        }
      }
    } catch (err) {
      console.error("Error scanning directory:", err);
    }
    return mdFiles;
  };

  useEffect(() => {
    if (repoPath) {
      scanMarkdownFiles(repoPath, repoPath).then(setFiles);
    }
  }, [repoPath]);

  useEffect(() => {
    if (selectedFile) {
      setLoading(true);
      readFile(selectedFile)
        .then(setContent)
        .catch(err => setContent(`Error reading file: ${err}`))
        .finally(() => setLoading(false));
    } else {
      setContent('');
    }
  }, [selectedFile]);

  // Extract headings for TOC
  const toc = useMemo(() => {
    const headings: { id: string; text: string; level: number }[] = [];
    const lines = content.split('\n');
    lines.forEach(line => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].trim();
        const id = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
        headings.push({ id, text, level });
      }
    });
    return headings;
  }, [content]);

  // Custom Tailwind styling for Markdown elements (no extra typography plugin needed)
  const markdownComponents = {
    h1: ({node, ...props}: any) => <h1 id={props.children?.toString().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')} className="text-2xl font-bold mb-4 mt-6 border-b border-[var(--border)] pb-2 text-[var(--text-primary)]" {...props} />,
    h2: ({node, ...props}: any) => <h2 id={props.children?.toString().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')} className="text-xl font-bold mb-3 mt-5 text-[var(--text-primary)]" {...props} />,
    h3: ({node, ...props}: any) => <h3 id={props.children?.toString().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-')} className="text-lg font-semibold mb-2 mt-4 text-[var(--text-primary)]" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-4 leading-relaxed text-[var(--text-secondary)]" {...props} />,
    a: ({node, ...props}: any) => <a className="text-[var(--accent)] hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc list-inside mb-4 space-y-1 text-[var(--text-secondary)]" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal list-inside mb-4 space-y-1 text-[var(--text-secondary)]" {...props} />,
    li: ({node, ...props}: any) => <li className="ml-2" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-[var(--accent)] pl-4 italic my-4 text-[var(--text-tertiary)]" {...props} />,
    code: ({node, className, children, ...props}: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const isInline = !match && !className;
      return isInline ? (
        <code className="bg-[var(--bg-base)] px-1.5 py-0.5 rounded text-[var(--accent)] text-[0.9em] font-mono" {...props}>{children}</code>
      ) : (
        <pre className="bg-[var(--bg-base)] border border-[var(--border)] p-4 rounded-md overflow-x-auto text-xs font-mono my-4">
          <code className={className} {...props}>{children}</code>
        </pre>
      );
    },
    table: ({node, ...props}: any) => (
      <div className="overflow-x-auto my-4">
        <table className="min-w-full border-collapse border border-[var(--border)] text-sm" {...props} />
      </div>
    ),
    th: ({node, ...props}: any) => <th className="border border-[var(--border)] bg-[var(--bg-titlebar)] px-3 py-2 text-left font-semibold text-[var(--text-primary)]" {...props} />,
    td: ({node, ...props}: any) => <td className="border border-[var(--border)] px-3 py-2 text-[var(--text-secondary)]" {...props} />,
    hr: ({node, ...props}: any) => <hr className="border-[var(--border)] my-6" {...props} />,
  };

  return (
    <div className="flex h-full w-full bg-[var(--bg-panel)] text-[var(--text-primary)]">
      {/* Sidebar: File Tree */}
      <div className="w-[250px] border-r border-[var(--border)] flex flex-col shrink-0">
        <div className="px-3 py-2 text-[11px] uppercase text-[var(--text-secondary)] font-semibold tracking-wider border-b border-[var(--border)]">
          Documentation
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {files.length === 0 ? (
            <div className="p-3 text-xs text-[var(--text-tertiary)]">No .md files found.</div>
          ) : (
            files.map(f => (
              <div
                key={f.path}
                onClick={() => setSelectedFile(f.path)}
                className={`px-3 py-1.5 text-[13px] cursor-pointer truncate border-b border-[var(--border)]/30 ${
                  selectedFile === f.path ? 'bg-[var(--bg-tab-active)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tabbar)]'
                }`}
                title={f.path}
              >
                📄 {f.name}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Markdown Renderer */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-8">
          {loading ? (
            <div className="text-[var(--text-secondary)]">Loading...</div>
          ) : selectedFile ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {content}
            </ReactMarkdown>
          ) : (
            <div className="flex h-full items-center justify-center text-[var(--text-tertiary)]">
              Select a markdown file from the sidebar.
            </div>
          )}
        </div>

        {/* TOC Sidebar */}
        {selectedFile && toc.length > 0 && (
          <div className="w-[200px] border-l border-[var(--border)] shrink-0 overflow-y-auto scrollbar-thin p-4 hidden lg:block">
            <div className="text-[11px] uppercase text-[var(--text-secondary)] font-semibold tracking-wider mb-3">
              On this page
            </div>
            <ul className="space-y-1.5 text-xs">
              {toc.map((h, i) => (
                <li key={i} style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
                  <a 
                    href={`#${h.id}`} 
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-colors block truncate"
                  >
                    {h.text}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}