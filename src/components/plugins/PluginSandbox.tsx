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
      if (granted) await grantPermission(pluginId, pendingPermission).catch(console.error);
      iframeRef.current?.contentWindow?.postMessage({ type: 'PERMISSION_RESPONSE', permission: pendingPermission, granted }, '*');
      setPendingPermission(null);
    }
  };

  return (
    <div className="relative w-full h-full">
      <iframe ref={iframeRef} srcDoc={htmlContent} sandbox="allow-scripts" className="w-full h-full border-0" title={`Plugin: ${pluginId}`} />
      {pendingPermission && <PermissionDialog pluginId={pluginId} permission={pendingPermission} onDecision={handlePermissionDecision} />}
    </div>
  );
}