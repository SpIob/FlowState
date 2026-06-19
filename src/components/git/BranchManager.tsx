import { useState, useEffect, useCallback } from 'react';
import { listBranches, checkoutBranch, deleteBranch, createBranch, BranchInfo } from '../../lib/tauri';

interface Props { repoPath: string; }

export function BranchManager({ repoPath }: Props) {
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [newBranchName, setNewBranchName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchBranches = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listBranches(repoPath);
      setBranches(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [repoPath]);

  useEffect(() => { fetchBranches(); }, [fetchBranches]);

  const handleCheckout = async (name: string) => {
    await checkoutBranch(repoPath, name);
    fetchBranches();
  };

  const handleDelete = async (name: string) => {
    if (confirm(`Delete branch ${name}?`)) {
      await deleteBranch(repoPath, name);
      fetchBranches();
    }
  };

  const handleCreate = async () => {
    if (!newBranchName.trim()) return;
    await createBranch(repoPath, newBranchName, null);
    setNewBranchName('');
    fetchBranches();
  };

  return (
    <div className="flex flex-col h-full p-3 gap-4">
      <div className="flex gap-2">
        <input 
          type="text" 
          value={newBranchName} 
          onChange={(e) => setNewBranchName(e.target.value)} 
          placeholder="New branch name..." 
          className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)]"
        />
        <button onClick={handleCreate} className="px-3 py-1 bg-[var(--accent)] text-[#0d0d0d] text-sm font-medium rounded hover:brightness-110">
          Create
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin border border-[var(--border)] rounded bg-[var(--bg-base)]">
        {loading ? (
          <div className="p-4 text-center text-[var(--text-secondary)] text-sm">Loading branches...</div>
        ) : branches.length === 0 ? (
          <div className="p-4 text-center text-[var(--text-secondary)] text-sm">No branches found.</div>
        ) : (
          <ul className="text-sm">
            {branches.map((b) => (
              <li key={b.name} className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)]/50 hover:bg-[var(--bg-tabbar)]">
                <div className="flex items-center gap-2">
                  <span className={`font-mono ${b.is_head ? 'text-[var(--accent)] font-bold' : 'text-[var(--text-primary)]'}`}>
                    {b.name}
                  </span>
                  {b.is_head && <span className="text-[10px] uppercase bg-[var(--accent)]/20 text-[var(--accent)] px-1.5 py-0.5 rounded">HEAD</span>}
                </div>
                <div className="flex gap-2">
                  {!b.is_head && (
                    <>
                      <button onClick={() => handleCheckout(b.name)} className="text-[11px] px-2 py-0.5 bg-[var(--bg-titlebar)] border border-[var(--border)] rounded hover:bg-[var(--bg-tabbar)]">
                        Checkout
                      </button>
                      <button onClick={() => handleDelete(b.name)} className="text-[11px] px-2 py-0.5 bg-[var(--orange)]/20 text-[var(--orange)] rounded hover:bg-[var(--orange)]/30">
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