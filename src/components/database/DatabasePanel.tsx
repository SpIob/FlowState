// src/components/database/DatabasePanel.tsx
import { useState, useEffect, useCallback } from 'react';
import { listTables, getSchema, queryData, runReadonlyQuery, TableInfo, DbQueryResult } from '../../lib/tauri';

type Tab = 'data' | 'schema' | 'query';

export function DatabasePanel() {
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('data');
  
  // Data tab state
  const [data, setData] = useState<DbQueryResult | null>(null);
  const [page, setPage] = useState(0);
  const [limit] = useState(50);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  // Schema tab state
  const [schema, setSchema] = useState<string>('');

  // Query tab state
  const [customQuery, setCustomQuery] = useState('SELECT * FROM signal_events LIMIT 10;');
  const [queryResult, setQueryResult] = useState<DbQueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);

  useEffect(() => {
    listTables().then(setTables).catch(console.error);
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const result = await queryData(selectedTable, limit, page * limit, undefined, filter || undefined);
      setData(result);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedTable, page, limit, filter]);

  useEffect(() => {
    if (selectedTable && activeTab === 'data') fetchData();
  }, [fetchData, activeTab, selectedTable]);

  useEffect(() => {
    if (selectedTable && activeTab === 'schema') {
      getSchema(selectedTable).then(setSchema).catch(console.error);
    }
  }, [selectedTable, activeTab]);

  const handleRunQuery = async () => {
    setQueryError(null);
    try {
      const result = await runReadonlyQuery(customQuery);
      setQueryResult(result);
    } catch (err: any) {
      setQueryError(err?.message || err?.toString() || 'Query failed');
      setQueryResult(null);
    }
  };

  const exportCsv = (result: DbQueryResult | null, filename: string) => {
    if (!result) return;
    const header = result.columns.join(',');
    const rows = result.rows.map(row => 
      row.map(cell => {
        if (cell === null || cell === undefined) return '';
        const str = String(cell);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full w-full bg-[var(--bg-panel)] text-[var(--text-primary)]">
      {/* Sidebar */}
      <div className="w-[200px] border-r border-[var(--border)] flex flex-col shrink-0">
        <div className="px-3 py-2 text-[11px] uppercase text-[var(--text-secondary)] font-semibold tracking-wider border-b border-[var(--border)]">
          Tables
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {tables.map(t => (
            <div
              key={t.name}
              onClick={() => { setSelectedTable(t.name); setPage(0); }}
              className={`px-3 py-2 text-[13px] cursor-pointer border-b border-[var(--border)]/50 flex justify-between items-center ${
                selectedTable === t.name ? 'bg-[var(--bg-tab-active)]' : 'hover:bg-[var(--bg-tabbar)]'
              }`}
            >
              <span className="truncate">{t.name}</span>
              <span className="text-[10px] text-[var(--text-tertiary)]">{t.row_count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedTable ? (
          <>
            {/* Tabs */}
            <div className="h-[35px] flex items-center bg-[var(--bg-titlebar)] border-b border-[var(--border)] shrink-0">
              {(['data', 'schema', 'query'] as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`h-full px-4 text-[11px] font-semibold tracking-[0.08em] uppercase ${
                    activeTab === tab
                      ? 'text-[var(--text-primary)] border-b-2 border-b-[var(--accent)]'
                      : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto scrollbar-thin p-4">
              {activeTab === 'data' && (
                <div className="flex flex-col h-full gap-3">
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Filter (e.g. event_type = 'keystroke_batch')"
                      value={filter}
                      onChange={(e) => { setFilter(e.target.value); setPage(0); }}
                      className="flex-1 bg-[var(--bg-base)] border border-[var(--border)] rounded px-2 py-1 text-sm focus:outline-none focus:border-[var(--accent)]"
                    />
                    <button onClick={() => exportCsv(data, selectedTable)} className="px-3 py-1 text-xs bg-[var(--bg-titlebar)] border border-[var(--border)] rounded hover:bg-[var(--bg-tabbar)]">
                      Export CSV
                    </button>
                  </div>
                  
                  {loading ? (
                    <div className="text-sm text-[var(--text-secondary)]">Loading...</div>
                  ) : data && data.rows.length > 0 ? (
                    <div className="flex-1 overflow-auto border border-[var(--border)] rounded">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[var(--bg-titlebar)] sticky top-0">
                          <tr>
                            {data.columns.map(col => (
                              <th key={col} className="px-3 py-2 border-b border-[var(--border)] font-semibold text-[var(--text-secondary)]">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.rows.map((row, i) => (
                            <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-tabbar)]">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-1.5 max-w-[300px] truncate">
                                  {cell === null ? <span className="text-[var(--text-tertiary)] italic">NULL</span> : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-sm text-[var(--text-secondary)]">No data found.</div>
                  )}

                  {data && data.total_count > limit && (
                    <div className="flex justify-between items-center text-xs text-[var(--text-secondary)]">
                      <span>Showing {page * limit + 1} to {Math.min((page + 1) * limit, data.total_count)} of {data.total_count}</span>
                      <div className="flex gap-2">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 border border-[var(--border)] rounded disabled:opacity-50">Prev</button>
                        <button disabled={(page + 1) * limit >= data.total_count} onClick={() => setPage(p => p + 1)} className="px-2 py-1 border border-[var(--border)] rounded disabled:opacity-50">Next</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'schema' && (
                <pre className="text-xs font-mono bg-[var(--bg-base)] p-4 rounded border border-[var(--border)] whitespace-pre-wrap text-[var(--text-primary)]">
                  {schema}
                </pre>
              )}

              {activeTab === 'query' && (
                <div className="flex flex-col h-full gap-3">
                  <textarea
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    className="h-32 w-full bg-[var(--bg-base)] border border-[var(--border)] rounded p-2 text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
                    placeholder="SELECT * FROM ..."
                  />
                  <div className="flex gap-2">
                    <button onClick={handleRunQuery} className="px-4 py-1.5 bg-[var(--accent)] text-[#0d0d0d] text-sm font-medium rounded hover:brightness-110">
                      Run Query
                    </button>
                    <button onClick={() => exportCsv(queryResult, 'custom_query')} className="px-3 py-1.5 text-xs bg-[var(--bg-titlebar)] border border-[var(--border)] rounded hover:bg-[var(--bg-tabbar)]">
                      Export CSV
                    </button>
                  </div>

                  {queryError && (
                    <div className="p-2 text-xs text-[var(--orange)] bg-[var(--orange)]/10 border border-[var(--orange)]/30 rounded">
                      {queryError}
                    </div>
                  )}

                  {queryResult && (
                    <div className="flex-1 overflow-auto border border-[var(--border)] rounded">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[var(--bg-titlebar)] sticky top-0">
                          <tr>
                            {queryResult.columns.map(col => (
                              <th key={col} className="px-3 py-2 border-b border-[var(--border)] font-semibold text-[var(--text-secondary)]">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.rows.map((row, i) => (
                            <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--bg-tabbar)]">
                              {row.map((cell, j) => (
                                <td key={j} className="px-3 py-1.5 max-w-[300px] truncate">
                                  {cell === null ? <span className="text-[var(--text-tertiary)] italic">NULL</span> : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[var(--text-secondary)] text-sm">
            Select a table from the sidebar to inspect.
          </div>
        )}
      </div>
    </div>
  );
}