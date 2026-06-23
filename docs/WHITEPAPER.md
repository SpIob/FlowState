# The FlowState Methodology

FlowState is not an editor that manages cognitive state as a feature. It is a cognitive state management system that contains an editor. 

## The Problem: Fragmented Attention
Modern development requires context-switching across 9 to 12 distinct tools. Every alt-tab, notification, and UI shift exacts a cognitive tax. Standard editors measure lines of code; FlowState measures the human writing them.

## The Cognitive Engine
FlowState passively measures cognitive load through local behavioral signals. No cameras, no biometrics, no telemetry. Just the rhythm of your work:
- **Keystroke velocity:** Sustained high-speed typing indicates deep flow.
- **Error rate & backspace latency:** Spikes indicate cognitive overload or context confusion.
- **Pause proportion:** Micro-pauses vs. macro-pauses reveal fatigue vs. deep thought.
- **Context switches:** Frequency of file-jumping indicates fragmented attention.

These signals are weighted and combined into a real-time **Cognitive Load Score** (0–100). 

## The Intervention
When your score indicates deep flow, FlowState can automatically trigger OS-level Focus Mode (macOS/Windows) to block system notifications. Simultaneously, the UI progressively simplifies—hiding secondary panels and reducing visual noise to protect your attention.

## The Plugin Sandbox
Community extensions are powerful, but they must never compromise your focus or your data. FlowState plugins run inside strictly isolated `<iframe>` sandboxes. They cannot access your file system, database, or network without explicit, user-granted permissions. Every permission grant is permanently recorded in an immutable SQLite audit log.

**All local. No cloud. No telemetry.**