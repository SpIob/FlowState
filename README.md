# FlowState Desktop

> **The first developer tool that knows when to get out of your way.**

![Phase](https://img.shields.io/badge/phase-1%20%E2%80%94%20Foundation-4ec9b0?style=flat-square)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Stack](https://img.shields.io/badge/stack-Tauri%20%2B%20React%20%2B%20Rust-orange?style=flat-square)

FlowState is a cognitive state management system that contains an editor — not an editor that manages cognitive state as a feature. The editor, terminal, and Git integration are the substrate. The product's identity is the layer on top: flow detection, programmatic interruption blocking, and a dynamic UI that reconfigures itself based on your measured cognitive load.

No current tool does this. VS Code doesn't know when you're in flow. Cursor doesn't block Slack. Zed doesn't simplify its interface when your error rate climbs.

---

## What's Inside

A single-window app with three panels side by side:

- **Editor** — Monaco-based editing surface
- **Terminal** — Embedded PTY shell (zsh / bash / cmd)
- **Git** — Read-only status, log, and diff via libgit2

All local. No cloud. No telemetry.

---

## Prerequisites

- [Rust](https://rustup.rs/) (stable, 1.77+)
- [Node.js](https://nodejs.org/) (18+)
- [Tauri CLI](https://tauri.app/start/) — `cargo install tauri-cli`
- **macOS only:** Xcode Command Line Tools — `xcode-select --install`
- **macOS only:** `brew install openssl libgit2`

---

## Development Setup

```bash
# Clone the repository
git clone https://github.com/<you>/flowstate.git
cd flowstate

# Install frontend dependencies
npm install

# Start the dev server + Tauri window
npm run tauri dev
```

First run compiles the Rust backend from scratch — expect 2–3 minutes. Subsequent runs are fast.

---

## Build

```bash
# Production build for your current platform
npm run tauri build
```

Output artifacts are placed in `src-tauri/target/release/bundle/`.

---

## Roadmap

| Phase | Timeline | Goal |
|-------|----------|------|
| **1 — Foundation** ✅ | Months 1–3 | Unified workspace skeleton: editor, PTY terminal, read-only Git panel, SQLite state persistence, cross-platform CI |
| **2 — Local AI** | Months 4–6 | Fully local AI via Ollama. Inline code completion (CodeLlama / StarCoder2), AI chat panel, model switcher. Zero network required. |
| **3 — Deep Work Engine** | Months 7–10 | The cognitive layer. Flow state detection from behavioral signals, OS-level interruption blocking (macOS + Windows), progressive UI simplification, cognitive load dashboard. |
| **4 — Tool Embedding & Git Polish** | Months 11–13 | Full interactive Git (commit, branch, merge, push/pull), database viewer, CI/CD status panel, Markdown docs viewer, plugin system. |
| **5 — Polish & Public Release** | Months 14–16 | Performance profiling, security audit, beta program, v1.0 public release. Cognitive load reduction findings published. |

---

## Tech Stack

**Frontend:** React 18 · TypeScript · Tailwind CSS v4 · Monaco Editor · xterm.js

**Backend:** Tauri 2 · Rust · libgit2 · portable-pty · SQLite (sqlx)

**Build:** Vite · GitHub Actions (macOS + Windows)

---

## Platform Support

| Platform | Status |
|----------|--------|
| macOS (Apple Silicon) | ✅ Supported |
| macOS (Intel) | ✅ Supported |
| Windows (x64) | ✅ Supported |
| Linux | 🗓 Planned (v1.x) |

---

## License

MIT © FlowState Desktop Contributors