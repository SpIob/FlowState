import { useState, useEffect } from 'react';
import { listInstalledPlugins, registerPlugin, PluginRecord } from '../../lib/tauri';
import { PluginSandbox } from './PluginSandbox';

const DUMMY_PLUGIN_MANIFEST = {
  id: 'dummy-plugin-001', name: 'Dummy DB Viewer', version: '1.0.0',
  entry_point: 'inline', permissions: ['db:query'], description: 'A test plugin.'
};

const DUMMY_PLUGIN_HTML = `
<!DOCTYPE html>
<html><head><style>
  body { font-family: system-ui, sans-serif; background: #0e0e0f; color: #8b8b8f; padding: 24px; }
  h3 { color: #e8e8e9; font-weight: 400; margin-bottom: 8px; }
  p { font-size: 12px; margin-bottom: 16px; }
  button { padding: 8px 16px; background: transparent; color: #4ecca3; border: 1px solid #4ecca3; border-radius: 6px; cursor: pointer; font-size: 13px; }
  button:hover { background: #4ecca318; }
  #result { margin-top: 16px; font-size: 12px; color: #4f4f54; font-style: italic; }
</style></head><body>
  <h3>Sandboxed plugin</h3>
  <p>This code runs in an isolated iframe. It cannot access FlowState's DOM or cookies.</p>
  <button id="reqBtn">Request 'db:query' permission</button>
  <div id="result">Waiting for user action...</div>
  <script>
    window.addEventListener('message', (e) => {
      if (e.data.type === 'PERMISSION_RESPONSE') {
        document.getElementById('result').innerText = e.data.granted ? '✓ Permission granted' : '✗ Permission denied';
        document.getElementById('result').style.fontStyle = 'normal';
        document.getElementById('result').style.color = e.data.granted ? '#4ecca3' : '#e05c5c';
      }
    });
    document.getElementById('reqBtn').addEventListener('click', () => {
      window.parent.postMessage({ type: 'REQUEST_PERMISSION', pluginId: 'dummy-plugin-001', permission: 'db:query' }, '*');
    });
  </script>
</body></html>`;

export function PluginPanel() {
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [activePlugin, setActivePlugin] = useState<string | null>(null);

  useEffect(() => { listInstalledPlugins().then(setPlugins).catch(console.error); }, []);

  const handleLoadDummy = async () => {
    try {
      await registerPlugin(JSON.stringify(DUMMY_PLUGIN_MANIFEST));
      setPlugins(await listInstalledPlugins());
      setActivePlugin('dummy-plugin-001');
    } catch (err) { console.error(err); }
  };

  return (
    <div className="flex h-full w-full bg-[var(--bg-surface)]">
      {/* Sidebar */}
      <div className="w-[150px] border-r border-[var(--border-subtle)] flex flex-col shrink-0">
        <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] tracking-widest flex justify-between items-center shrink-0">
          <span>Installed</span>
          <button onClick={handleLoadDummy} className="text-[10px] text-[var(--accent)] hover:brightness-110 transition-all">
            Load dummy
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {plugins.length === 0 ? (
            <div className="p-3 text-xs text-[var(--text-muted)]">No plugins installed.</div>
          ) : plugins.map(p => (
            <div key={p.id} onClick={() => setActivePlugin(p.id)}
              className={`px-3 py-2 text-[13px] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors ${activePlugin === p.id ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
              <div className="truncate text-sm">{p.name}</div>
              <div className="text-[10px] text-[var(--text-muted)]">v{p.version}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sandbox */}
      <div className="flex-1 overflow-hidden bg-[var(--bg-base)]">
        {activePlugin === 'dummy-plugin-001' ? (
          <PluginSandbox pluginId="dummy-plugin-001" htmlContent={DUMMY_PLUGIN_HTML} />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--text-muted)] text-sm">
            Select a plugin to run it in the sandbox.
          </div>
        )}
      </div>
    </div>
  );
}