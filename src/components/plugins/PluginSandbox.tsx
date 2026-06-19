// src/components/plugins/PluginSandbox.tsx
import { useEffect, useRef, useState } from 'react';
import { PermissionDialog } from './PermissionDialog';
import { grantPermission } from '../../lib/tauri';

interface Props {
  pluginId: string;
  htmlContent: string;
}

export function PluginSandbox({ pluginId, htmlContent }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [pendingPermission, setPendingPermission] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'REQUEST_PERMISSION' && event.data.pluginId === pluginId) {
        setPendingPermission(event.data.permission);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pluginId]);

  const handlePermissionDecision = async (granted: boolean) => {
    if (pendingPermission) {
      if (granted) {
        // Record the grant in the SQLite plugin_audit_log via Rust
        await grantPermission(pluginId, pendingPermission).catch(console.error);
      }
      
      // Send the decision back to the sandboxed iframe
      iframeRef.current?.contentWindow?.postMessage({
        type: 'PERMISSION_RESPONSE',
        permission: pendingPermission,
        granted
      }, '*');
      
      setPendingPermission(null);
    }
  };

  return (
    <div className="relative w-full h-full">
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        sandbox="allow-scripts" // Strict sandbox: no same-origin, no popups, no top-level navigation
        className="w-full h-full border-0 bg-white"
        title={`Plugin Sandbox: ${pluginId}`}
      />
      
      {pendingPermission && (
        <PermissionDialog
          pluginId={pluginId}
          permission={pendingPermission}
          onDecision={handlePermissionDecision}
        />
      )}
    </div>
  );
}