# Changelog

All notable changes to `dsh-plugin-antigravity-rules` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-11-08

### Changed
- Added `id-token: write` permissions to GitHub Actions workflow for npm Provenance and Trusted Publishing (OIDC).

## [1.0.0] - 2026-11-08

### Added
- Native support for Google Antigravity engineering rules in `.agents/rules/` and `~/.agents/rules/`.
- YAML frontmatter parser for `name`, `trigger`, `description`, and `globs`.
- Automatic system prompt injection for universal invariant rules (`trigger: always_on`).
- Dynamic catalog injection for domain-specific rules (`trigger: model_decision`).
- `antigravity_rule` tool for on-demand rule reading, listing, and runtime toggling.
- Automatic domain rule activation on file touch operations (`read`, `write`, `edit`).
- Settings page section in DeepSeek Harness Web UI with search, filtering, and enable/disable toggles.
- Runtime settings persistence to `.agents/rules/settings.json` without modifying rule files on disk.
