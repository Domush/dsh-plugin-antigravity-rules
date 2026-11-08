# Contributing to dsh-plugin-antigravity-rules

Thank you for your interest in contributing to `dsh-plugin-antigravity-rules`! We welcome bug reports, improvements, and feature contributions.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Domush/dsh-plugin-antigravity-rules.git
   cd dsh-plugin-antigravity-rules
   ```

2. **Link into DeepSeek Harness:**
   To test changes locally in DeepSeek Harness, link the package in your DSH profile `package.json`:
   ```json
   {
     "dependencies": {
       "dsh-plugin-antigravity-rules": "link:/path/to/dsh-plugin-antigravity-rules"
     }
   }
   ```
   Or use the DSH plugin manager / Cordis patch layer.

## Guidelines

- **Compatibility First**: Maintain strict backwards compatibility with standard Google Antigravity `.agents/rules/` Markdown and frontmatter formats.
- **Zero Disk Mutation**: Never modify rule files on disk when toggling state; persist runtime preferences to `.agents/rules/settings.json`.
- **Code Style**: Use ES modules (`import`/`export`), clean vanilla JavaScript/React without heavy build steps, and clear comments.
- **Pull Requests**: Submit clear, atomic PRs with descriptive titles and explanations of the problem being solved.

## Reporting Issues

If you encounter unexpected behavior, please open an issue on GitHub with:
1. Steps to reproduce.
2. DSH version and platform details.
3. Relevant error logs or console output.
