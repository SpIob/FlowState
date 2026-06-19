# FlowState Plugin Development Guide

Welcome to the FlowState Plugin ecosystem. FlowState is a local-first, cognitive state management system. Because user focus and local codebases are highly sensitive, our plugin architecture is strictly sandboxed and permission-gated. 

This guide covers the manifest schema, sandbox API, permission model, and debugging tips for building FlowState extensions.

## 1. The Manifest Schema

Every plugin must be registered with the FlowState backend using a JSON manifest. This manifest defines your plugin's identity, entry point, and the permissions it requires.

```json
{
  "id": "my-awesome-plugin",
  "name": "Awesome Plugin",
  "version": "1.0.0",
  "entry_point": "https://my-cdn.com/plugin-bundle.js",
  "permissions": ["db:query", "file:read"],
  "description": "A brief description of what your plugin does."
}
```

### Field Definitions
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | A unique, kebab-case identifier for your plugin. |
| `name` | `string` | The human-readable name displayed in the UI. |
| `version` | `string` | Must follow strict Semantic Versioning (e.g., `1.0.0`). |
| `entry_point` | `string` | URL to your bundled JS/HTML. Local dev allows `file://` or inline HTML. |
| `permissions` | `string[]` | Array of scopes your plugin needs (see Permission Model below). |
| `description` | `string` | A short summary shown in the Plugin Marketplace UI. |

---

## 2. The Sandbox API

FlowState plugins run inside a strictly isolated `<iframe>` with the `sandbox="allow-scripts"` attribute. 

### What you CAN do:
- Execute JavaScript.
- Render custom UI inside the iframe.
- Communicate with the host FlowState application via the `window.postMessage` bridge.
- Make network requests to external APIs (if granted permission).

### What you CANNOT do:
- Access the parent FlowState DOM, cookies, or `localStorage`.
- Execute top-level navigation (`window.top.location = ...`).
- Open pop-ups.
- Directly access the local file system or SQLite database (must use the permission bridge).

---

## 3. The Permission Model

Because the iframe is sandboxed, it cannot call Tauri's Rust backend directly. Instead, it must request permissions from the host application. When a user grants a permission, the decision is permanently recorded in FlowState's immutable `plugin_audit_log` SQLite table.

### Available Scopes
| Scope | Description |
| :--- | :--- |
| `db:query` | Allows the plugin to execute read-only `SELECT` queries against the FlowState SQLite database (e.g., reading cognitive signal data). |
| `file:read` | Allows the plugin to read the contents of files within the currently opened workspace. |
| `network:request` | Allows the plugin to make outbound HTTP requests to external APIs. |

### How to Request a Permission

Send a message to the parent window using `window.postMessage`:

```javascript
// Requesting a permission
window.parent.postMessage({
  type: 'REQUEST_PERMISSION',
  pluginId: 'my-awesome-plugin', // Must match your manifest ID
  permission: 'db:query'
}, '*');
```

### How to Listen for the Decision

FlowState will display a modal to the user. Once they click "Grant" or "Deny", the host will post a message back to your iframe:

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'PERMISSION_RESPONSE') {
    if (event.data.granted) {
      console.log(`✅ Permission ${event.data.permission} granted!`);
      // Proceed with your privileged action
    } else {
      console.log(`❌ Permission ${event.data.permission} denied by user.`);
      // Show fallback UI
    }
  }
});
```

---

## 4. Debugging Tips

1. **Inspecting the Iframe:** In the FlowState DevTools (`Cmd+Option+I`), you can inspect the plugin iframe by selecting it from the element tree. Console logs from the plugin will appear in the main DevTools console, prefixed by the iframe context.
2. **Verifying Permissions:** Switch to the built-in **DATABASE** tab in FlowState. Query the `plugin_audit_log` table to see exactly when your plugin requested permissions and whether the user granted them:
   ```sql
   SELECT * FROM plugin_audit_log WHERE plugin_id = 'my-awesome-plugin';
   ```
3. **Local Development:** During development, you can pass raw HTML as the `entry_point` via the FlowState internal registry to avoid setting up a local dev server.