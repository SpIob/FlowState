import { useState, useEffect } from 'react';
import { open } from '@tauri-apps/plugin-dialog';

const WORKSPACE_KEY = 'flowstate_workspace_path';

export function useWorkspace() {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedPath = localStorage.getItem(WORKSPACE_KEY);
    if (savedPath) {
      setWorkspacePath(savedPath);
    }
    setLoading(false);
  }, []);

  const selectWorkspace = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select Workspace Folder'
    });
    
    if (selected) {
      localStorage.setItem(WORKSPACE_KEY, selected);
      setWorkspacePath(selected);
    }
  };

  const clearWorkspace = () => {
    localStorage.removeItem(WORKSPACE_KEY);
    setWorkspacePath(null);
  };

  return { workspacePath, loading, selectWorkspace, clearWorkspace };
}