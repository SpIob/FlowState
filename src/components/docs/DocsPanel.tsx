import { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { readDirectory, readFile, FileEntry } from '../../lib/tauri';
// @ts-ignore - Vite raw import
import whitepaperRaw from '../../../docs/WHITEPAPER.md?raw';

interface Props { repoPath: string; }

export function DocsPanel({ repoPath }: Props) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [isDropdownVisible, setIsDropdownVisible] = useState(true);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const lastScrollTop = useRef(0);
  const contentRef = useRef<HTMLDivElement>(null);

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
          mdFiles.push({ ...entry, name: entry.path.replace(baseDir, '').replace(/^[\\/]/, ''), path: entry.path });
        }
      }
    } catch (err) { console.error(err); }
    return mdFiles;
  };

  useEffect(() => { 
    if (repoPath) {
      scanMarkdownFiles(repoPath, repoPath).then(mdFiles => {
        const welcomeEntry: FileEntry = {
          name: 'Welcome to FlowState',
          path: '__flowstate_welcome__',
          is_dir: false
        };
        setFiles([welcomeEntry, ...mdFiles]);
      });
    }
  }, [repoPath]);
  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      setSelectedFile('__flowstate_welcome__');
    }
  }, [files]);
  useEffect(() => {
    if (selectedFile === '__flowstate_welcome__') {
      setContent(whitepaperRaw);
      setLoading(false);
    } else if (selectedFile) { 
      setLoading(true); 
      readFile(selectedFile)
        .then(setContent)
        .catch(err => setContent(`Error: ${err}`))
        .finally(() => setLoading(false)); 
    } else {
      setContent('');
    }
  }, [selectedFile]);

  const toc = useMemo(() => {
    const headings: { id: string; text: string; level: number }[] = [];
    content.split('\n').forEach(line => {
      const match = line.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        const text = match[2].trim();
        headings.push({ id: text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-'), text, level: match[1].length });
      }
    });
    return headings;
  }, [content]);

  const handleScroll = () => {
    if (!contentRef.current) return;
    const st = contentRef.current.scrollTop;
    setIsDropdownVisible(!(st > lastScrollTop.current && st > 50));
    lastScrollTop.current = st <= 0 ? 0 : st;
  };

  const toId = (children: any) => children?.toString().toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');

  const markdownComponents = {
    h1: ({node, ...props}: any) => <h1 id={toId(props.children)} className="text-2xl font-normal mb-4 mt-6 border-b border-[var(--border-subtle)] pb-2 text-[var(--text-primary)]" {...props} />,
    h2: ({node, ...props}: any) => <h2 id={toId(props.children)} className="text-xl font-normal mb-3 mt-5 text-[var(--text-primary)]" {...props} />,
    h3: ({node, ...props}: any) => <h3 id={toId(props.children)} className="text-lg font-normal mb-2 mt-4 text-[var(--text-primary)]" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-4 leading-relaxed text-[var(--text-secondary)]" {...props} />,
    a: ({node, ...props}: any) => <a className="text-[var(--accent)] hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc list-inside mb-4 space-y-1 text-[var(--text-secondary)]" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal list-inside mb-4 space-y-1 text-[var(--text-secondary)]" {...props} />,
    li: ({node, ...props}: any) => <li className="ml-2" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-[var(--accent-dim)] pl-4 italic my-4 text-[var(--text-muted)]" {...props} />,
    code: ({node, className, children, ...props}: any) => {
      const isInline = !/language-(\w+)/.exec(className || '') && !className;
      return isInline
        ? <code className="bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded text-[var(--accent)] text-[0.9em] font-mono" {...props}>{children}</code>
        : <pre className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-4 rounded-md overflow-x-auto text-xs font-mono my-4"><code className={className} {...props}>{children}</code></pre>;
    },
    table: ({node, ...props}: any) => <div className="overflow-x-auto my-4"><table className="min-w-full border-collapse border border-[var(--border-subtle)] text-sm" {...props} /></div>,
    th: ({node, ...props}: any) => <th className="border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-left font-normal text-[var(--text-primary)]" {...props} />,
    td: ({node, ...props}: any) => <td className="border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-secondary)]" {...props} />,
    hr: ({node, ...props}: any) => <hr className="border-[var(--border-subtle)] my-6" {...props} />,
  };

  return (
    <div className="flex h-full w-full bg-[var(--bg-base)] text-[var(--text-primary)] relative overflow-hidden">
      <div ref={contentRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-8 pt-16">
        {loading ? <div className="text-[var(--text-muted)]">Loading...</div> :
          selectedFile ? <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{content}</ReactMarkdown> :
          <div className="flex h-full items-center justify-center text-[var(--text-muted)]">Select a markdown file to view.</div>}
      </div>

      {/* Floating Dropdown */}
      <div className={`absolute top-4 left-4 z-20 transition-all duration-300 ${isDropdownVisible || !selectedFile ? 'translate-y-0 opacity-100' : '-translate-y-[calc(100%+2rem)] opacity-0 pointer-events-none'}`}>
        <select value={selectedFile || ''} onChange={(e) => setSelectedFile(e.target.value || null)}
          className="bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-sm shadow-lg text-[var(--text-primary)] focus:border-[var(--border-focus)] outline-none max-w-[300px] appearance-none cursor-pointer">
          <option value="" disabled>Select a file...</option>
          {files.map(f => <option key={f.path} value={f.path}>{f.name}</option>)}
        </select>
      </div>

      {/* TOC Button */}
      {selectedFile && toc.length > 0 && (
        <button onClick={() => setIsTocOpen(true)} className="absolute top-4 right-4 z-20 p-2 bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-md shadow-lg hover:border-[var(--border-focus)] text-[var(--text-secondary)] transition-colors" title="Table of contents">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
          </svg>
        </button>
      )}

      {/* Sliding TOC */}
      <div className={`absolute top-0 right-0 h-full w-[250px] bg-[var(--bg-overlay)] border-l border-[var(--border-subtle)] shadow-xl z-30 transform transition-transform duration-300 flex flex-col ${isTocOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-[40px] flex items-center px-3 border-b border-[var(--border-subtle)] shrink-0 gap-3">
          <button onClick={() => setIsTocOpen(false)} className="p-1 hover:bg-[var(--bg-elevated)] rounded text-[var(--text-muted)] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <span className="text-[10px] text-[var(--text-muted)] tracking-widest">Contents</span>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-1.5 text-xs">
            {toc.map((h, i) => (
              <li key={i} style={{ paddingLeft: `${(h.level - 1) * 12}px` }}>
                <a href={`#${h.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors block truncate">{h.text}</a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}