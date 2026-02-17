import path from 'node:path';
import fs from 'node:fs/promises';
import { multiSelect, info } from './ui.js';

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
 * Returns null if not specified (caller should use interactive selection).
 */
export function resolveTargets(opts) {
  const targetStr = (typeof opts === 'string') ? opts : (opts?.agent || opts?.target);
  if (!targetStr) return null; // not specified — caller decides

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
 * Resolve targets with interactive fallback.
 * If --agent/--target is specified, use it directly.
 * Otherwise, show interactive agent selector.
 */
export async function resolveTargetsInteractive(opts) {
  const explicit = resolveTargets(opts);
  if (explicit) return explicit;

  // Interactive mode: detect installed agents, show selector
  const installed = await detectInstalledAgents();

  if (installed.length === 0) {
    info('No coding agents detected. Installing to Claude Code (default).');
    return [AGENTS[0]];
  }

  if (installed.length === 1) {
    return installed;
  }

  const items = AGENTS.map(agent => ({
    label: agent.name,
    description: agent.dir.replace(HOME, '~'),
    checked: installed.some(a => a.id === agent.id),
    agent,
  }));

  const selectedIndices = await multiSelect(
    'Select target agents',
    items,
  );

  if (selectedIndices.length === 0) {
    info('No agents selected. Installing to Claude Code (default).');
    return [AGENTS[0]];
  }

  return selectedIndices.map(i => items[i].agent);
}

/**
 * Resolve targets, defaulting to claude (non-interactive).
 * Use for commands like list/remove/update where interactive selection
 * is less useful.
 */
export function resolveTargetsOrDefault(opts) {
  return resolveTargets(opts) || [AGENTS[0]];
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
