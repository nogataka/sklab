import fs from 'node:fs/promises';
import { parseOwnerRepo, getRepoInfo, downloadAndExtract } from '../utils/github.js';
import {
  detectSkills,
  installSkill,
  readManifest,
  writeManifest,
} from '../utils/skills.js';
import { resolveTargets, addTargetOption } from '../utils/agents.js';
import { info, success, warn, error, bold, dim, spinner, confirm } from '../utils/ui.js';
import path from 'node:path';

export function registerAdd(program) {
  const cmd = program
    .command('add <repo>')
    .description('Install skills from a GitHub repository (owner/repo)')
    .option('-s, --skill <name>', 'Install only a specific skill by name')
    .option('-f, --force', 'Overwrite existing skills without confirmation');
  addTargetOption(cmd)
    .action(async (repo, opts) => {
      try {
        await addCommand(repo, opts);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });
}

async function addCommand(repoStr, opts) {
  const { owner, repo } = parseOwnerRepo(repoStr);
  const targets = resolveTargets(opts);

  // Fetch repo info
  const spin = spinner(`Fetching ${owner}/${repo}...`);
  let repoInfo;
  try {
    repoInfo = await getRepoInfo(owner, repo);
    spin.stop();
  } catch (err) {
    spin.fail();
    throw err;
  }
  info(`Repository: ${bold(repoInfo.fullName)} (${repoInfo.defaultBranch}, ${repoInfo.commit})`);

  // Download and extract
  const spin2 = spinner('Downloading...');
  let extractDir, tmpDir;
  try {
    ({ extractDir, tmpDir } = await downloadAndExtract(owner, repo, repoInfo.defaultBranch));
    spin2.stop();
  } catch (err) {
    spin2.fail();
    throw err;
  }

  try {
    // Detect skills
    const skills = await detectSkills(extractDir);
    if (skills.length === 0) {
      warn('No skills found in this repository (no SKILL.md files detected).');
      return;
    }

    info(`Found ${skills.length} skill(s): ${skills.map(s => bold(s.name)).join(', ')}`);

    // Filter by --skill
    let toInstall = skills;
    if (opts.skill) {
      toInstall = skills.filter(s => s.name === opts.skill);
      if (toInstall.length === 0) {
        throw new Error(
          `Skill "${opts.skill}" not found. Available: ${skills.map(s => s.name).join(', ')}`,
        );
      }
    }

    // Install to each target agent
    for (const agent of targets) {
      const label = targets.length > 1 ? ` ${dim(`[${agent.name}]`)}` : '';

      const manifest = await readManifest(agent.dir);

      for (const skill of toInstall) {
        const targetDir = path.join(agent.dir, skill.name);
        let exists = false;
        try {
          await fs.access(targetDir);
          exists = true;
        } catch {
          // doesn't exist
        }

        if (exists && !opts.force) {
          const ok = await confirm(
            `Skill "${skill.name}" already exists in ${agent.name}. Overwrite?`,
          );
          if (!ok) {
            info(`Skipped ${bold(skill.name)}${label}`);
            continue;
          }
        }

        await installSkill(skill.dir, skill.name, agent.dir);

        manifest.skills[skill.name] = {
          source: `${owner}/${repo}`,
          installedAt: new Date().toISOString(),
          commit: repoInfo.commit,
        };

        success(`Installed ${bold(skill.name)}${label}`);
      }

      await writeManifest(manifest, agent.dir);
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}
