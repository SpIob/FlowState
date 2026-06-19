// src/components/ci/CIPanel.tsx
import { useState, useEffect, useCallback } from 'react';
import { getOriginInfo, listWorkflowRuns, getWorkflowJobs, getJobLogs, WorkflowRun, WorkflowJob } from '../../lib/tauri';

interface Props { repoPath: string; }

export function CIPanel({ repoPath }: Props) {
  const [owner, setOwner] = useState('');
  const [repo, setRepo] = useState('');
  const [pat, setPat] = useState(localStorage.getItem('github_pat') || '');
  
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null);
  const [jobs, setJobs] = useState<WorkflowJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<WorkflowJob | null>(null);
  const [logs, setLogs] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    getOriginInfo(repoPath)
      .then(([o, r]) => { setOwner(o); setRepo(r); })
      .catch(() => setError("Could not detect GitHub repo from 'origin' remote."));
  }, [repoPath]);

  const fetchRuns = useCallback(async () => {
    if (!owner || !repo) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listWorkflowRuns(owner, repo, pat || undefined);
      setRuns(result);
      setSelectedRun(null); setJobs([]); setSelectedJob(null); setLogs('');
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err: any) {
      setError(err?.message || "Failed to fetch runs");
    } finally {
      setLoading(false);
    }
  }, [owner, repo, pat]);

  useEffect(() => {
    if (owner && repo) fetchRuns();
  }, [fetchRuns]);

  const handleSelectRun = async (run: WorkflowRun) => {
    setSelectedRun(run);
    setSelectedJob(null); setLogs('');
    try {
      const result = await getWorkflowJobs(owner, repo, run.id, pat || undefined);
      setJobs(result);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch jobs");
    }
  };

  const handleSelectJob = async (job: WorkflowJob) => {
    setSelectedJob(job);
    setLogs('Loading logs...');
    try {
      const result = await getJobLogs(owner, repo, job.id, pat || undefined);
      setLogs(result);
    } catch (err: any) {
      setLogs(`Error: ${err?.message || "Failed to fetch logs"}`);
    }
  };

  const savePat = (val: string) => {
    setPat(val);
    if (val) localStorage.setItem('github_pat', val);
    else localStorage.removeItem('github_pat');
  };

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'in_progress' || status === 'queued') return 'text-[var(--accent)]';
    if (conclusion === 'success') return 'text-green-500';
    if (conclusion === 'failure') return 'text-[var(--orange)]';
    return 'text-[var(--text-tertiary)]';
  };

  return (
    <div className="flex flex-col h-full p-3 gap-3 text-sm">
      <div className="flex gap-2 items-center">
        <input type="text" value={owner} onChange={e => setOwner(e.target.value)} placeholder="owner" className="w-24 bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1 text-xs" />
        <span className="text-[var(--text-tertiary)]">/</span>
        <input type="text" value={repo} onChange={e => setRepo(e.target.value)} placeholder="repo" className="w-32 bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1 text-xs" />
        <input type="password" value={pat} onChange={e => savePat(e.target.value)} placeholder="PAT (optional, saved locally)" className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1 text-xs" />
        <button onClick={fetchRuns} disabled={loading} className="px-3 py-1 bg-[var(--accent)] text-[#0d0d0d] text-xs font-medium rounded hover:brightness-110 disabled:opacity-50">
          {loading ? '...' : 'Refresh'}
        </button>
      </div>

      {error && <div className="text-xs text-[var(--orange)] bg-[var(--orange)]/10 p-2 rounded">{error}</div>}
      {lastUpdated && <div className="text-[10px] text-[var(--text-tertiary)] -mt-2">Last updated: {lastUpdated}</div>}

      <div className="flex-1 flex gap-3 overflow-hidden">
        {/* Runs List */}
        <div className="w-1/3 flex flex-col border border-[var(--border)] rounded bg-[var(--bg-base)] overflow-hidden">
          <div className="px-2 py-1.5 bg-[var(--bg-titlebar)] border-b border-[var(--border)] text-[10px] uppercase font-semibold text-[var(--text-secondary)]">Runs</div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {runs.map(run => (
              <div key={run.id} onClick={() => handleSelectRun(run)} className={`px-2 py-1.5 border-b border-[var(--border)]/50 cursor-pointer hover:bg-[var(--bg-tabbar)] ${selectedRun?.id === run.id ? 'bg-[var(--bg-tab-active)]' : ''}`}>
                <div className="truncate font-medium text-[var(--text-primary)]">{run.name || `Run #${run.id}`}</div>
                <div className="flex justify-between items-center mt-0.5">
                  <span className={`text-[10px] uppercase font-bold ${getStatusColor(run.status, run.conclusion)}`}>
                    {run.conclusion || run.status}
                  </span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">{new Date(run.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Jobs List */}
        <div className="w-1/4 flex flex-col border border-[var(--border)] rounded bg-[var(--bg-base)] overflow-hidden">
          <div className="px-2 py-1.5 bg-[var(--bg-titlebar)] border-b border-[var(--border)] text-[10px] uppercase font-semibold text-[var(--text-secondary)]">Jobs</div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {jobs.map(job => (
              <div key={job.id} onClick={() => handleSelectJob(job)} className={`px-2 py-1.5 border-b border-[var(--border)]/50 cursor-pointer hover:bg-[var(--bg-tabbar)] ${selectedJob?.id === job.id ? 'bg-[var(--bg-tab-active)]' : ''}`}>
                <div className="truncate text-[var(--text-primary)]">{job.name}</div>
                <span className={`text-[10px] uppercase font-bold ${getStatusColor(job.status, job.conclusion)}`}>
                  {job.conclusion || job.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Logs Viewer */}
        <div className="flex-1 flex flex-col border border-[var(--border)] rounded bg-[#0d0d0d] overflow-hidden">
          <div className="px-2 py-1.5 bg-[var(--bg-titlebar)] border-b border-[var(--border)] text-[10px] uppercase font-semibold text-[var(--text-secondary)]">
            Logs {selectedJob && `- ${selectedJob.name}`}
          </div>
          <pre className="flex-1 overflow-auto scrollbar-thin p-2 text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap">
            {logs || (selectedJob ? 'Select a job to view logs.' : 'Select a run to view jobs.')}
          </pre>
        </div>
      </div>
    </div>
  );
}