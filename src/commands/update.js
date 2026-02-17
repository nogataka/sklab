import fs from 'node:fs/promises';
import { parseOwnerRepo, getRepoInfo, downloadAndExtract } from '../utils/github.js';
import {
  detectSkills,
  installSkill,
  readManifest,
  writeManifest,
  listInstalledSkills,
} from '../utils/skills.js';
import { info, success, warn, error, bold, spinner } from '../utils/ui.js';

export function registerUpdate(program) {
  program
    .command('update [name]')
    .description('Update skill(s) from their source repository')
    .action(async (name) => {
      try {
        await updateCommand(name);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });
}

async function updateCommand(name) {
  const manifest = await readManifest();
  const installed = await listInstalledSkills();

  // Determine which skills to update
  let targets;
  if (name) {
    const skill = installed.find(s => s.name === name);
    if (!skill) {
      throw new Error(`Skill "${name}" is not installed.`);
    }
    if (!manifest.skills[name]?.source) {
      throw new Error(`Skill "${name}" has no source repository recorded. Cannot update.`);
    }
    targets = [{ name, source: manifest.skills[name].source }];
  } else {
    // Update all skills that have a source
    targets = installed
      .filter(s => manifest.skills[s.name]?.source)
      .map(s => ({ name: s.name, source: manifest.skills[s.name].source }));

    if (targets.length === 0) {
      warn('No updatable skills found (none have a source repository recorded).');
      return;
    }
  }

  // Group by source repo to avoid downloading the same repo multiple times
  const byRepo = new Map();
  for (const t of targets) {
    if (!byRepo.has(t.source)) byRepo.set(t.source, []);
    byRepo.get(t.source).push(t.name);
  }

  for (const [source, skillNames] of byRepo) {
    const { owner, repo } = parseOwnerRepo(source);

    const spin = spinner(`Fetching ${source}...`);
    let repoInfo;
    try {
      repoInfo = await getRepoInfo(owner, repo);
      spin.stop();
    } catch (err) {
      spin.fail(`Failed to fetch ${source}: ${err.message}`);
      continue;
    }

    // Check if already up to date
    const allUpToDate = skillNames.every(
      n => manifest.skills[n]?.commit === repoInfo.commit,
    );
    if (allUpToDate) {
      info(`${bold(source)}: already up to date (${repoInfo.commit})`);
      continue;
    }

    const spin2 = spinner('Downloading...');
    let extractDir, tmpDir;
    try {
      ({ extractDir, tmpDir } = await downloadAndExtract(owner, repo, repoInfo.defaultBranch));
      spin2.stop();
    } catch (err) {
      spin2.fail();
      error(`Failed to download ${source}: ${err.message}`);
      continue;
    }

    try {
      const skills = await detectSkills(extractDir);

      for (const skillName of skillNames) {
        const found = skills.find(s => s.name === skillName);
        if (!found) {
          warn(`Skill "${skillName}" no longer exists in ${source}. Skipping.`);
          continue;
        }

        await installSkill(found.dir, skillName);
        manifest.skills[skillName] = {
          source,
          installedAt: new Date().toISOString(),
          commit: repoInfo.commit,
        };
        success(`Updated ${bold(skillName)} → ${repoInfo.commit}`);
      }

      await writeManifest(manifest);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
