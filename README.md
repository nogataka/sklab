# skillab

Skill Manager for coding agents — install and manage SKILL.md-based skills from GitHub.

Supports **Claude Code**, **Codex CLI**, **Gemini CLI**, **Cursor**, **Windsurf**, **Cline**, and **GitHub Copilot**.

## Install

```bash
npx skillab add <owner/repo>
```

Or install globally:

```bash
npm install -g skillab
```

## Supported Agents

```bash
skillab agents
```

| ID | Agent | Skills Directory |
|----|-------|-----------------|
| `claude` | Claude Code | `~/.claude/skills/` |
| `codex` | Codex CLI | `~/.codex/skills/` |
| `gemini` | Gemini CLI | `~/.gemini/skills/` |
| `cursor` | Cursor | `~/.cursor/skills/` |
| `windsurf` | Windsurf | `~/.windsurf/skills/` |
| `cline` | Cline | `~/.cline/skills/` |
| `copilot` | GitHub Copilot | `~/.copilot/skills/` |

## Commands

### `skillab add <owner/repo>`

Install skills from a GitHub repository.

```bash
# Install to Claude Code (default)
skillab add nogataka/SkillLab

# Install to a specific agent
skillab add nogataka/SkillLab --agent gemini

# Install to multiple agents
skillab add nogataka/SkillLab --agent claude,codex,gemini

# Install to all agents
skillab add nogataka/SkillLab --agent all

# Install a specific skill only
skillab add nogataka/SkillLab --skill playwright-cli --agent all
```

### `skillab list`

List installed skills.

```bash
skillab list                     # Claude Code (default)
skillab list --agent gemini      # Gemini CLI
skillab list --agent all         # All agents
skillab list --json              # JSON output
```

### `skillab remove <name>`

Remove an installed skill.

```bash
skillab remove playwright-cli
skillab remove playwright-cli --agent all --force
```

### `skillab update [name]`

Update skill(s) from their source repository.

```bash
skillab update                          # Update all in Claude Code
skillab update playwright-cli --agent all  # Update across all agents
```

### `skillab search <query>`

Search GitHub for skill repositories.

```bash
skillab search claude-skill
```

### `skillab agents`

List supported agents and detect which are installed on your machine.

## Options

All commands that operate on skills accept:

- `-t, --target <agents>` — Target agent(s) by ID, comma-separated, or `all`
- `-a, --agent <agents>` — Alias for `--target`

Default target is `claude` when not specified.

## License

MIT
