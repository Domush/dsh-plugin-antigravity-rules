# dsh-plugin-antigravity-rules

[![npm version](https://img.shields.io/npm/v/dsh-plugin-antigravity-rules.svg)](https://www.npmjs.com/package/dsh-plugin-antigravity-rules)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Native Google Antigravity engineering rules loader and runtime enforcement engine for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

---

## Overview & Antigravity Compatibility

`dsh-plugin-antigravity-rules` brings first-class support for **Google Antigravity rules** to DeepSeek Harness:

- **100% Compatible with Existing Antigravity Installs**: Operates directly on your existing `.agents/rules/` workspace directory and `~/.agents/rules/` user directory without converting, modifying, or duplicating files.
- **Zero Disk Mutation**: Rule enablement and toggle preferences are stored in an auxiliary `.agents/rules/settings.json` file. All `.agents/rules/*.md` files remain completely read-only and fully interoperable with Antigravity environments.
- **Native YAML Frontmatter Parsing**: Understands Antigravity frontmatter attributes (`name`, `trigger`, `description`, `globs`, and `priority`).

---

## Key Features

1. **Always-On Rules Enforcement (`trigger: always_on`)**:
   Automatically loads universal engineering invariants (e.g. `coding-standards.md`) and injects them directly into the agent's system prompt on every turn—preventing architectural drift without manual file inspection.

2. **Domain Rules Catalog (`trigger: model_decision`)**:
   Catalogs all domain-specific standards (e.g., `ui-standards.md`, `assets-standards.md`, `testing-standards.md`) with their descriptions and file paths in the system prompt so the agent is continuously aware of governing domain rules.

3. **Automated Glob & Domain File Activation**:
   Monitors file touch operations (`read`, `write`, `edit`). When a touched file matches a rule's explicit `globs` or standard domain patterns (e.g. `Assets/UI/**` -> `ui-standards`), the relevant rule is dynamically activated for the remainder of the session.

4. **`antigravity_rule` Tool**:
   Provides agents and users with a dedicated tool to read, list, and toggle rules on demand:
   - `antigravity_rule(action: "list")`
   - `antigravity_rule(name: "ui-standards")`
   - `antigravity_rule(action: "toggle", name: "tactics-standards", enabled: false)`

5. **Web Settings UI**:
   Adds a dedicated **Rules** tab to the DeepSeek Harness Settings page featuring:
   - Live rule status (Invariant vs Domain).
   - Real-time search across rule names, file paths, and descriptions.
   - Interactive enable/disable switches with optimistic UI updates.

6. **Hot-Reloading**:
   Monitors file modification timestamps (`mtime`) and refreshes rules in-memory immediately when edited on disk.

---

## Installation

### From NPM (Recommended)
Add the plugin to your DeepSeek Harness profile dependencies:

```json
{
  "dependencies": {
    "dsh-plugin-antigravity-rules": "^1.0.0"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "dsh-plugin-antigravity-rules"
      ]
    }
  }
}
```

Or install it via the DeepSeek Harness Plugin Manager:
```bash
dsh plugin install dsh-plugin-antigravity-rules
```

---

## Configuration

In your profile's `cordis.patch.yml`:

```yaml
- insert:
    - id: antigravity-rules
      name: 'dsh-plugin-antigravity-rules'
      config:
        enabled: true
        rulesDir: '.agents/rules'
        includeAlwaysOnInSystemPrompt: true
        includeCatalogInSystemPrompt: true
        autoActivateOnGlobMatch: true
```

### Configuration Options

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | Master switch for Google Antigravity rules support. |
| `rulesDir` | `string` | `".agents/rules"` | Relative workspace path to rules directory. |
| `includeAlwaysOnInSystemPrompt` | `boolean` | `true` | Automatically inject always-on rules into system prompt. |
| `includeCatalogInSystemPrompt` | `boolean` | `true` | Inject domain catalog into system prompt. |
| `autoActivateOnGlobMatch` | `boolean` | `true` | Auto-activate rules when matching files are accessed. |

---

## License

[MIT](LICENSE) © 2026 Phillip Webber (Domush)
