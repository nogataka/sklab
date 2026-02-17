# skillab

Claude Code Skill Manager — install and manage skills from GitHub.

## Install

```bash
npx skillab add <owner/repo>
```

Or install globally:

```bash
npm install -g skillab
```

## Commands

### `skillab add <owner/repo>`

Install skills from a GitHub repository.

```bash
skillab add nogataka/SkillLab                     # install all skills from repo
skillab add nogataka/SkillLab --skill playwright-cli  # install specific skill
skillab add nogataka/SkillLab --force             # overwrite without confirmation
```

### `skillab list`

List installed skills.

```bash
skillab list          # table format
skillab list --json   # JSON output
```

### `skillab remove <name>`

Remove an installed skill.

```bash
skillab remove playwright-cli
skillab remove playwright-cli --force   # skip confirmation
```

### `skillab update [name]`

Update skill(s) from their source repository.

```bash
skillab update                  # update all skills
skillab update playwright-cli   # update specific skill
```

### `skillab search <query>`

Search GitHub for skill repositories.

```bash
skillab search claude-skill
```

## How It Works

Skills are installed to `~/.claude/skills/<name>/`. Each skill directory contains a `SKILL.md` file with YAML frontmatter defining the skill's name and description.

A manifest file at `~/.claude/skills/.sklab.json` tracks which skills were installed by skillab, their source repository, and commit hash, enabling updates.

## License

MIT
