window.__ModuleLoader__.load({
  id: "dsh-plugin-antigravity-rules",
  factory(require) {
    const React = require("react");
    const h = React.createElement;
    const { useState, useEffect, useCallback, useMemo } = React;

    const CSS_STYLES = `
      .agr-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        color: var(--dsw-alias-label-primary, #ffffff);
        font-family: inherit;
        padding: 4px 0;
      }
      .agr-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding-bottom: 12px;
        border-bottom: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.1));
      }
      .agr-title {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        color: var(--dsw-alias-label-primary, #ffffff);
      }
      .agr-subtitle {
        font-size: 13px;
        color: var(--dsw-alias-label-secondary, rgba(255, 255, 255, 0.6));
        margin: 0;
        line-height: 1.4;
      }
      .agr-toolbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
      }
      .agr-search-input {
        flex: 1;
        min-width: 200px;
        height: 32px;
        padding: 0 10px;
        background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.05));
        border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.15));
        border-radius: 6px;
        color: var(--dsw-alias-label-primary, #ffffff);
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s;
      }
      .agr-search-input:focus {
        border-color: var(--dsw-alias-brand-primary, #247bbf);
      }
      .agr-filter-group {
        display: flex;
        gap: 6px;
      }
      .agr-filter-btn {
        height: 28px;
        padding: 0 10px;
        border-radius: 4px;
        font-size: 12px;
        border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.15));
        background: transparent;
        color: var(--dsw-alias-label-secondary, rgba(255, 255, 255, 0.7));
        cursor: pointer;
        transition: all 0.2s;
      }
      .agr-filter-btn:hover {
        background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.08));
        color: var(--dsw-alias-label-primary, #ffffff);
      }
      .agr-filter-btn.active {
        background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.15));
        color: var(--dsw-alias-label-primary, #ffffff);
        border-color: var(--dsw-alias-brand-primary, #247bbf);
        font-weight: 500;
      }
      .agr-stats {
        font-size: 12px;
        color: var(--dsw-alias-label-secondary, rgba(255, 255, 255, 0.6));
        display: flex;
        gap: 12px;
      }
      .agr-stat-pill {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .agr-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 520px;
        overflow-y: auto;
        padding-right: 4px;
      }
      .agr-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 14px;
        background: var(--dsw-alias-bg-layer-1, rgba(255, 255, 255, 0.03));
        border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.08));
        border-radius: 8px;
        gap: 12px;
        transition: all 0.2s;
        position: relative;
      }
      .agr-item:hover {
        background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.06));
        border-color: var(--dsw-alias-border-l2, rgba(255, 255, 255, 0.15));
      }
      .agr-item.disabled {
        opacity: 0.65;
        background: transparent;
      }
      .agr-item-main {
        display: flex;
        flex-direction: column;
        gap: 4px;
        flex: 1;
        min-width: 0;
      }
      .agr-item-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .agr-item-name {
        font-size: 14px;
        font-weight: 600;
        color: var(--dsw-alias-label-primary, #ffffff);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .agr-badge {
        font-size: 11px;
        padding: 1px 6px;
        border-radius: 4px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .agr-badge-always-on {
        background: rgba(36, 123, 191, 0.2);
        color: #58a6ff;
        border: 1px solid rgba(56, 139, 253, 0.3);
      }
      .agr-badge-model-decision {
        background: rgba(139, 148, 158, 0.15);
        color: #8b949e;
        border: 1px solid rgba(139, 148, 158, 0.25);
      }
      .agr-item-path {
        font-size: 11px;
        color: var(--dsw-alias-label-secondary, rgba(255, 255, 255, 0.5));
        font-family: monospace;
      }
      .agr-item-desc {
        font-size: 12px;
        color: var(--dsw-alias-label-secondary, rgba(255, 255, 255, 0.7));
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: help;
      }
      .agr-tooltip-trigger {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.2));
        color: var(--dsw-alias-label-secondary, rgba(255, 255, 255, 0.8));
        font-size: 10px;
        font-weight: bold;
        cursor: help;
        margin-left: 4px;
        position: relative;
      }
      .agr-tooltip-trigger:hover .agr-tooltip-popup {
        display: block;
      }
      .agr-tooltip-popup {
        display: none;
        position: absolute;
        bottom: 22px;
        left: 50%;
        transform: translateX(-50%);
        background: #1c2128;
        color: #f0f6fc;
        border: 1px solid #30363d;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 12px;
        font-weight: normal;
        line-height: 1.4;
        width: 280px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        z-index: 1000;
        pointer-events: none;
      }
      .agr-tooltip-popup::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #30363d transparent transparent transparent;
      }
      .agr-toggle-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .agr-toggle-label {
        font-size: 12px;
        font-weight: 500;
        min-width: 54px;
        text-align: right;
      }
      .agr-toggle-label.enabled {
        color: var(--dsw-alias-state-success-primary, #3fb950);
      }
      .agr-toggle-label.disabled {
        color: var(--dsw-alias-label-secondary, rgba(255, 255, 255, 0.4));
      }
      .agr-switch {
        position: relative;
        display: inline-block;
        width: 38px;
        height: 22px;
        flex-shrink: 0;
      }
      .agr-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      .agr-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(255, 255, 255, 0.15);
        border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.2));
        transition: 0.2s;
        border-radius: 22px;
      }
      .agr-slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background-color: #ffffff;
        transition: 0.2s;
        border-radius: 50%;
      }
      .agr-switch input:checked + .agr-slider {
        background-color: var(--dsw-alias-brand-primary, #247bbf);
        border-color: var(--dsw-alias-brand-primary, #247bbf);
      }
      .agr-switch input:checked + .agr-slider:before {
        transform: translateX(16px);
      }
      .agr-empty {
        padding: 30px;
        text-align: center;
        color: var(--dsw-alias-label-secondary, rgba(255, 255, 255, 0.5));
        font-size: 14px;
      }
      .agr-refresh-btn {
        padding: 4px 10px;
        background: transparent;
        border: 1px solid var(--dsw-alias-border-l1, rgba(255, 255, 255, 0.15));
        border-radius: 4px;
        color: var(--dsw-alias-label-secondary, rgba(255, 255, 255, 0.7));
        cursor: pointer;
        font-size: 12px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .agr-refresh-btn:hover {
        background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.1));
        color: var(--dsw-alias-label-primary, #ffffff);
      }
    `;

    function buildUrl(base) {
      let url = base;
      try {
        const boot = window.__DSH_BOOT__;
        const bootCwd = boot?.workspace?.path || boot?.cwd;
        if (bootCwd) url += "?cwd=" + encodeURIComponent(bootCwd);
      } catch {}
      return url;
    }

    /** Navigation Icon component for the Rules tab in Settings */
    function RulesSectionIcon(props) {
      const size = props.size || 16;
      const active = Boolean(props.active);
      return h(
        "svg",
        {
          viewBox: "0 0 24 24",
          width: size,
          height: size,
          fill: "none",
          stroke: "currentColor",
          strokeWidth: 2,
          strokeLinecap: "round",
          strokeLinejoin: "round",
          style: { display: "block", opacity: active ? 1 : 0.75 },
          "aria-hidden": true
        },
        h("path", { d: "M12 2L2 7l10 5 10-5-10-5z" }),
        h("path", { d: "M2 17l10 5 10-5" }),
        h("path", { d: "M2 12l10 5 10-5" }),
        h("circle", { cx: 12, cy: 12, r: 3, fill: "currentColor", fillOpacity: 0.3 })
      );
    }

    /** Settings Section component for Google Antigravity Rules */
    function RulesSettingsSection() {
      const [rules, setRules] = useState([]);
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      const [searchQuery, setSearchQuery] = useState("");
      const [filterTrigger, setFilterTrigger] = useState("all");
      const [toggling, setToggling] = useState({});

      const fetchRules = useCallback(async () => {
        try {
          setLoading(true);
          setError(null);
          const res = await fetch(buildUrl("/api/antigravity-rules"));
          if (!res.ok) throw new Error("HTTP " + res.status);
          const data = await res.json();
          if (data && data.rules) {
            setRules(data.rules);
          }
        } catch (err) {
          setError(String(err?.message || err));
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => {
        fetchRules();
      }, [fetchRules]);

      const handleToggle = async (rule) => {
        const nextEnabled = !rule.enabled;
        setToggling((prev) => ({ ...prev, [rule.name]: true }));

        // Optimistic update
        setRules((prev) =>
          prev.map((r) => (r.name === rule.name ? { ...r, enabled: nextEnabled } : r))
        );

        try {
          const res = await fetch(buildUrl("/api/antigravity-rules"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: rule.name, enabled: nextEnabled })
          });
          const data = await res.json();
          if (!res.ok || !data.ok) {
            throw new Error(data?.error || "Failed to update rule");
          }
        } catch (err) {
          // Rollback on failure
          setRules((prev) =>
            prev.map((r) => (r.name === rule.name ? { ...r, enabled: !nextEnabled } : r))
          );
          alert("Failed to toggle rule: " + (err?.message || err));
        } finally {
          setToggling((prev) => ({ ...prev, [rule.name]: false }));
        }
      };

      const filteredRules = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return rules.filter((rule) => {
          if (filterTrigger === "always_on" && rule.trigger !== "always_on") return false;
          if (filterTrigger === "model_decision" && rule.trigger === "always_on") return false;
          if (!query) return true;
          return (
            rule.name.toLowerCase().includes(query) ||
            rule.path.toLowerCase().includes(query) ||
            (rule.description && rule.description.toLowerCase().includes(query))
          );
        });
      }, [rules, searchQuery, filterTrigger]);

      const counts = useMemo(() => {
        let total = rules.length;
        let enabled = 0;
        let alwaysOn = 0;
        for (const r of rules) {
          if (r.enabled) enabled++;
          if (r.trigger === "always_on") alwaysOn++;
        }
        return { total, enabled, disabled: total - enabled, alwaysOn };
      }, [rules]);

      return h(
        "div",
        { className: "agr-container" },
        h("style", { key: "agr-styles" }, CSS_STYLES),

        // Header
        h(
          "div",
          { className: "agr-header" },
          h("h2", { className: "agr-title" }, "Google Antigravity Rules"),
          h(
            "p",
            { className: "agr-subtitle" },
            "Detected engineering rules under .agents/rules. Hover over rules for descriptions, and toggle them on or off individually without modifying files on disk."
          )
        ),

        // Toolbar
        h(
          "div",
          { className: "agr-toolbar" },
          h("input", {
            type: "text",
            className: "agr-search-input",
            placeholder: "Search rules by name, path, or description...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value)
          }),
          h(
            "div",
            { className: "agr-filter-group" },
            h(
              "button",
              {
                type: "button",
                className: "agr-filter-btn" + (filterTrigger === "all" ? " active" : ""),
                onClick: () => setFilterTrigger("all")
              },
              `All (${counts.total})`
            ),
            h(
              "button",
              {
                type: "button",
                className: "agr-filter-btn" + (filterTrigger === "always_on" ? " active" : ""),
                onClick: () => setFilterTrigger("always_on")
              },
              `Invariant (${counts.alwaysOn})`
            ),
            h(
              "button",
              {
                type: "button",
                className: "agr-filter-btn" + (filterTrigger === "model_decision" ? " active" : ""),
                onClick: () => setFilterTrigger("model_decision")
              },
              `Domain (${counts.total - counts.alwaysOn})`
            ),
            h(
              "button",
              {
                type: "button",
                className: "agr-refresh-btn",
                title: "Refresh rules from disk",
                onClick: fetchRules
              },
              "↻ Refresh"
            )
          )
        ),

        // Status stats
        h(
          "div",
          { className: "agr-stats" },
          h("span", { className: "agr-stat-pill" }, `Active: ${counts.enabled}`),
          h("span", { className: "agr-stat-pill" }, `Disabled: ${counts.disabled}`)
        ),

        // Loading / Error
        loading && h("div", { className: "agr-empty" }, "Loading rules from workspace..."),
        error && h("div", { className: "agr-empty", style: { color: "#f85149" } }, `Error loading rules: ${error}`),

        // Rules List
        !loading &&
          !error &&
          h(
            "div",
            { className: "agr-list" },
            filteredRules.length === 0
              ? h("div", { className: "agr-empty" }, "No matching rules found.")
              : filteredRules.map((rule) => {
                  const isAlwaysOn = rule.trigger === "always_on";
                  const isPending = Boolean(toggling[rule.name]);

                  return h(
                    "div",
                    {
                      key: rule.name,
                      className: "agr-item" + (!rule.enabled ? " disabled" : ""),
                      title: rule.description || rule.name
                    },
                    h(
                      "div",
                      { className: "agr-item-main" },
                      h(
                        "div",
                        { className: "agr-item-title-row" },
                        h("span", { className: "agr-item-name" }, rule.name),
                        h(
                          "span",
                          {
                            className:
                              "agr-badge " +
                              (isAlwaysOn ? "agr-badge-always-on" : "agr-badge-model-decision")
                          },
                          isAlwaysOn ? "Always On" : "Model Decision"
                        ),
                        rule.description &&
                          h(
                            "span",
                            {
                              className: "agr-tooltip-trigger",
                              title: rule.description
                            },
                            "?",
                            h("span", { className: "agr-tooltip-popup" }, rule.description)
                          )
                      ),
                      h("span", { className: "agr-item-path" }, rule.path),
                      rule.description &&
                        h(
                          "div",
                          {
                            className: "agr-item-desc",
                            title: rule.description
                          },
                          rule.description
                        )
                    ),
                    h(
                      "div",
                      { className: "agr-toggle-wrapper" },
                      h(
                        "span",
                        {
                          className:
                            "agr-toggle-label " + (rule.enabled ? "enabled" : "disabled")
                        },
                        rule.enabled ? "Enabled" : "Disabled"
                      ),
                      h(
                        "label",
                        {
                          className: "agr-switch",
                          title: rule.enabled ? "Click to disable rule" : "Click to enable rule"
                        },
                        h("input", {
                          type: "checkbox",
                          checked: rule.enabled,
                          disabled: isPending,
                          onChange: () => handleToggle(rule)
                        }),
                        h("span", { className: "agr-slider" })
                      )
                    )
                  );
                })
          )
      );
    }

    return {
      inject: ["slots"],
      apply(ctx) {
        ctx.slots.inject("settings.section", () =>
          ctx.slots.register(
            {
              name: "settings.section",
              id: "rules",
              order: 25,
              label: "Rules"
            },
            RulesSettingsSection
          )
        );

        ctx.slots.inject("settings.section.icon", () =>
          ctx.slots.register(
            {
              name: "settings.section.icon",
              id: "rules",
              order: 25
            },
            RulesSectionIcon
          )
        );
      }
    };
  }
});
