import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";

export const name = "antigravity-rules";

// Attempt to load Schemastery from profile directory if available
let ConfigSchema = null;
try {
  const profileDir = process.env.DSH_PROFILE_DIR || path.join(os.homedir(), ".dsh", "profiles", "web");
  const req = createRequire(path.join(profileDir, "package.json"));
  const z = req("@deepseek-ai/schemastery");
  if (z && typeof z.object === "function") {
    ConfigSchema = z.object({
      enabled: z.boolean().default(true).description("Enable Google Antigravity rules support"),
      rulesDir: z.string().default(".agents/rules").description("Relative path to Antigravity rules directory"),
      includeAlwaysOnInSystemPrompt: z.boolean().default(true).description("Inject always_on rules into system prompt"),
      includeCatalogInSystemPrompt: z.boolean().default(true).description("Inject model_decision catalog into system prompt"),
      autoActivateOnGlobMatch: z.boolean().default(true).description("Automatically activate rules matching touched file globs")
    });
  }
} catch {
  // If schemastery cannot be loaded from profile, Cordis will pass config as plain object
}

export const Config = ConfigSchema;

export const inject = ["systemPrompt", "tools", "workingDirectory", "agents", "webServer", "workspaceRegistry", "connection"];

/** Validate whether a requested directory is an approved workspace */
function getApprovedWorkspace(ctx, requestedCwd) {
  const allowed = new Set();
  try {
    if (ctx.workspaceRegistry && typeof ctx.workspaceRegistry.list === "function") {
      for (const ws of ctx.workspaceRegistry.list()) {
        if (ws && ws.path) allowed.add(path.resolve(ws.path));
      }
    }
  } catch {}
  try {
    if (ctx.workingDirectory) {
      const cur = ctx.workingDirectory.get?.() || ctx.workingDirectory.current;
      if (cur) allowed.add(path.resolve(cur));
      if (ctx.workingDirectory.defaultDirectory) allowed.add(path.resolve(ctx.workingDirectory.defaultDirectory));
    }
  } catch {}
  allowed.add(path.resolve(process.cwd()));

  if (requestedCwd && typeof requestedCwd === "string") {
    const resolved = path.resolve(requestedCwd);
    if (allowed.has(resolved)) {
      return resolved;
    }
  }

  return Array.from(allowed)[0] || path.resolve(process.cwd());
}


/** Built-in heuristic domain glob mappings when frontmatter does not declare explicit globs */
const DEFAULT_DOMAIN_GLOBS = {
  "coding-standards": ["**/*.cs"],
  "ui-standards": ["**/*.uxml", "**/*.uss", "**/UI/**", "**/*HUD*.cs", "**/*Presenter*.cs"],
  "assets-standards": ["**/*.fbx", "**/*.blend", "**/*.obj", "**/Models/**", "**/Art/**", "**/Prefabs/**"],
  "audio-standards": ["**/*.wav", "**/*.mp3", "**/*.ogg", "**/Audio/**", "**/*Audio*.cs"],
  "datamod-standards": ["**/*.json", "**/*.yaml", "**/*.yml", "**/Data/**", "**/Catalogs/**"],
  "economy-standards": ["**/Economy/**", "**/*Economy*.cs", "**/*Market*.cs"],
  "galaxy-standards": ["**/Galaxy/**", "**/*Galaxy*.cs", "**/*Sector*.cs", "**/*Procedural*.cs"],
  "gdd-standards": ["GDD.md", "docs/**"],
  "narrative-standards": ["**/*.narrative.yaml", "**/*.quest.yaml", "**/Narrative/**", "**/*Dialogue*.cs"],
  "netcode-standards": ["**/Netcode/**", "**/*Network*.cs", "**/*Client*.cs", "**/*Server*.cs"],
  "systems-standards": ["**/Physics/**", "**/Systems/**", "**/*Flight*.cs", "**/*Inertia*.cs"],
  "tactics-standards": ["**/Tactics/**", "**/AI/**", "**/*Combat*.cs", "**/*NPBehave*.cs"],
  "testing-standards": ["**/Tests/**", "**/*Test*.cs", "**/*Tests*.cs"],
  "tools-standards": ["**/Editor/**", "**/Tools/**", "**/*Editor*.cs"],
  "vfx-standards": ["**/VFX/**", "**/*.shader", "**/*.shadergraph", "**/*.hlsl", "**/*VFX*.cs"],
  "agent-governance-standards": ["AGENTS.md", ".agents/**"]
};

