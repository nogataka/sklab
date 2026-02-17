import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';

const HOME = process.env.HOME;
const DEFAULT_SKILLS_DIR = path.join(HOME, '.claude', 'skills');

/**
 * Get the manifest path for a given skills directory.
 */
export function getManifestPath(skillsDir = DEFAULT_SKILLS_DIR) {
  return path.join(skillsDir, '.sklab.json');
}

export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Read the .sklab.json manifest from a skills directory.
 */
export async function readManifest(skillsDir = DEFAULT_SKILLS_DIR) {
  try {
    const data = await fs.readFile(getManifestPath(skillsDir), 'utf8');
    return JSON.parse(data);
  } catch {
    return { version: 1, skills: {} };
  }
}

/**
 * Write the .sklab.json manifest to a skills directory.
 */
export async function writeManifest(manifest, skillsDir = DEFAULT_SKILLS_DIR) {
  await ensureDir(skillsDir);
  await fs.writeFile(getManifestPath(skillsDir), JSON.stringify(manifest, null, 2) + '\n');
}

/**
 * Parse YAML frontmatter from a SKILL.md file.
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
      skills.push({ name, description: meta?.description || '', dir });
      return;
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
 * List installed skills from a skills directory, enriched with manifest data.
 */
export async function listInstalledSkills(skillsDir = DEFAULT_SKILLS_DIR) {
  await ensureDir(skillsDir);
  const manifest = await readManifest(skillsDir);
  let entries;
  try {
    entries = await fs.readdir(skillsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;

    const skillDir = path.join(skillsDir, entry.name);
    const skillMdPath = path.join(skillDir, 'SKILL.md');

    let meta = {};
    try {
      const content = await fs.readFile(skillMdPath, 'utf8');
      meta = parseFrontmatter(content) || {};
    } catch {
      // no SKILL.md
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
 * Copy a skill directory to <skillsDir>/<name>/ atomically.
 */
export async function installSkill(sourceDir, name, skillsDir = DEFAULT_SKILLS_DIR) {
  await ensureDir(skillsDir);
  const target = path.join(skillsDir, name);
  const tmp = target + '.tmp.' + Date.now();

  await copyDir(sourceDir, tmp);

  try {
    await fs.rm(target, { recursive: true, force: true });
  } catch {
    // ignore
  }

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
export async function removeSkill(name, skillsDir = DEFAULT_SKILLS_DIR) {
  const target = path.join(skillsDir, name);
  await fs.rm(target, { recursive: true, force: true });

  const manifest = await readManifest(skillsDir);
  delete manifest.skills[name];
  await writeManifest(manifest, skillsDir);
}
