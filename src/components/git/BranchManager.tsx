import { useState, useEffect, useCallback } from 'react';
import { listBranches, checkoutBranch, deleteBranch, createBranch, BranchInfo } from '../../lib/tauri';

interface Props { repoPath: string; }

export function BranchManager({ repoPath }: Props) {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try { setBranches(await listBranches(repoPath)); } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  }, [repoPath]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const handleCheckout = async (name: string) => { await checkoutBranch(repoPath, name); fetchBranches(); };
  const handleDelete = async (name: string) => { if (confirm(`Delete branch ${name}?`)) { await deleteBranch(repoPath, name); fetchBranches(); } };
  const handleCreate = async () => {
    if (!newBranchName.trim()) return;
    await createBranch(repoPath, newBranchName, null);
    setNewBranchName('');
    fetchBranches();
  };

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex gap-2">
        <input 
          type="text" value={newBranchName} onChange={(e) => setNewBranchName(e.target.value)} 
          placeholder="New branch name..." 
          className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] outline-none transition-colors"
        />
        <button onClick={handleCreate} className="px-3 py-1.5 text-sm font-medium text-[var(--accent)] hover:brightness-110 transition-all">
          Create
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-[var(--text-muted)] text-sm">Loading branches...</div>
        ) : branches.length === 0 ? (
          <div className="p-4 text-center text-[var(--text-muted)] text-sm">No branches found.</div>
        ) : (
          <ul className="text-sm">
            {branches.map((b) => (
              <li key={b.name} className="flex items-center justify-between px-2 py-2 rounded-md hover:bg-[var(--bg-elevated)] group">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-sm ${b.is_head ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                    {b.name}
                  </span>
                  {b.is_head && <span className="text-[10px] bg-[var(--accent-dim)] text-[var(--accent)] px-1.5 py-0.5 rounded">HEAD</span>}
                </div>
                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!b.is_head && (
                    <>
                      <button onClick={() => handleCheckout(b.name)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)] px-2 py-0.5 rounded-md transition-colors">
                        Checkout
                      </button>
                      <button onClick={() => handleDelete(b.name)} className="text-xs text-[var(--danger)] hover:brightness-110 transition-colors">
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}