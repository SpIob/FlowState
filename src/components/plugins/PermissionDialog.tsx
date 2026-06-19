// src/components/plugins/PermissionDialog.tsx
interface Props {
  pluginId: string;
  permission: string;
  onDecision: (granted: boolean) => void;
}

export function PermissionDialog({ pluginId, permission, onDecision }: Props) {
  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg shadow-2xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">Permission Request</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          The plugin <span className="font-mono text-[var(--accent)]">{pluginId}</span> is requesting access to:
        </p>
        <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded px-3 py-2 mb-6 font-mono text-sm text-[var(--text-primary)]">
          {permission}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => onDecision(false)}
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-titlebar)] border border-[var(--border)] rounded hover:bg-[var(--bg-tabbar)]"
          >
            Deny
          </button>
          <button
            onClick={() => onDecision(true)}
            className="px-4 py-2 text-sm font-medium text-[#0d0d0d] bg-[var(--accent)] rounded hover:brightness-110"
          >
            Grant Access
          </button>
        </div>
      </div>
    </div>
  );
}