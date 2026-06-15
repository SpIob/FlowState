/* src/App.tsx */
import { useEffect } from 'react';
import { WorkspaceShell } from './components/layout/WorkspaceShell';
import { initDb } from './lib/db';

export default function App() {
  useEffect(() => {
    initDb();
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden font-[system-ui,sans-serif]">
      <WorkspaceShell />
    </div>
  );
}