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
    } catch (err: any) { setError(err?.message || "Failed to fetch jobs"); }
  };

  const handleSelectJob = async (job: WorkflowJob) => {
    setSelectedJob(job);
    setLogs('Loading logs...');
    try {
      const result = await getJobLogs(owner, repo, job.id, pat || undefined);
      setLogs(result);
    } catch (err: any) { setLogs(`Error: ${err?.message || "Failed to fetch logs"}`); }
  };

  const savePat = (val: string) => {
    setPat(val);
    if (val) localStorage.setItem('github_pat', val);
    else localStorage.removeItem('github_pat');
  };

  const getStatusColor = (status: string, conclusion: string | null) => {
    if (status === 'in_progress' || status === 'queued') return 'text-[var(--accent)]';
    if (conclusion === 'success') return 'text-[var(--success)]';
    if (conclusion === 'failure') return 'text-[var(--danger)]';
    return 'text-[var(--text-muted)]';
  };

  const inputClass = "bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] outline-none transition-colors";

  return (
    <div className="flex flex-col h-full p-4 gap-4 text-sm">
      <div className="flex flex-col gap-2">
        <div className="flex gap-2 items-center">
          <input type="text" value={owner} onChange={e => setOwner(e.target.value)} placeholder="owner" className={`flex-1 min-w-0 ${inputClass}`} />
          <span className="text-[var(--text-muted)] shrink-0">/</span>
          <input type="text" value={repo} onChange={e => setRepo(e.target.value)} placeholder="repo" className={`flex-1 min-w-0 ${inputClass}`} />
          <button onClick={fetchRuns} disabled={loading} className="shrink-0 px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:brightness-110 transition-all disabled:opacity-50">
            {loading ? '...' : 'Refresh'}
          </button>
        </div>
        <input type="password" value={pat} onChange={e => savePat(e.target.value)} placeholder="Personal access token" className={`w-full ${inputClass}`} />
      </div>

      {error && <div className="text-xs text-[var(--danger)]">{error}</div>}
      {lastUpdated && <div className="text-[10px] text-[var(--text-muted)] -mt-2">Updated {lastUpdated}</div>}

      <div className="flex-1 flex gap-3 overflow-hidden">
        <div className="w-[40%] min-w-[120px] flex flex-col gap-3 overflow-hidden">
          <div className="flex-1 flex flex-col border border-[var(--border-subtle)] rounded-md bg-[var(--bg-base)] overflow-hidden">
            <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] tracking-widest">Runs</div>
            <div className="flex-1 overflow-y-auto" role="list" aria-label="Workflow Runs">
              {runs.map(run => (
                <div key={run.id} onClick={() => handleSelectRun(run)} className={`px-3 py-2 cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors ${selectedRun?.id === run.id ? 'bg-[var(--bg-elevated)]' : ''}`} role="listitem">
                  <div className="truncate text-xs text-[var(--text-primary)]">{run.name || `Run #${run.id}`}</div>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className={`text-[10px] font-medium ${getStatusColor(run.status, run.conclusion)}`}>{run.conclusion || run.status}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{new Date(run.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col border border-[var(--border-subtle)] rounded-md bg-[var(--bg-base)] overflow-hidden">
            <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] tracking-widest">Jobs</div>
            <div className="flex-1 overflow-y-auto" role="list" aria-label="Workflow Jobs">
              {jobs.map(job => (
                <div key={job.id} onClick={() => handleSelectJob(job)} className={`px-3 py-2 cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors ${selectedJob?.id === job.id ? 'bg-[var(--bg-elevated)]' : ''}`} role="listitem">
                  <div className="truncate text-xs text-[var(--text-primary)]">{job.name}</div>
                  <span className={`text-[10px] font-medium ${getStatusColor(job.status, job.conclusion)}`}>{job.conclusion || job.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col border border-[var(--border-subtle)] rounded-md bg-[var(--bg-base)] overflow-hidden">
          <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] tracking-widest shrink-0">
            Logs {selectedJob && `— ${selectedJob.name}`}
          </div>
          <pre className="flex-1 overflow-auto p-3 text-[11px] font-mono text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
            {logs || (selectedJob ? 'Select a job to view logs.' : 'Select a run to view jobs.')}
          </pre>
        </div>
      </div>
    </div>
  );
}