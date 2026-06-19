# FlowState Desktop

**The first developer tool that knows when to get out of your way.**

![Phase](https://img.shields.io/badge/phase-5%20%E2%80%94%20Polish%20%26%20Release-4ec9b0?style=flat-square)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Stack](https://img.shields.io/badge/stack-Tauri%20%2B%20React%20%2B%20Rust-orange?style=flat-square)

FlowState is a cognitive state management system that contains an editor — not an editor that manages cognitive state as a feature. The editor, terminal, and Git integration are the substrate. The product's identity is the layer on top: flow detection, programmatic interruption blocking, and a dynamic UI that reconfigures itself based on your measured cognitive load.

No current tool does this. VS Code doesn't know when you're in flow. Cursor doesn't block Slack. Zed doesn't simplify its interface when your error rate climbs.

## What's Inside

A single-window, local-first workspace that replaces 9–12 fragmented developer tools:

- **Editor & Explorer** — Monaco-based editing surface with AI inline completion (Ollama) and a native file tree.
- **Terminal** — Embedded PTY shell (zsh / bash / cmd) that automatically targets your active workspace.
- **Source Control** — Full interactive Git GUI (stage, commit, branch, merge, push/pull) powered natively by `libgit2`.
- **DevOps** — Integrated GitHub Actions CI/CD dashboard with real-time job log streaming.
- **Data** — Read-only SQLite inspection panel to query and export your local cognitive signal data.
- **Knowledge** — Embedded GitHub-flavored Markdown renderer with auto-generated, scroll-synced Table of Contents.
- **Extensions** — A strictly sandboxed plugin system with runtime permission gating and immutable audit logs.
- **Deep Work Engine** — Behavioral signal collection, cognitive load scoring, and OS-level Focus Mode integration (macOS/Windows).

**All local. No cloud. No telemetry.**

## Plugin System Overview

FlowState features a community plugin architecture designed with privacy and focus as the top priorities. Plugins run inside isolated `<iframe>` sandowns and cannot access your file system, database, or network without explicit, user-granted permissions. Every permission grant is permanently recorded in an immutable SQLite audit log. 

To build your own extensions, read the [Plugin Development Guide](docs/PLUGIN_DEV.md).

## Prerequisites

- [Rust](https://rustup.rs/) (stable, 1.77+)
- [Node.js](https://nodejs.org/) (20+)
- [Tauri CLI](https://tauri.app/start/) — `cargo install tauri-cli`
- **macOS only:** Xcode Command Line Tools — `xcode-select --install`
- **macOS only:** `brew install openssl libgit2`

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

*First run compiles the Rust backend from scratch — expect 2–3 minutes. Subsequent runs are fast.*

## Build

```bash
# Production build for your current platform
npm run tauri build
```

Output artifacts are placed in `src-tauri/target/release/bundle/`.

## Roadmap

| Phase | Timeline | Goal |
| :--- | :--- | :--- |
| **1 — Foundation** ✅ | Months 1–3 | Unified workspace skeleton: editor, PTY terminal, read-only Git panel, SQLite state persistence, cross-platform CI. |
| **2 — Local AI** ✅ | Months 4–6 | Fully local AI via Ollama. Inline code completion, AI chat panel, model switcher. Zero network required. |
| **3 — Deep Work Engine** ✅ | Months 7–10 | The cognitive layer. Flow state detection, OS-level interruption blocking, progressive UI simplification, cognitive load dashboard. |
| **4 — Tool Embedding & Git Polish** ✅ | Months 11–13 | Full interactive Git, database viewer, CI/CD status panel, Markdown docs viewer, sandboxed plugin system. |
| **5 — Polish & Public Release** 🔄 | Months 14–16 | UI Activity Bar refactor, accessibility audit, performance profiling, v1.0 signed binary release. |

## Tech Stack

- **Frontend:** React 18 · TypeScript · Tailwind CSS v4 · Monaco Editor · xterm.js
- **Backend:** Tauri 2 · Rust · libgit2 · portable-pty · SQLite (sqlx)
- **Build:** Vite · GitHub Actions (macOS + Windows)

## Platform Support

| Platform | Status |
| :--- | :--- |
| macOS (Apple Silicon) | ✅ Supported |
| macOS (Intel) | ✅ Supported |
| Windows (x64) | ✅ Supported |
| Linux | 🗓 Planned (v1.x) |

## Contributing

We welcome contributions to FlowState Desktop! Whether you are fixing a bug, improving the cognitive scoring algorithm, or building a community plugin, your help is appreciated.

1. **Fork** the repository and create your branch (`git checkout -b feature/amazing-feature`).
2. **Commit** your changes using conventional commits (`git commit -m 'feat: add amazing feature'`).
3. **Push** to the branch (`git push origin feature/amazing-feature`).
4. Open a **Pull Request** and ensure the GitHub Actions CI matrix passes on both macOS and Windows.

*Building an extension instead of modifying core? Check out [docs/PLUGIN_DEV.md](docs/PLUGIN_DEV.md) to learn about the sandbox API and manifest schema.*

## License

MIT © FlowState Desktop Contributors