/** Convert a glob pattern into a RegExp */
function globToRegex(glob) {
  const normalized = glob.replace(/\\/g, "/");
  let regexStr = "^";
  for (let i = 0; i < normalized.length; i++) {
    const c = normalized[i];
    if (c === "*" && normalized[i + 1] === "*") {
      regexStr += ".*";
      i++;
      if (normalized[i + 1] === "/") i++;
    } else if (c === "*") {
      regexStr += "[^/]*";
    } else if (c === "?") {
      regexStr += "[^/]";
    } else if (".+^$}{()|[]".includes(c)) {
      regexStr += "\\" + c;
    } else {
      regexStr += c;
    }
  }
  regexStr += "$";
  return new RegExp(regexStr, "i");
}

/** Robust YAML frontmatter parser */
function parseFrontmatter(rawContent) {
  const match = rawContent.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: rawContent.trim() };
  const rawYaml = match[1];
  const body = match[2].trim();
  const meta = {};
  const lines = rawYaml.split(/\r?\n/);
  let currentKey = null;
  let currentList = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    // Check list item
    if (line.startsWith("- ") && currentKey) {
      const val = line.slice(2).trim().replace(/^["'](.*)["']$/, "$1");
      if (!currentList) {
        currentList = [];
        meta[currentKey] = currentList;
      }
      currentList.push(val);
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      currentKey = line.slice(0, colonIdx).trim();
      currentList = null;
      let val = line.slice(colonIdx + 1).trim();
      if (val.startsWith("[") && val.endsWith("]")) {
        meta[currentKey] = val.slice(1, -1).split(",").map(s => s.trim().replace(/^["'](.*)["']$/, "$1")).filter(Boolean);
      } else if (val === "") {
        // May be followed by a list
      } else {
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        meta[currentKey] = val;
      }
    }
  }
  return { meta, body };
}

/** In-memory cache of parsed rules per absolute file path */
const fileRuleCache = new Map();

/** Scan and parse rules from a specific directory */
function scanRulesDirectory(dirPath, displayPrefix) {
  if (!fs.existsSync(dirPath)) return [];
  const entries = [];
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const fullPath = path.join(dirPath, file);
      try {
        const stats = fs.statSync(fullPath);
        if (!stats.isFile()) continue;

        const cached = fileRuleCache.get(fullPath);
        if (cached && cached.mtimeMs === stats.mtimeMs) {
          entries.push(cached.rule);
          continue;
        }

        const raw = fs.readFileSync(fullPath, "utf8");
        const { meta, body } = parseFrontmatter(raw);
        const name = String(meta.name || path.basename(file, ".md")).trim();
        const trigger = String(meta.trigger || "model_decision").trim().toLowerCase();
        const description = String(meta.description || "").trim();

        let globs = [];
        if (Array.isArray(meta.globs)) {
          globs = meta.globs.map(String);
        } else if (typeof meta.globs === "string" && meta.globs) {
          globs = [meta.globs];
        } else if (typeof meta.glob === "string" && meta.glob) {
          globs = [meta.glob];
        } else if (DEFAULT_DOMAIN_GLOBS[name]) {
          globs = [...DEFAULT_DOMAIN_GLOBS[name]];
        }

        const relativePath = path.join(displayPrefix, file).replace(/\\/g, "/");
        const rule = {
          name,
          trigger,
          description,
          globs,
          compiledGlobs: globs.map(globToRegex),
          content: body,
          fullPath,
          displayPath: relativePath
        };

        fileRuleCache.set(fullPath, { mtimeMs: stats.mtimeMs, rule });
        entries.push(rule);
      } catch {
        // Continue processing other rule files
      }
    }
  } catch {
    // Directory unreadable
  }
  return entries;
}

/** Resolve all candidate workspace directories */
function resolveCandidateDirectories(ctx, requestedCwd) {
  const candidates = new Set();
  if (requestedCwd && typeof requestedCwd === "string") {
    candidates.add(path.resolve(requestedCwd));
  }
  try {
    if (ctx.workspaceRegistry) {
      for (const ws of ctx.workspaceRegistry.list()) {
        if (ws && ws.path) candidates.add(path.resolve(ws.path));
      }
    }
  } catch {}
  try {
    if (ctx.agents) {
      for (const a of ctx.agents.list()) {
        try {
          const d = ctx.workingDirectory.get(a.session);
          if (d) candidates.add(path.resolve(d));
        } catch {}
      }
    }
  } catch {}
  try {
    if (ctx.workingDirectory && ctx.workingDirectory.defaultDirectory) {
      candidates.add(path.resolve(ctx.workingDirectory.defaultDirectory));
    }
  } catch {}
  candidates.add(process.cwd());
  return Array.from(candidates);
}

/** Find the active rules directory across candidate directories */
function findActiveRulesDir(ctx, requestedCwd, rulesSubDir) {
  const dirs = resolveCandidateDirectories(ctx, requestedCwd);
  for (const dir of dirs) {
    const candidateRulesDir = path.resolve(dir, rulesSubDir);
    if (fs.existsSync(candidateRulesDir)) {
      return { workspaceDir: dir, rulesDir: candidateRulesDir };
    }
  }
  const fallback = dirs[0] || process.cwd();
  return { workspaceDir: fallback, rulesDir: path.resolve(fallback, rulesSubDir) };
}

/** Get all available rules for a workspace directory */
function getAllRules(ctx, workspaceDir, rulesSubDir) {
  const rules = new Map();

  // 1. User-global rules: ~/.agents/rules
  const userRulesDir = path.join(os.homedir(), ".agents", "rules");
  for (const rule of scanRulesDirectory(userRulesDir, "~/.agents/rules")) {
    rules.set(rule.name, rule);
  }

  // 2. Project workspace rules
  const { rulesDir } = findActiveRulesDir(ctx, workspaceDir, rulesSubDir);
  for (const rule of scanRulesDirectory(rulesDir, rulesSubDir)) {
    rules.set(rule.name, rule); // Overrides same-named user-global rule
  }

  return Array.from(rules.values());
}

/** Persist enabled/disabled state without altering rule files */
function getSettingsPath(rulesDir) {
  return path.join(rulesDir, "settings.json");
}

function loadSettings(rulesDir) {
  const settingsPath = getSettingsPath(rulesDir);
  if (!fs.existsSync(settingsPath)) return { disabledRules: [] };
  try {
    return JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  } catch {
    return { disabledRules: [] };
  }
}

function saveSettings(rulesDir, settings) {
  const settingsPath = getSettingsPath(rulesDir);
  try {
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
  } catch {
    // Write failed
  }
}

/** Send JSON HTTP response */
function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

/** Collect bounded request body */
async function readBoundedBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.byteLength;
    if (size > 64 * 1024) {
      req.resume();
      return null;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const FILE_TOUCH_TOOLS = new Set(["read", "write", "edit"]);

export function apply(ctx, rawConfig) {
  const config = {
    enabled: rawConfig?.enabled ?? true,
    rulesDir: rawConfig?.rulesDir ?? ".agents/rules",
    includeAlwaysOnInSystemPrompt: rawConfig?.includeAlwaysOnInSystemPrompt ?? true,
    includeCatalogInSystemPrompt: rawConfig?.includeCatalogInSystemPrompt ?? true,
    autoActivateOnGlobMatch: rawConfig?.autoActivateOnGlobMatch ?? true
  };

  if (!config.enabled) return;

  const sessionActiveRules = new WeakMap();

  function getSessionSet(session) {
    if (!session) return new Set();
    let set = sessionActiveRules.get(session);
    if (!set) {
      set = new Set();
      sessionActiveRules.set(session, set);
    }
    return set;
  }

  // 1. System Prompt Section injection
  ctx.systemPrompt.section({
    name: "antigravity:rules",
    order: 85,
    interpolate: false,
    text: (context) => {
      if (!config.enabled) return "";
      const agent = context?.agent;
      const cwd = agent ? ctx.workingDirectory.get(agent.session) : process.cwd();
      const allRules = getAllRules(ctx, cwd, config.rulesDir);
      if (allRules.length === 0) return "";

      const { rulesDir } = findActiveRulesDir(ctx, cwd, config.rulesDir);
      const settings = loadSettings(rulesDir);
      const disabledRules = new Set(settings.disabledRules || []);

      const activeSet = agent ? getSessionSet(agent.session) : new Set();
      const alwaysOnRules = [];
      const activeLoadedRules = [];
      const catalogRules = [];

      for (const rule of allRules) {
        if (disabledRules.has(rule.name)) continue;

        if (rule.trigger === "always_on") {
          alwaysOnRules.push(rule);
        } else if (activeSet.has(rule.name)) {
          activeLoadedRules.push(rule);
        } else {
          catalogRules.push(rule);
        }
      }

      const sections = [];

      // Always-on rules
      if (config.includeAlwaysOnInSystemPrompt && alwaysOnRules.length > 0) {
        sections.push("# Google Antigravity Rules: Active Invariants (always_on)");
        sections.push("The following rules are mandatory engineering invariants that apply universally across every task:");
        for (const rule of alwaysOnRules) {
          sections.push(`\n## Rule: ${rule.name} (${rule.displayPath})\n${rule.content}`);
        }
      }

      // Active loaded domain rules
      if (activeLoadedRules.length > 0) {
        sections.push("\n# Google Antigravity Rules: Active Domain Standards");
        sections.push("The following domain rules have been activated for the current session:");
        for (const rule of activeLoadedRules) {
          sections.push(`\n## Rule: ${rule.name} (${rule.displayPath})\n${rule.content}`);
        }
      }

      // Catalog of available model_decision rules
      if (config.includeCatalogInSystemPrompt && catalogRules.length > 0) {
        sections.push("\n# Google Antigravity Rules: Available Domain Catalog (.agents/rules)");
        sections.push("The following domain standards are available in `.agents/rules/`. Before modifying files or starting tasks in a domain, use the `antigravity_rule` tool or the `read` tool to review the governing standards:");
        for (const rule of catalogRules) {
          const desc = rule.description ? `: ${rule.description}` : "";
          sections.push(`- \`${rule.name}\` (${rule.displayPath})${desc}`);
        }
      }

      return sections.join("\n");
    }
  });

  // 2. Define antigravity_rule Tool
  const ruleTool = {
    name: "antigravity_rule",
    description: "Read, list, enable, or disable native Google Antigravity rules under .agents/rules. Call this tool to inspect, read, or activate domain rules for your task.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Rule name or relative file path under .agents/rules (e.g. 'ui-standards', 'assets-standards', or '.agents/rules/ui-standards.md')."
        },
        action: {
          type: "string",
          description: "Action to perform: 'read' (default) to load and activate a rule, 'list' to catalog all available rules, or 'toggle' to enable/disable a rule.",
          enum: ["read", "list", "toggle"]
        },
        enabled: {
          type: "boolean",
          description: "For 'toggle' action: true to enable, false to disable."
        }
      }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          action: { type: "string" },
          rules: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                name: { type: "string" },
                trigger: { type: "string" },
                description: { type: "string" },
                path: { type: "string" },
                active: { type: "boolean" },
                enabled: { type: "boolean" }
              },
              required: ["name", "trigger", "description", "path", "active", "enabled"]
            }
          },
          rule: {
            type: "object",
            additionalProperties: false,
            properties: {
              name: { type: "string" },
              trigger: { type: "string" },
              description: { type: "string" },
              path: { type: "string" },
              content: { type: "string" },
              enabled: { type: "boolean" }
            },
            required: ["name", "trigger", "description", "path", "content", "enabled"]
          },
          message: { type: "string" }
        },
        required: ["action"]
      },
      render(args, value) {
        if (value.action === "list") {
          const lines = ["# Google Antigravity Rules Catalog", ""];
          for (const r of value.rules || []) {
            const status = r.active ? "[ACTIVE]" : "[AVAILABLE]";
            const enStatus = r.enabled ? "[ENABLED]" : "[DISABLED]";
            lines.push(`- **${r.name}** (${r.path}) [trigger: ${r.trigger}] ${status} ${enStatus}: ${r.description}`);
          }
          lines.push("", "Call `antigravity_rule` with `name` to load any rule into active session context, or `action: 'toggle'` to enable/disable.");
          return [{ type: "text", text: lines.join("\n") }];
        }
        if (value.rule) {
          return [{
            type: "text",
            text: [
              `<antigravity_rule_content name="${value.rule.name}">`,
              `<rule_metadata>`,
              `Trigger: ${value.rule.trigger}`,
              `Description: ${value.rule.description}`,
              `Path: ${value.rule.path}`,
              `Status: ACTIVE, ${value.rule.enabled ? "ENABLED" : "DISABLED"}`,
              `</rule_metadata>`,
              "",
              `<rule_instructions>`,
              value.rule.content,
              `</rule_instructions>`,
              `</antigravity_rule_content>`
            ].join("\n")
          }];
        }
        return [{ type: "text", text: value.message || "Rule operation completed." }];
      }
    },
    presentCall(args) {
      const isList = args?.action === "list" || !args?.name;
      const isToggle = args?.action === "toggle";
      let title = `Read Antigravity rule: ${args?.name || ""}`;
      if (isList) title = "List Antigravity rules";
      if (isToggle) title = `${args?.enabled ? "Enable" : "Disable"} Antigravity rule: ${args?.name || ""}`;
      return {
        card: "generic",
        title,
        kind: isToggle ? "execute" : "read",
        rawInput: args?.name || "all"
      };
    },
    async execute(args, exec) {
      const agent = exec.agent;
      const cwd = agent ? await ctx.workingDirectory.ensure(agent, exec.signal) : process.cwd();
      const allRules = getAllRules(ctx, cwd, config.rulesDir);
      const { rulesDir } = findActiveRulesDir(ctx, cwd, config.rulesDir);
      const settings = loadSettings(rulesDir);
      const disabledRules = new Set(settings.disabledRules || []);
      const session = agent?.session;
      const activeSet = getSessionSet(session);

      const action = args?.action || (args?.name ? "read" : "list");

      if (action === "toggle") {
        if (!args.name || args.enabled === undefined) throw new Error("toggle action requires 'name' and 'enabled' arguments");
        const ruleName = String(args.name).trim();
        const rule = allRules.find(r => r.name.toLowerCase() === ruleName.toLowerCase() || path.basename(r.fullPath, ".md").toLowerCase() === ruleName.toLowerCase());
        if (!rule) throw new Error(`Rule "${ruleName}" not found`);

        if (args.enabled) {
          disabledRules.delete(rule.name);
        } else {
          disabledRules.add(rule.name);
        }

        settings.disabledRules = Array.from(disabledRules);
        saveSettings(rulesDir, settings);
        return {
          action: "toggle",
          message: `Rule "${rule.name}" is now ${args.enabled ? "enabled" : "disabled"} in settings.json.`
        };
      }

      if (action === "list") {
        return {
          action: "list",
          rules: allRules.map(r => ({
            name: r.name,
            trigger: r.trigger,
            description: r.description,
            path: r.displayPath,
            active: !disabledRules.has(r.name) && (r.trigger === "always_on" || activeSet.has(r.name)),
            enabled: !disabledRules.has(r.name)
          }))
        };
      }

      const query = String(args.name).trim();
      const cleanQuery = query.toLowerCase().replace(/\\/g, "/");
      const matched = allRules.find(r => {
        if (r.name.toLowerCase() === cleanQuery) return true;
        if (path.basename(r.name.toLowerCase(), ".md") === cleanQuery) return true;
        if (r.displayPath.toLowerCase() === cleanQuery) return true;
        if (r.displayPath.toLowerCase().endsWith(cleanQuery)) return true;
        return false;
      });

      if (!matched) {
        const available = allRules.map(r => r.name).join(", ");
        throw new Error(`Rule "${query}" not found in ${config.rulesDir}. Available rules: ${available}`);
      }

      // Activate for session
      if (session) {
        activeSet.add(matched.name);
      }

      return {
        action: "read",
        rule: {
          name: matched.name,
          trigger: matched.trigger,
          description: matched.description,
          path: matched.displayPath,
          content: matched.content,
          enabled: !disabledRules.has(matched.name)
        }
      };
    }
  };

  ctx.tools.register(ruleTool);

  // 3. Auto-activation on file touch (read, write, edit)
  if (config.autoActivateOnGlobMatch) {
    ctx.on("tools/result", (exec, result) => {
      if (result.isError || !exec.agent || !FILE_TOUCH_TOOLS.has(exec.name)) return;
      const args = exec.arguments;
      if (!args || typeof args !== "object") return;
      const filePath = typeof args.file_path === "string" ? args.file_path.trim() : typeof args.path === "string" ? args.path.trim() : "";
      if (!filePath) return;

      const normalizedPath = filePath.replace(/\\/g, "/");
      const cwd = ctx.workingDirectory.get(exec.agent.session);
      const allRules = getAllRules(ctx, cwd, config.rulesDir);
      const activeSet = getSessionSet(exec.agent.session);
      const { rulesDir } = findActiveRulesDir(ctx, cwd, config.rulesDir);
      const settings = loadSettings(rulesDir);
      const disabledRules = new Set(settings.disabledRules || []);

      for (const rule of allRules) {
        if (disabledRules.has(rule.name) || rule.trigger === "always_on" || activeSet.has(rule.name)) continue;
        for (const regex of rule.compiledGlobs) {
          if (regex.test(normalizedPath) || regex.test(path.basename(normalizedPath))) {
            activeSet.add(rule.name);
            break;
          }
        }
      }
    });
  }

  // 4. HTTP API Endpoint for Settings UI
  if (ctx.webServer) {
    ctx.effect(() => ctx.webServer.register({
      kind: "exact",
      path: "/api/antigravity-rules",
      handler: async (req, res) => {
        try {
          if (ctx.connection && typeof ctx.connection.requestRejection === "function") {
            const rejection = ctx.connection.requestRejection(req);
            if (rejection !== void 0) {
              sendJson(res, rejection, { ok: false, error: rejection === 401 ? "Unauthorized" : "Forbidden" });
              return;
            }
          }

          const urlObj = new URL(String(req.url), "http://localhost");
          const rawCwd = urlObj.searchParams.get("cwd");
          if (rawCwd && getApprovedWorkspace(ctx, rawCwd) !== path.resolve(rawCwd)) {
            sendJson(res, 400, { ok: false, error: "Invalid or unregistered workspace path" });
            return;
          }
          const approvedCwd = getApprovedWorkspace(ctx, rawCwd);
          const { rulesDir } = findActiveRulesDir(ctx, approvedCwd, config.rulesDir);
          const allRules = getAllRules(ctx, approvedCwd, config.rulesDir);
          const settings = loadSettings(rulesDir);
          const disabledRules = new Set(settings.disabledRules || []);

          if (req.method === "GET") {
            const rules = allRules.map(r => ({
              name: r.name,
              trigger: r.trigger,
              description: r.description,
              path: r.displayPath,
              enabled: !disabledRules.has(r.name)
            }));
            sendJson(res, 200, { ok: true, rules });
            return;
          }

          if (req.method === "POST") {
            const contentType = req.headers["content-type"] || "";
            if (!contentType.includes("application/json")) {
              sendJson(res, 415, { ok: false, error: "Unsupported Media Type: expected application/json" });
              return;
            }
            const bodyText = await readBoundedBody(req);
            if (!bodyText) {
              sendJson(res, 400, { ok: false, error: "Empty or oversized request body" });
              return;
            }
            const data = JSON.parse(bodyText);
            const ruleName = String(data.name || "").trim();
            const enabled = Boolean(data.enabled);

            const rule = allRules.find(r => r.name.toLowerCase() === ruleName.toLowerCase() || path.basename(r.fullPath, ".md").toLowerCase() === ruleName.toLowerCase());
            if (!rule) {
              sendJson(res, 404, { ok: false, error: `Rule "${ruleName}" not found` });
              return;
            }

            if (enabled) {
              disabledRules.delete(rule.name);
            } else {
              disabledRules.add(rule.name);
            }

            settings.disabledRules = Array.from(disabledRules);
            saveSettings(rulesDir, settings);
            sendJson(res, 200, { ok: true, name: rule.name, enabled: !disabledRules.has(rule.name) });
            return;
          }

          res.statusCode = 405;
          res.setHeader("allow", "GET, POST");
          res.end();
        } catch (err) {
          sendJson(res, 500, { ok: false, error: String(err?.message || err) });
        }
      }
    }), "antigravity-rules: /api/antigravity-rules");
  }
}
