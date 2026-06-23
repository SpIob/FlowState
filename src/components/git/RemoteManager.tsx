import { useState, useEffect, useCallback } from 'react';
import { listRemotes, addRemote, removeRemote, fetchRemote, pullRemote, pushRemote, RemoteInfo } from '../../lib/tauri';

interface Props { repoPath: string; }

export function RemoteManager({ repoPath }: Props) {
  const [remotes, setRemotes] = useState<RemoteInfo[]>([]);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  const [patUsername, setPatUsername] = useState('');
  const [patToken, setPatToken] = useState('');

  const fetchRemotes = useCallback(async () => {
    setLoading(true);
    try { setRemotes(await listRemotes(repoPath)); } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  }, [repoPath]);

  useEffect(() => { fetchRemotes(); }, [fetchRemotes]);

  const handleAdd = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    await addRemote(repoPath, newName, newUrl);
    setNewName(''); setNewUrl('');
    fetchRemotes();
  };

  const handleRemove = async (name: string) => {
    if (confirm(`Remove remote ${name}?`)) { await removeRemote(repoPath, name); fetchRemotes(); }
  };

  const handleAction = async (action: 'fetch' | 'pull' | 'push', remoteName: string) => {
    setActionLoading(`${action}-${remoteName}`);
    try {
      const branch = 'main'; 
      const user = patUsername.trim() || undefined;
      const pass = patToken.trim() || undefined;
      if (action === 'fetch') await fetchRemote(repoPath, remoteName, user, pass);
      if (action === 'pull') await pullRemote(repoPath, remoteName, branch, user, pass);
      if (action === 'push') await pushRemote(repoPath, remoteName, branch, user, pass);
      alert(`${action} completed successfully!`);
    } catch (err: any) { alert(`Error: ${err}`); } 
    finally { setActionLoading(null); }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-6">
      {/* Credentials */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-primary)]">HTTPS Credentials</span>
          <span className="text-xs text-[var(--text-muted)]">Stored in memory only</span>
        </div>
        <div className="flex flex-col gap-2">
          <input type="text" value={patUsername} onChange={(e) => setPatUsername(e.target.value)} placeholder="GitHub Username" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] outline-none transition-colors" />
          <input type="password" value={patToken} onChange={(e) => setPatToken(e.target.value)} placeholder="Personal Access Token" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] outline-none transition-colors" />
        </div>
      </div>

      {/* Add Remote */}
      <div className="flex flex-col gap-2">
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Name (e.g. origin)" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] outline-none transition-colors" />
        <input type="text" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL" className="w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] outline-none transition-colors" />
        <button onClick={handleAdd} className="w-full px-3 py-1.5 border border-[var(--accent)] text-[var(--accent)] bg-transparent text-sm font-medium rounded-md hover:bg-[var(--accent-dim)] transition-colors">
          Add Remote
        </button>
      </div>

      {/* Remotes List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-[var(--text-muted)] text-sm">Loading remotes...</div>
        ) : remotes.length === 0 ? (
          <div className="p-4 text-center text-[var(--text-muted)] text-sm">No remotes configured.</div>
        ) : (
          <ul className="text-sm flex flex-col gap-4">
            {remotes.map((r) => (
              <li key={r.name} className="flex flex-col gap-2 p-3 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[var(--text-primary)] text-sm">{r.name}</span>
                  <button onClick={() => handleRemove(r.name)} className="text-xs text-[var(--danger)] hover:brightness-110 transition-colors">Remove</button>
                </div>
                <div className="text-xs text-[var(--text-muted)] truncate">{r.url}</div>
                <div className="flex gap-3 mt-1">
                  {['fetch', 'pull', 'push'].map(action => (
                    <button 
                      key={action}
                      onClick={() => handleAction(action as any, r.name)} 
                      disabled={actionLoading === `${action}-${r.name}`}
                      className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-50 capitalize transition-colors"
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