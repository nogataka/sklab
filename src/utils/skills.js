import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

const SKILLS_DIR = path.join(process.env.HOME, '.claude', 'skills');
const MANIFEST_PATH = path.join(SKILLS_DIR, '.sklab.json');

export function getSkillsDir() {
  return SKILLS_DIR;
}

export function getManifestPath() {
  return MANIFEST_PATH;
}

export async function ensureSkillsDir() {
  await fs.mkdir(SKILLS_DIR, { recursive: true });
}

/**
 * Read the .sklab.json manifest.
 */
export async function readManifest() {
  try {
    const data = await fs.readFile(MANIFEST_PATH, 'utf8');
    return JSON.parse(data);
  } catch {
    return { version: 1, skills: {} };
  }
}

/**
 * Write the .sklab.json manifest.
 */
export async function writeManifest(manifest) {
  await ensureSkillsDir();
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

/**
 * Parse YAML frontmatter from a SKILL.md file.
 * Returns { name, description, ...rest } or null.
 */
export function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  try {
    return yaml.load(match[1]);
  } catch {
    return null;
  }
}

/**
 * Detect skills in a directory by finding SKILL.md files.
 * Returns array of { name, description, dir } objects.
 */
export async function detectSkills(baseDir) {
  const skills = [];

  async function scan(dir, depth) {
    if (depth > 3) return;
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    const hasSkillMd = entries.some(e => e.isFile() && e.name === 'SKILL.md');
    if (hasSkillMd) {
      const content = await fs.readFile(path.join(dir, 'SKILL.md'), 'utf8');
      const meta = parseFrontmatter(content);
      const name = meta?.name || path.basename(dir);
      skills.push({
        name,
        description: meta?.description || '',
        dir,
      });
      return; // don't recurse into a skill directory
    }

    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        await scan(path.join(dir, entry.name), depth + 1);
      }
    }
  }

  await scan(baseDir, 0);
  return skills;
}

/**
 * List installed skills from the skills directory, enriched with manifest data.
 */
export async function listInstalledSkills() {
  await ensureSkillsDir();
  const manifest = await readManifest();
  const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });

  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const skillDir = path.join(SKILLS_DIR, entry.name);
    const skillMdPath = path.join(skillDir, 'SKILL.md');

    let meta = {};
    try {
      const content = await fs.readFile(skillMdPath, 'utf8');
      meta = parseFrontmatter(content) || {};
    } catch {
      // no SKILL.md, use directory name
    }

    const manifestEntry = manifest.skills[entry.name] || null;

    skills.push({
      name: entry.name,
      description: meta.description || '',
      source: manifestEntry?.source || '',
      commit: manifestEntry?.commit || '',
      installedAt: manifestEntry?.installedAt || '',
    });
  }

  return skills;
}

/**
 * Copy a skill directory to ~/.claude/skills/<name>/ atomically.
 */
export async function installSkill(sourceDir, name) {
  await ensureSkillsDir();
  const target = path.join(SKILLS_DIR, name);
  const tmp = target + '.tmp.' + Date.now();

  // Copy to tmp
  await copyDir(sourceDir, tmp);

  // Remove existing if present
  try {
    await fs.rm(target, { recursive: true, force: true });
  } catch {
    // ignore
  }

  // Atomic rename
  await fs.rename(tmp, target);
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Remove a skill directory and its manifest entry.
 */
export async function removeSkill(name) {
  const target = path.join(SKILLS_DIR, name);
  await fs.rm(target, { recursive: true, force: true });

  const manifest = await readManifest();
  delete manifest.skills[name];
  await writeManifest(manifest);
}
