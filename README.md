# skillab

Skill Manager for coding agents — install and manage SKILL.md-based skills from GitHub.

```
npx skillab add nogataka/SkillLab
```

7つの主要コーディングエージェントに対応しています。

- Claude Code
- OpenAI Codex CLI
- Google Gemini CLI
- Cursor
- Windsurf
- Cline
- GitHub Copilot

## What is a Skill?

スキル（Skill）は、AIコーディングエージェントに特定の専門知識やワークフローを教えるための仕組みです。実体は `SKILL.md` というMarkdownファイル（YAML frontmatter付き）で、エージェントが従うべき手順・制約・ルールなどが記述されています。

```
~/.claude/skills/playwright-cli/
├── SKILL.md          # スキル定義（名前・説明・手順）
└── references/       # 補足資料（任意）
    ├── session-management.md
    └── test-generation.md
```

各エージェントは `SKILL.md` を読み取り、ユーザーの指示に応じてスキルを自動的に適用します。skillab はこの `SKILL.md` を GitHub リポジトリからダウンロードし、各エージェントのスキルディレクトリに配置するツールです。

## Install

Node.js 18 以上が必要です。

### npx で直接実行（インストール不要）

```bash
npx skillab add <owner/repo>
```

### グローバルインストール

```bash
npm install -g skillab
skillab add <owner/repo>
```

## Quick Start

```bash
# 1. スキルをインストール
npx skillab add nogataka/SkillLab --skill playwright-cli

# 2. インストール済みスキルを確認
npx skillab list

# 3. Claude Code で利用開始
#    /playwright-cli のようにスラッシュコマンドで呼び出せます
```

## Supported Agents

skillab は [Agent Skills 標準](https://agentskills.io/specification)（SKILL.md）に対応した7つのコーディングエージェントをサポートしています。

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

`skillab agents` を実行すると、マシン上でどのエージェントが検出されたかも表示されます。

## Agent Selection

### Interactive mode（デフォルト）

`--agent` を指定せずに `skillab add` を実行すると、インタラクティブなチェックボックスUIが表示されます。マシン上で検出されたエージェントが自動でチェックされた状態で表示されるので、インストール先を選んで Enter を押すだけです。

```
? Select target agents (↑↓ navigate, space select, enter confirm)
 ❯ ■ Claude Code    ~/.claude/skills
   ■ Codex CLI      ~/.codex/skills
   ■ Gemini CLI     ~/.gemini/skills
   ■ Cursor         ~/.cursor/skills
   □ Windsurf       ~/.windsurf/skills
   □ Cline          ~/.cline/skills
   ■ GitHub Copilot ~/.copilot/skills
   5 selected
```

| Key | Action |
|-----|--------|
| `↑` `↓` / `j` `k` | カーソル移動 |
| `Space` | 選択のトグル |
| `a` | 全選択 / 全解除 |
| `Enter` | 確定してインストール開始 |
| `q` / `Ctrl+C` | 中断 |

### CLI option で指定

スクリプトや CI/CD で使う場合は `--agent`（`-a`）で明示指定できます。

```bash
# 単一エージェント
skillab add nogataka/SkillLab --agent gemini

# 複数エージェント（カンマ区切り）
skillab add nogataka/SkillLab --agent claude,codex,gemini

# 全エージェントに一括インストール
skillab add nogataka/SkillLab --agent all
```

`--target`（`-t`）は `--agent` のエイリアスです。

## Commands

### `skillab add <owner/repo>`

GitHub リポジトリからスキルをダウンロードしてインストールします。

```bash
# リポジトリ内の全スキルをインストール
skillab add nogataka/SkillLab

# 特定のスキルのみインストール
skillab add nogataka/SkillLab --skill playwright-cli

# 確認なしで上書き
skillab add nogataka/SkillLab --force

# 全エージェントに特定のスキルをインストール
skillab add nogataka/SkillLab --skill playwright-cli --agent all --force
```

処理の流れ:

1. GitHub API でリポジトリ情報と最新コミットSHAを取得
2. tarball をダウンロードして展開
3. `SKILL.md` を持つディレクトリをスキルとして検出
4. 選択されたエージェントのスキルディレクトリにコピー
5. `.sklab.json` manifest にソース・コミット・日時を記録

| Option | Description |
|--------|-------------|
| `-s, --skill <name>` | 特定のスキルのみインストール |
| `-f, --force` | 既存スキルを確認なしで上書き |
| `-a, --agent <agents>` | インストール先エージェントを指定 |

### `skillab list`

インストール済みスキルの一覧を表示します。

```bash
# Claude Code のスキル一覧（デフォルト）
skillab list

# 特定のエージェント
skillab list --agent gemini

# 全エージェントのスキル一覧
skillab list --agent all

# JSON 形式で出力（スクリプト連携向け）
skillab list --json
```

### `skillab remove <name>`

インストール済みスキルを削除します。スキルディレクトリと manifest エントリの両方が削除されます。

```bash
# 削除（確認あり）
skillab remove playwright-cli

# 確認なしで削除
skillab remove playwright-cli --force

# 全エージェントから削除
skillab remove playwright-cli --agent all --force
```

### `skillab update [name]`

インストール済みスキルをソースリポジトリの最新版に更新します。

```bash
# Claude Code の全スキルを更新
skillab update

# 特定のスキルを更新
skillab update playwright-cli

# 全エージェントで更新
skillab update --agent all
```

同じリポジトリから複数のスキルがインストールされている場合、リポジトリのダウンロードは1回だけ行われます。すでに最新のコミットと一致している場合はスキップされます。

### `skillab search <query>`

GitHub で SKILL.md を含むリポジトリを検索します。

```bash
skillab search claude-skill
skillab search playwright
```

### `skillab agents`

サポート対象のエージェント一覧と、マシン上での検出状態を表示します。

```bash
skillab agents
```

```
 ID       │ Agent          │ Skills Directory   │ Detected
──────────┼────────────────┼────────────────────┼──────────
 claude   │ Claude Code    │ ~/.claude/skills   │ ✔
 codex    │ Codex CLI      │ ~/.codex/skills    │ ✔
 gemini   │ Gemini CLI     │ ~/.gemini/skills   │ ✔
 cursor   │ Cursor         │ ~/.cursor/skills   │ ✔
 windsurf │ Windsurf       │ ~/.windsurf/skills │ —
 cline    │ Cline          │ ~/.cline/skills    │ —
 copilot  │ GitHub Copilot │ ~/.copilot/skills  │ ✔
```

## Manifest

skillab は各エージェントのスキルディレクトリに `.sklab.json` を作成し、インストール元の情報を記録します。これにより `skillab update` でソースリポジトリからの更新が可能になります。

```json
{
  "version": 1,
  "skills": {
    "playwright-cli": {
      "source": "nogataka/SkillLab",
      "installedAt": "2026-02-17T12:00:00.000Z",
      "commit": "e60e8c1"
    }
  }
}
```

手動でインストールしたスキル（manifest に記録がないもの）は `skillab list` には表示されますが、`skillab update` の対象にはなりません。

## GitHub Token

パブリックリポジトリであれば認証なしで利用できます。プライベートリポジトリや API レート制限を回避する場合は、環境変数 `GITHUB_TOKEN` または `GH_TOKEN` を設定してください。

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
skillab add myorg/private-skills
```

## License

MIT
