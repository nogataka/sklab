import { removeSkill, listInstalledSkills } from '../utils/skills.js';
import { resolveTargets, addTargetOption } from '../utils/agents.js';
import { success, error, warn, bold, dim, confirm } from '../utils/ui.js';

export function registerRemove(program) {
  const cmd = program
    .command('remove <name>')
    .description('Remove an installed skill')
    .option('-f, --force', 'Remove without confirmation');
  addTargetOption(cmd)
    .action(async (name, opts) => {
      try {
        await removeCommand(name, opts);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });
}

async function removeCommand(name, opts) {
  const targets = resolveTargets(opts);

  for (const agent of targets) {
    const label = targets.length > 1 ? ` ${dim(`[${agent.name}]`)}` : '';
    const skills = await listInstalledSkills(agent.dir);
    const skill = skills.find(s => s.name === name);

    if (!skill) {
      if (targets.length === 1) {
        throw new Error(
          `Skill "${name}" is not installed. Run ${bold('skillab list')} to see installed skills.`,
        );
      }
      warn(`Skill "${name}" not found in ${agent.name}, skipping.`);
      continue;
    }

    if (!opts.force) {
      const ok = await confirm(`Remove skill "${name}" from ${agent.name}?`);
      if (!ok) {
        warn('Cancelled.');
        continue;
      }
    }

    await removeSkill(name, agent.dir);
    success(`Removed ${bold(name)}${label}`);
  }
}
