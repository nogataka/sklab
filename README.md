# sklab

Claude Code Skill Manager — install and manage skills from GitHub.

## Install

```bash
npx sklab add <owner/repo>
```

Or install globally:

```bash
npm install -g sklab
```

## Commands

### `sklab add <owner/repo>`

Install skills from a GitHub repository.

```bash
sklab add nogataka/SkillLab                     # install all skills from repo
sklab add nogataka/SkillLab --skill playwright-cli  # install specific skill
sklab add nogataka/SkillLab --force             # overwrite without confirmation
```

### `sklab list`

List installed skills.

```bash
sklab list          # table format
sklab list --json   # JSON output
```

### `sklab remove <name>`

Remove an installed skill.

```bash
sklab remove playwright-cli
sklab remove playwright-cli --force   # skip confirmation
```

### `sklab update [name]`

Update skill(s) from their source repository.

```bash
sklab update                  # update all skills
sklab update playwright-cli   # update specific skill
```

### `sklab search <query>`

Search GitHub for skill repositories.

```bash
sklab search claude-skill
```

## How It Works

Skills are installed to `~/.claude/skills/<name>/`. Each skill directory contains a `SKILL.md` file with YAML frontmatter defining the skill's name and description.

A manifest file at `~/.claude/skills/.sklab.json` tracks which skills were installed by sklab, their source repository, and commit hash, enabling updates.

## License

MIT
