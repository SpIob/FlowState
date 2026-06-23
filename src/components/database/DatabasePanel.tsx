import { useState, useEffect, useCallback } from 'react';
import { listTables, getSchema, queryData, runReadonlyQuery, TableInfo, DbQueryResult } from '../../lib/tauri';

type Tab = 'data' | 'schema' | 'query';

export function DatabasePanel() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('data');

  const [data, setData] = useState<DbQueryResult | null>(null);
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  const [schema, setSchema] = useState<string>('');

  const [customQuery, setCustomQuery] = useState('SELECT * FROM signal_events LIMIT 10;');
  const [queryResult, setQueryResult] = useState<DbQueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => { listTables().then(setTables).catch(console.error); }, []);

  const fetchData = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const result = await queryData(selectedTable, limit, page * limit, undefined, filter || undefined);
      setData(result);
    } catch (err: any) { console.error(err); }
    finally { setLoading(false); }
  }, [selectedTable, page, limit, filter]);

  useEffect(() => { if (selectedTable && activeTab === 'data') fetchData(); }, [fetchData, activeTab, selectedTable]);
  useEffect(() => { if (selectedTable && activeTab === 'schema') getSchema(selectedTable).then(setSchema).catch(console.error); }, [selectedTable, activeTab]);

  const handleRunQuery = async () => {
    setQueryError(null);
    try { setQueryResult(await runReadonlyQuery(customQuery)); }
    catch (err: any) { setQueryError(err?.message || err?.toString() || 'Query failed'); setQueryResult(null); }
  };

  const exportCsv = (result: DbQueryResult | null, filename: string) => {
    if (!result) return;
    const header = result.columns.join(',');
    const rows = result.rows.map(row => row.map(cell => cell === null || cell === undefined ? '' : `"${String(cell).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${filename}_export.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const inputClass = "bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--border-focus)] outline-none transition-colors";

    const renderTable = (result: DbQueryResult) => (
      <div role="grid" aria-label={`${selectedTable} data`} className="flex-1 overflow-auto border border-[var(--border-subtle)] rounded-md">
        <table className="w-full text-xs text-left">
          <thead className="bg-[var(--bg-elevated)] sticky top-0">
            <tr role="row">
              {result.columns.map(col => (
                <th key={col} role="columnheader" scope="col" className="px-3 py-2 border-b border-[var(--border-subtle)] font-normal text-[var(--text-muted)]">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i} role="row" className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] transition-colors">
                {row.map((cell, j) => (
                  <td key={j} role="gridcell" className="px-3 py-1.5 max-w-[300px] truncate text-[var(--text-secondary)]">
                    {cell === null ? <span className="text-[var(--text-muted)] italic">NULL</span> : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-surface)] text-[var(--text-primary)]">
      {/* Top Bar */}
      <div className="h-[40px] flex items-center shrink-0 px-4 gap-4 border-b border-[var(--border-subtle)]">
        <select
          value={selectedTable || ''}
          onChange={(e) => { setSelectedTable(e.target.value || null); setPage(0); }}
          className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-md px-3 py-1 text-xs text-[var(--text-primary)] focus:border-[var(--border-focus)] outline-none min-w-[150px] appearance-none cursor-pointer"
        >
          <option value="" disabled>Select table...</option>
          {tables.map(t => (
            <option key={t.name} value={t.name}>{t.name} ({t.row_count})</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          {(['data', 'schema', 'query'] as Tab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-3 py-2 text-xs font-normal transition-colors ${
                activeTab === tab ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-px bg-[var(--accent)]" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {!selectedTable ? (
          <div className="flex h-full items-center justify-center text-[var(--text-muted)] text-sm">
            Select a table from the dropdown to inspect.
          </div>
        ) : (
          <>
            {activeTab === 'data' && (
              <div className="flex flex-col h-full gap-3">
                <div className="flex gap-2 items-center">
                  <input type="text" placeholder="Filter (e.g. event_type = 'keystroke_batch')" value={filter}
                    onChange={(e) => { setFilter(e.target.value); setPage(0); }} className={`flex-1 ${inputClass}`} />
                  <button onClick={() => exportCsv(data, selectedTable)} className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    Export CSV
                  </button>
                </div>
                {loading ? <div className="text-sm text-[var(--text-muted)]">Loading...</div> :
                  data && data.rows.length > 0 ? renderTable(data) :
                  <div className="text-sm text-[var(--text-muted)]">No data found.</div>}
                {data && data.total_count > limit && (
                  <div className="flex justify-between items-center text-xs text-[var(--text-muted)]">
                    <span>{page * limit + 1}–{Math.min((page + 1) * limit, data.total_count)} of {data.total_count}</span>
                    <div className="flex gap-2">
                      <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors">Prev</button>
                      <button disabled={(page + 1) * limit >= data.total_count} onClick={() => setPage(p => p + 1)} className="px-2 py-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors">Next</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'schema' && (
              <pre className="text-xs font-mono bg-[var(--bg-base)] p-4 rounded-md border border-[var(--border-subtle)] whitespace-pre-wrap text-[var(--text-secondary)]">
                {schema}
              </pre>
            )}

            {activeTab === 'query' && (
              <div className="flex flex-col h-full gap-3">
                <textarea value={customQuery} onChange={(e) => setCustomQuery(e.target.value)}
                  className={`h-32 w-full font-mono text-xs ${inputClass} resize-none`} placeholder="SELECT * FROM ..." />
                <div className="flex gap-3">
                  <button onClick={handleRunQuery} className="px-4 py-1.5 bg-[var(--accent)] text-[var(--bg-base)] text-sm font-medium rounded-md hover:brightness-110 transition-all">
                    Run Query
                  </button>
                  <button onClick={() => exportCsv(queryResult, 'custom_query')} className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    Export CSV
                  </button>
                </div>
                {queryError && <div className="p-2 text-xs text-[var(--danger)]">{queryError}</div>}
                {queryResult && renderTable(queryResult)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}