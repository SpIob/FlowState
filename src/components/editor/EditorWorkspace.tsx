import { useState, useEffect, useRef, useMemo } from 'react';
import { readDirectory, readFile, writeFile, createFile, createDir, renamePath, deletePath, listWorkspaceFiles, FileEntry } from '../../lib/tauri';
import MonacoEditor from './MonacoEditor';

interface Props {
  repoPath: string;
  activeModel: string;
}

interface TreeNode extends FileEntry {
  children?: TreeNode[];
}

type EditAction = {
  type: 'create-file' | 'create-dir' | 'rename';
  parentPath: string;
  oldPath?: string;
  oldName?: string;
};

export function EditorWorkspace({ repoPath, activeModel }: Props) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [editAction, setEditAction] = useState<EditAction | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [fileCache, setFileCache] = useState<Record<string, string>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const [allFiles, setAllFiles] = useState<string[]>([]);

  useEffect(() => {
    if (editAction && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editAction]);

  useEffect(() => {
    if (repoPath) listWorkspaceFiles(repoPath).then(setAllFiles).catch(console.error);
  }, [repoPath]);

  const filteredSearchFiles = useMemo(() => {
    const mapToFileEntry = (p: string): FileEntry => ({
      name: p.split(/[/\\]/).pop() || p,
      path: p,
      is_dir: false
    });
    if (!searchQuery) return allFiles.slice(0, 15).map(mapToFileEntry);
    const q = searchQuery.toLowerCase();
    return allFiles.filter(p => p.toLowerCase().includes(q)).slice(0, 15).map(mapToFileEntry);
  }, [searchQuery, allFiles]);

  const loadRoot = async () => {
    if (repoPath) {
      const entries = await readDirectory(repoPath);
      setTree(entries.map(e => ({ ...e })));
    }
  };

  useEffect(() => { loadRoot(); }, [repoPath]);

  const updateTreeChildren = (nodes: TreeNode[], targetPath: string, children: FileEntry[]): TreeNode[] => {
    return nodes.map(node => {
      if (node.path === targetPath) return { ...node, children: children.map(c => ({ ...c })) };
      if (node.children) return { ...node, children: updateTreeChildren(node.children, targetPath, children) };
      return node;
    });
  };

  const toggleDir = async (path: string) => {
    const isExpanding = !expandedDirs.has(path);
    const newExpanded = new Set(expandedDirs);
    if (isExpanding) {
      newExpanded.add(path);
      try {
        const children = await readDirectory(path);
        setTree(prevTree => updateTreeChildren(prevTree, path, children));
      } catch (err) { console.error(err); }
    } else {
      newExpanded.delete(path);
    }
    setExpandedDirs(newExpanded);
  };

  const refreshNode = async (path: string) => {
    try {
      if (path === repoPath) await loadRoot();
      else {
        const children = await readDirectory(path);
        setTree(prev => updateTreeChildren(prev, path, children));
      }
    } catch (err) { console.error(err); }
  };

  const openFile = async (path: string) => {
    if (!openFiles.includes(path)) setOpenFiles(prev => [...prev, path]);
    setActiveFile(path);
    setShowSearch(false);
    setSearchQuery('');
    if (!fileCache[path]) {
      try {
        const text = await readFile(path);
        setFileCache(prev => ({ ...prev, [path]: text }));
      } catch (err) {
        setFileCache(prev => ({ ...prev, [path]: `// Error reading file: ${err}` }));
      }
    }
  };

  const closeTab = (path: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const newOpenFiles = openFiles.filter(f => f !== path);
    setOpenFiles(newOpenFiles);
    if (activeFile === path) {
      const idx = openFiles.indexOf(path);
      const nextFile = newOpenFiles[idx] || newOpenFiles[idx - 1] || null;
      setActiveFile(nextFile);
    }
  };

  const handleNodeClick = async (path: string, isDir: boolean) => {
    if (editAction) return; 
    if (isDir) { toggleDir(path); return; }
    openFile(path);
  };

  const handleSave = async (newContent: string) => {
    if (activeFile) {
      try {
        await writeFile(activeFile, newContent);
        setFileCache(prev => ({ ...prev, [activeFile]: newContent }));
        window.dispatchEvent(new CustomEvent('flowstate-file-saved', { detail: activeFile }));
      } catch (err) { console.error("Failed to save file:", err); }
    }
  };

  const startEdit = async (action: EditAction) => {
    setEditAction(action);
    setInputValue(action.oldName || '');
    if ((action.type === 'create-file' || action.type === 'create-dir') && action.parentPath !== repoPath) {
      if (!expandedDirs.has(action.parentPath)) {
        const newExpanded = new Set(expandedDirs);
        newExpanded.add(action.parentPath);
        setExpandedDirs(newExpanded);
        try {
          const children = await readDirectory(action.parentPath);
          setTree(prevTree => updateTreeChildren(prevTree, action.parentPath, children));
        } catch (err) { console.error(err); }
      }
    }
  };

  const cancelEdit = () => { setEditAction(null); setInputValue(''); };

  const submitEdit = async () => {
    if (!editAction || !inputValue.trim()) { cancelEdit(); return; }
    const newName = inputValue.trim();
    try {
      if (editAction.type === 'create-file') {
        const newPath = `${editAction.parentPath}/${newName}`;
        await createFile(newPath);
        await refreshNode(editAction.parentPath);
      } else if (editAction.type === 'create-dir') {
        const newPath = `${editAction.parentPath}/${newName}`;
        await createDir(newPath);
        await refreshNode(editAction.parentPath);
      } else if (editAction.type === 'rename' && editAction.oldPath) {
        const parentDir = editAction.oldPath.substring(0, editAction.oldPath.lastIndexOf('/'));
        const newPath = `${parentDir}/${newName}`;
        await renamePath(editAction.oldPath, newPath);
        if (activeFile === editAction.oldPath) setActiveFile(newPath);
        setOpenFiles(prev => prev.map(f => f === editAction.oldPath ? newPath : f));
        setFileCache(prev => {
          const { [editAction.oldPath!]: val, ...rest } = prev;
          return val ? { ...rest, [newPath]: val } : rest;
        });
        await refreshNode(parentDir || repoPath);
      }
    } catch (err) {
      console.error("File operation failed:", err);
      alert(`Operation failed: ${err}`);
    }
    cancelEdit();
  };

  const handleDelete = async (path: string, isDir: boolean) => {
    if (window.confirm(`Delete ${isDir ? 'folder' : 'file'}?\n${path}`)) {
      try {
        await deletePath(path);
        const parentDir = path.substring(0, path.lastIndexOf('/'));
        await refreshNode(parentDir || repoPath);
        if (activeFile === path || (isDir && activeFile?.startsWith(path + '/'))) setActiveFile(null);
        setOpenFiles(prev => prev.filter(f => f !== path && !f.startsWith(path + '/')));
        setFileCache(prev => { const next = { ...prev }; delete next[path]; return next; });
      } catch (err) { console.error(err); alert(`Failed to delete: ${err}`); }
    }
  };

  const getFileIcon = (name: string, isDir: boolean, isOpen: boolean) => {
    if (isDir) return isOpen ? '📂' : '📁';
    const ext = name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js': case 'jsx': return '🟨'; case 'ts': case 'tsx': return '🔷';
      case 'py': return '🐍'; case 'rs': return '🦀'; case 'json': return '📋';
      case 'md': return '📝'; case 'html': return '🌐'; case 'css': case 'scss': return '🎨';
      default: return '📄';
    }
  };

  const renderTree = (nodes: TreeNode[], depth: number = 0) => {
    return nodes.map(node => {
      const isEditingThis = editAction?.type === 'rename' && editAction.oldPath === node.path;
      const isExpanded = expandedDirs.has(node.path);
      return (
        <div key={node.path}>
          <div
            role="treeitem"
            aria-expanded={node.is_dir ? isExpanded : undefined}
            aria-selected={activeFile === node.path}
            aria-label={`${node.is_dir ? 'Folder' : 'File'} ${node.name}`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNodeClick(node.path, node.is_dir);
              }
            }}
            onClick={() => handleNodeClick(node.path, node.is_dir)}
            className={`group py-0.5 px-3 text-[13px] cursor-pointer truncate flex items-center gap-2 outline-none focus:bg-[var(--bg-elevated)] focus:text-[var(--text-primary)] ${
              activeFile === node.path ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
            }`}
            style={{ paddingLeft: `${12 + depth * 12}px` }}
          >
            {node.is_dir ? (
              <span className="text-[10px] transition-transform inline-block" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
            ) : (
              <span className="w-[10px] inline-block"></span>
            )}
            <span className="text-[12px]">{getFileIcon(node.name, node.is_dir, isExpanded)}</span>
            {isEditingThis ? (
              <input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                onBlur={submitEdit} onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                className="flex-1 bg-[var(--bg-base)] border border-[var(--border-focus)] rounded-md px-1 py-0 text-[13px] text-[var(--text-primary)] outline-none min-w-0"
                onClick={(e) => e.stopPropagation()} />
            ) : (
              <span className="truncate flex-1">{node.name}</span>
            )}
            {!isEditingThis && (
              <div className="hidden group-hover:flex items-center gap-1 ml-auto shrink-0 text-[var(--text-muted)]">
                {node.is_dir && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); startEdit({ type: 'create-file', parentPath: node.path }); }} className="p-0.5 hover:text-[var(--text-primary)]" title="New File">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); startEdit({ type: 'create-dir', parentPath: node.path }); }} className="p-0.5 hover:text-[var(--text-primary)]" title="New Folder">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                    </button>
                  </>
                )}
                <button onClick={(e) => { e.stopPropagation(); startEdit({ type: 'rename', parentPath: '', oldPath: node.path, oldName: node.name }); }} className="p-0.5 hover:text-[var(--text-primary)]" title="Rename">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(node.path, node.is_dir); }} className="p-0.5 hover:text-[var(--danger)]" title="Delete">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
              </div>
            )}
          </div>
          {node.is_dir && isExpanded && editAction && (editAction.type === 'create-file' || editAction.type === 'create-dir') && editAction.parentPath === node.path && (
             <div className="py-0.5 pr-3 flex items-center gap-2" style={{ paddingLeft: `${24 + (depth + 1) * 12}px` }}>
               <span className="text-[12px]">{editAction.type === 'create-dir' ? '📁' : '📄'}</span>
               <input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onBlur={submitEdit}
                 onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') cancelEdit(); }}
                 className="flex-1 bg-[var(--bg-base)] border border-[var(--border-focus)] rounded-md px-1 py-0 text-[13px] text-[var(--text-primary)] outline-none min-w-0"
                 placeholder={editAction.type === 'create-dir' ? 'Folder Name' : 'File Name'} />
             </div>
          )}
          {node.is_dir && isExpanded && node.children && renderTree(node.children, depth + 1)}
        </div>
      );
    });
  };

  const handleRootCreate = (type: 'create-file' | 'create-dir') => startEdit({ type, parentPath: repoPath });

  const renderRootInput = () => {
    if (!editAction || editAction.parentPath !== repoPath || editAction.type === 'rename') return null;
    return (
       <div className="py-0.5 px-3 flex items-center gap-2">
         <span className="text-[12px]">{editAction.type === 'create-dir' ? '📁' : '📄'}</span>
         <input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onBlur={submitEdit}
           onKeyDown={(e) => { if (e.key === 'Enter') submitEdit(); if (e.key === 'Escape') cancelEdit(); }}
           className="flex-1 bg-[var(--bg-base)] border border-[var(--border-focus)] rounded-md px-1 py-0 text-[13px] text-[var(--text-primary)] outline-none min-w-0"
           placeholder={editAction.type === 'create-dir' ? 'Folder Name' : 'File Name'} />
       </div>
    );
  };

  return (
    <div className="flex h-full w-full min-h-0 bg-[var(--bg-base)]">
      {/* File Tree Sidebar */}
      <div className="w-[200px] bg-[var(--bg-surface)] overflow-y-auto shrink-0 flex flex-col min-h-0">
        <div className="px-3 py-2 text-xs text-[var(--text-muted)] flex items-center justify-between shrink-0">
          <span>Explorer</span>
          <div className="flex gap-2 text-[var(--text-muted)]">
             <button onClick={() => handleRootCreate('create-file')} className="hover:text-[var(--text-primary)] transition-colors" title="New File">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
             </button>
             <button onClick={() => handleRootCreate('create-dir')} className="hover:text-[var(--text-primary)] transition-colors" title="New Folder">
               <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
             </button>
          </div>
        </div>
        {renderRootInput()}
        {tree.length === 0 && !editAction ? (
           <div className="px-3 py-2 text-xs text-[var(--text-muted)]">Empty workspace</div>
        ) : (
           <div role="tree" aria-label="File Explorer" className="flex-1">
              {renderTree(tree)}
            </div>
        )}
      </div>
      
      {/* Editor Area */}
      <div className="flex-1 min-h-0 h-full flex flex-col overflow-hidden">
        {/* Tab Bar & Search */}
        <div className="h-[36px] shrink-0 flex items-center bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] overflow-hidden">
          <div className="flex-1 flex items-end overflow-x-auto scrollbar-none h-full">
            {openFiles.map(path => {
              const name = path.split('/').pop() || path;
              const isActive = path === activeFile;
              return (
                <div
                  key={path}
                  onClick={() => setActiveFile(path)}
                  className={`group h-full flex items-center gap-2 px-3 cursor-pointer shrink-0 max-w-[200px] relative ${
                    isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="text-[12px]">{getFileIcon(name, false, false)}</span>
                  <span className="truncate text-xs">{name}</span>
                  <button
                    onClick={(e) => closeTab(path, e)}
                    className="opacity-0 group-hover:opacity-100 hover:text-[var(--text-primary)] transition-opacity ml-1"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--accent)]" />
                  )}
                </div>
              );
            })}
          </div>

          <div className="relative w-[250px] shrink-0 px-3 h-full flex items-center">
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              onBlur={() => setTimeout(() => setShowSearch(false), 200)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredSearchFiles.length > 0) openFile(filteredSearchFiles[0].path);
                if (e.key === 'Escape') { setShowSearch(false); searchRef.current?.blur(); }
              }}
              placeholder="Search files..."
              className="w-full bg-transparent border border-transparent focus:border-[var(--border-focus)] rounded-md px-2 py-1 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors"
            />
            {showSearch && (
              <div className="absolute top-full right-3 mt-1 w-[350px] max-h-[300px] bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-md shadow-xl z-50 overflow-y-auto">
                {filteredSearchFiles.length === 0 ? (
                  <div className="p-2 text-xs text-[var(--text-muted)]">No files found</div>
                ) : (
                  filteredSearchFiles.map(f => (
                    <div
                      key={f.path}
                      onMouseDown={() => openFile(f.path)}
                      className="px-3 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] cursor-pointer border-b border-[var(--border-subtle)] truncate flex items-center gap-2"
                      title={f.path}
                    >
                      <span>{getFileIcon(f.name, false, false)}</span>
                      <span className="font-medium">{f.name}</span>
                      <span className="ml-auto text-[var(--text-muted)] text-[10px] truncate max-w-[150px]">{f.path.replace(repoPath, '')}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 min-h-0 h-full overflow-hidden">
          <MonacoEditor 
            filePath={activeFile} 
            initialContent={activeFile ? (fileCache[activeFile] || '') : ''} 
            onSave={handleSave} 
            activeModel={activeModel}
          />
        </div>
      </div>
    </div>
  );
}