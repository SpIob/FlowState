// src/components/plugins/PluginPanel.tsx
import { useState, useEffect } from 'react';
import { listInstalledPlugins, registerPlugin, PluginRecord } from '../../lib/tauri';
import { PluginSandbox } from './PluginSandbox';

// Hardcoded dummy plugin for Phase 4 validation
const DUMMY_PLUGIN_MANIFEST = {
  id: 'dummy-plugin-001',
  name: 'Dummy DB Viewer',
  version: '1.0.0',
  entry_point: 'inline',
  permissions: ['db:query'],
  description: 'A test plugin to validate the sandbox and permission bridge.'
};

const DUMMY_PLUGIN_HTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
    button { padding: 8px 16px; background: #4ec9b0; color: #0d0d0d; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
    #result { margin-top: 16px; padding: 10px; background: #2d2d2d; border-radius: 4px; min-height: 40px; }
  </style>
</head>
<body>
  <h3>Dummy Plugin (Sandboxed)</h3>
  <p>This code runs in an isolated iframe. It cannot access FlowState's DOM or cookies.</p>
  <button id="reqBtn">Request 'db:query' Permission</button>
  <div id="result">Waiting for user action...</div>
  
  <script>
    window.addEventListener('message', (event) => {
      if (event.data.type === 'PERMISSION_RESPONSE') {
        document.getElementById('result').innerText = event.data.granted 
          ? '✅ Permission Granted! (Can now query DB)' 
          : '❌ Permission Denied.';
      }
    });

    document.getElementById('reqBtn').addEventListener('click', () => {
      window.parent.postMessage({
        type: 'REQUEST_PERMISSION',
        pluginId: 'dummy-plugin-001',
        permission: 'db:query'
      }, '*');
    });
  </script>
</body>
</html>
`;

export function PluginPanel() {
  const [plugins, setPlugins] = useState<PluginRecord[]>([]);
  const [activePlugin, setActivePlugin] = useState<string | null>(null);

  useEffect(() => {
    listInstalledPlugins().then(setPlugins).catch(console.error);
  }, []);

  const handleLoadDummy = async () => {
    try {
      await registerPlugin(JSON.stringify(DUMMY_PLUGIN_MANIFEST));
      const updated = await listInstalledPlugins();
      setPlugins(updated);
      setActivePlugin('dummy-plugin-001');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-full w-full bg-[var(--bg-panel)]">
      {/* Sidebar */}
      <div className="w-[250px] border-r border-[var(--border)] flex flex-col shrink-0">
        <div className="px-3 py-2 text-[11px] uppercase text-[var(--text-secondary)] font-semibold tracking-wider border-b border-[var(--border)] flex justify-between items-center">
          <span>Installed</span>
          <button onClick={handleLoadDummy} className="text-[10px] normal-case bg-[var(--accent)] text-[#0d0d0d] px-2 py-0.5 rounded font-medium hover:brightness-110">
            Load Dummy
          </button>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {plugins.length === 0 ? (
            <div className="p-3 text-xs text-[var(--text-tertiary)]">No plugins installed.</div>
          ) : (
            plugins.map(p => (
              <div
                key={p.id}
                onClick={() => setActivePlugin(p.id)}
                className={`px-3 py-2 text-[13px] cursor-pointer border-b border-[var(--border)]/30 ${
                  activePlugin === p.id ? 'bg-[var(--bg-tab-active)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tabbar)]'
                }`}
              >
                <div className="font-medium">{p.name}</div>
                <div className="text-[10px] text-[var(--text-tertiary)]">v{p.version}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Sandbox Area */}
      <div className="flex-1 overflow-hidden bg-[var(--bg-base)]">
        {activePlugin === 'dummy-plugin-001' ? (
          <PluginSandbox pluginId="dummy-plugin-001" htmlContent={DUMMY_PLUGIN_HTML} />
        ) : (
          <div className="flex h-full items-center justify-center text-[var(--text-tertiary)] text-sm">
            Select a plugin to run it in the sandbox.
          </div>
        )}
      </div>
    </div>
  );
}