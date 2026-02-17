import fs from 'node:fs/promises';
import { parseOwnerRepo, getRepoInfo, downloadAndExtract } from '../utils/github.js';
import {
  detectSkills,
  installSkill,
  readManifest,
  writeManifest,
  listInstalledSkills,
} from '../utils/skills.js';
import { resolveTargetsOrDefault, addTargetOption } from '../utils/agents.js';
import { info, success, warn, error, bold, dim, spinner } from '../utils/ui.js';

export function registerUpdate(program) {
  const cmd = program
    .command('update [name]')
    .description('Update skill(s) from their source repository');
  addTargetOption(cmd)
    .action(async (name, opts) => {
      try {
        await updateCommand(name, opts);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });
}

async function updateCommand(name, opts) {
  const targets = resolveTargetsOrDefault(opts);

  // Collect all (source, skillName, agent) tuples to update
  const updates = []; // { source, skillName, agent }
  for (const agent of targets) {
    const manifest = await readManifest(agent.dir);
    const installed = await listInstalledSkills(agent.dir);

    if (name) {
      const skill = installed.find(s => s.name === name);
      if (!skill) {
        if (targets.length === 1) throw new Error(`Skill "${name}" is not installed.`);
        continue;
      }
      if (!manifest.skills[name]?.source) {
        if (targets.length === 1) throw new Error(`Skill "${name}" has no source repository recorded.`);
        continue;
      }
      updates.push({ source: manifest.skills[name].source, skillName: name, agent });
    } else {
      for (const s of installed) {
        if (manifest.skills[s.name]?.source) {
          updates.push({ source: manifest.skills[s.name].source, skillName: s.name, agent });
        }
      }
    }
  }

  if (updates.length === 0) {
    warn('No updatable skills found.');
    return;
  }

  // Group by source repo to download each repo only once
  const byRepo = new Map();
  for (const u of updates) {
    if (!byRepo.has(u.source)) byRepo.set(u.source, []);
    byRepo.get(u.source).push(u);
  }

  for (const [source, entries] of byRepo) {
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

      // Group entries by agent to batch manifest writes
      const byAgent = new Map();
      for (const e of entries) {
        if (!byAgent.has(e.agent.id)) byAgent.set(e.agent.id, { agent: e.agent, names: [] });
        byAgent.get(e.agent.id).names.push(e.skillName);
      }

      for (const { agent, names } of byAgent.values()) {
        const manifest = await readManifest(agent.dir);
        const label = targets.length > 1 ? ` ${dim(`[${agent.name}]`)}` : '';

        for (const skillName of names) {
          if (manifest.skills[skillName]?.commit === repoInfo.commit) {
            info(`${bold(skillName)}: already up to date${label}`);
            continue;
          }

          const found = skills.find(s => s.name === skillName);
          if (!found) {
            warn(`Skill "${skillName}" no longer exists in ${source}. Skipping.`);
            continue;
          }

          await installSkill(found.dir, skillName, agent.dir);
          manifest.skills[skillName] = {
            source,
            installedAt: new Date().toISOString(),
            commit: repoInfo.commit,
          };
          success(`Updated ${bold(skillName)} → ${repoInfo.commit}${label}`);
        }

        await writeManifest(manifest, agent.dir);
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}
