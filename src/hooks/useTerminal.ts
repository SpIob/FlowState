import { useEffect, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { listen } from '@tauri-apps/api/event';
import { spawnShell, writeToShell } from '../lib/tauri';
import { useSignalCollector } from './useSignalCollector';
import 'xterm/css/xterm.css'; // Note: If using xterm v5+, import from '@xterm/xterm/css/xterm.css'

export function useTerminal(containerRef: React.RefObject<HTMLDivElement | null>) {
  const [terminal, setTerminal] = useState<Terminal | null>(null);
  const { recordKeystroke } = useSignalCollector();

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

      // xterm sends raw bytes, not named keys. Backspace arrives as DEL
      // (0x7f) in most terminal modes, or BS (0x08) in some configurations.
      // Record it under the same 'Backspace' label Monaco's keydown events
      // use, so the existing backspace_latency calculation picks it up identically.
      if (data === '\x7f' || data === '\b') {
        recordKeystroke('Backspace', Date.now());
      } else if (data.length === 1) {
        // Any other single printable character
        recordKeystroke(data, Date.now());
      }
    });

    // Handle container resizing dynamically
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        // Ignore fit errors that may occur during rapid teardown
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      dataDisposable.dispose();
      resizeObserver.disconnect();
      unlisten?.();
      term.dispose();
    };
  }, [containerRef, recordKeystroke]);

  return { terminal };
}