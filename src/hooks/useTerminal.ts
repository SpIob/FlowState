import { useEffect, useState, RefObject } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { listen } from '@tauri-apps/api/event';
import { spawnShell, writeToShell, resizePty } from '../lib/tauri';
import 'xterm/css/xterm.css'; // Note: If using xterm v5+, import from '@xterm/xterm/css/xterm.css'

export function useTerminal(containerRef: RefObject<HTMLDivElement | null>) {
  const [terminal, setTerminal] = useState<Terminal | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    setTerminal(term);

    // Spawn the backend shell process
    spawnShell().catch((err) => {
      term.write(`\r\n[Error spawning shell: ${err}]\r\n`);
    });

    // Listen for stdout/stderr emitted from the Rust backend
    let unlisten: (() => void) | undefined;
    listen<string>('terminal-output', (event) => {
      term.write(event.payload);
    }).then((unlistenFn) => {
      unlisten = unlistenFn;
    });

    // Forward user keystrokes to the backend stdin
    const dataDisposable = term.onData((data) => {
      writeToShell(data).catch(console.error);
    });

    // Handle container resizing dynamically
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        // Forward new dimensions to the Rust backend PTY
        resizePty(term.cols, term.rows).catch(console.error);
      } catch (e) {
        // Ignore fit errors that may occur during rapid teardown
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      dataDisposable.dispose();
      resizeObserver.disconnect();
      unlisten?.();
      term.dispose();
    };
  }, [containerRef]);

  return { terminal };
}