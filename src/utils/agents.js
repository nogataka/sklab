import path from 'node:path';
import fs from 'node:fs/promises';

const HOME = process.env.HOME;

/**
 * Registry of coding agents that support SKILL.md-based skills.
 * Each entry defines the user-level skills directory path.
 */
const AGENTS = [
  { id: 'claude',   name: 'Claude Code',    dir: path.join(HOME, '.claude', 'skills') },
  { id: 'codex',    name: 'Codex CLI',      dir: path.join(HOME, '.codex', 'skills') },
  { id: 'gemini',   name: 'Gemini CLI',     dir: path.join(HOME, '.gemini', 'skills') },
  { id: 'cursor',   name: 'Cursor',         dir: path.join(HOME, '.cursor', 'skills') },
  { id: 'windsurf', name: 'Windsurf',       dir: path.join(HOME, '.windsurf', 'skills') },
  { id: 'cline',    name: 'Cline',          dir: path.join(HOME, '.cline', 'skills') },
  { id: 'copilot',  name: 'GitHub Copilot', dir: path.join(HOME, '.copilot', 'skills') },
];

/**
 * Get all known agents.
 */
export function getAllAgents() {
  return AGENTS;
}

/**
 * Get agent IDs as a comma-separated string for help text.
 */
export function agentChoices() {
  return AGENTS.map(a => a.id).join(', ') + ', all';
}

/**
 * Add --target and --agent options to a command.
 */
export function addTargetOption(cmd) {
  const desc = `Target agent(s): ${agentChoices()} (default: claude)`;
  return cmd
    .option('-t, --target <agents>', desc)
    .option('-a, --agent <agents>', desc);
}

/**
 * Resolve --target or --agent option to an array of agent objects.
 * Accepts: a single agent id, comma-separated ids, or "all".
 * Defaults to "claude" if not specified.
 */
export function resolveTargets(opts) {
  const targetStr = (typeof opts === 'string') ? opts : (opts?.agent || opts?.target);
  if (!targetStr) return [AGENTS[0]]; // default: claude

  const ids = targetStr.split(',').map(s => s.trim().toLowerCase());

  if (ids.includes('all')) return [...AGENTS];

  const resolved = [];
  for (const id of ids) {
    const agent = AGENTS.find(a => a.id === id);
    if (!agent) {
      throw new Error(
        `Unknown agent "${id}". Available: ${agentChoices()}`,
      );
    }
    resolved.push(agent);
  }
  return resolved;
}

/**
 * Detect which agents are actually installed on this machine
 * by checking if their parent config directory exists.
 */
export async function detectInstalledAgents() {
  const installed = [];
  for (const agent of AGENTS) {
    const parentDir = path.dirname(agent.dir);
    try {
      await fs.access(parentDir);
      installed.push(agent);
    } catch {
      // not installed
    }
  }
  return installed;
}
