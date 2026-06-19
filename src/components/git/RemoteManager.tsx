// src/components/git/RemoteManager.tsx
import { useState, useEffect, useCallback } from 'react';
import { listRemotes, addRemote, removeRemote, fetchRemote, pullRemote, pushRemote, RemoteInfo } from '../../lib/tauri';

interface Props { repoPath: string; }

export function RemoteManager({ repoPath }: Props) {
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // NEW: Memory-only credential state for HTTPS pushes
  const [patUsername, setPatUsername] = useState('');
  const [patToken, setPatToken] = useState('');

  const fetchRemotes = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listRemotes(repoPath);
      setRemotes(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => { fetchRemotes(); }, [fetchRemotes]);

  const handleAdd = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    await addRemote(repoPath, newName, newUrl);
    setNewName(''); setNewUrl('');
    fetchRemotes();
  };

  const handleRemove = async (name: string) => {
    if (confirm(`Remove remote ${name}?`)) {
      await removeRemote(repoPath, name);
      fetchRemotes();
    }
  };

  const handleAction = async (action: 'fetch' | 'pull' | 'push', remoteName: string) => {
    setActionLoading(`${action}-${remoteName}`);
    try {
      const branch = 'main'; // Defaulting to main
      const user = patUsername.trim() || undefined;
      const pass = patToken.trim() || undefined;

      if (action === 'fetch') await fetchRemote(repoPath, remoteName, user, pass);
      if (action === 'pull') await pullRemote(repoPath, remoteName, branch, user, pass);
      if (action === 'push') await pushRemote(repoPath, remoteName, branch, user, pass);
      
      alert(`${action} completed successfully!`);
    } catch (err: any) {
      alert(`Error: ${err}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-full p-3 gap-4">
      {/* NEW: HTTPS Credentials Section */}
      <div className="flex flex-col gap-2 p-3 bg-[var(--bg-titlebar)] border border-[var(--border)] rounded">
        <div className="text-[11px] uppercase text-[var(--text-secondary)] font-semibold tracking-wider mb-1">
          HTTPS Credentials (Optional)
        </div>
        <p className="text-[11px] text-[var(--text-tertiary)] mb-2">
          Required for pushing to private HTTPS repositories. Stored only in memory.
        </p>
        <div className="flex gap-2">
          <input 
            type="text" 
            value={patUsername} 
            onChange={(e) => setPatUsername(e.target.value)} 
            placeholder="GitHub Username" 
            className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" 
          />
          <input 
            type="password" 
            value={patToken} 
            onChange={(e) => setPatToken(e.target.value)} 
            placeholder="Personal Access Token" 
            className="flex-[2] bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" 
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3 bg-[var(--bg-titlebar)] border border-[var(--border)] rounded">
        <div className="text-[11px] uppercase text-[var(--text-secondary)] font-semibold tracking-wider mb-1">Add New Remote</div>
        <div className="flex gap-2">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (e.g. origin)" className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
          <input type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL" className="flex-[2] bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]" />
          <button onClick={handleAdd} className="px-3 py-1 bg-[var(--accent)] text-[#0d0d0d] text-sm font-medium rounded hover:brightness-110">Add</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin border border-[var(--border)] rounded bg-[var(--bg-base)]">
        {loading ? (
          <div className="p-4 text-center text-[var(--text-secondary)] text-sm">Loading remotes...</div>
        ) : remotes.length === 0 ? (
          <div className="p-4 text-center text-[var(--text-secondary)] text-sm">No remotes configured.</div>
        ) : (
          <ul className="text-sm">
            {remotes.map((r) => (
              <li key={r.name} className="flex flex-col px-3 py-2 border-b border-[var(--border)]/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[var(--text-primary)] font-bold">{r.name}</span>
                  <button onClick={() => handleRemove(r.name)} className="text-[11px] px-2 py-0.5 bg-[var(--orange)]/20 text-[var(--orange)] rounded hover:bg-[var(--orange)]/30">Remove</button>
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] truncate mb-2">{r.url}</div>
                <div className="flex gap-2">
                  {['fetch', 'pull', 'push'].map(action => (
                    <button 
                      key={action}
                      onClick={() => handleAction(action as any, r.name)} 
                      disabled={actionLoading === `${action}-${r.name}`}
                      className="text-[11px] px-2 py-0.5 bg-[var(--bg-titlebar)] border border-[var(--border)] rounded hover:bg-[var(--bg-tabbar)] disabled:opacity-50 capitalize"
                    >
                      {actionLoading === `${action}-${r.name}` ? '...' : action}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}