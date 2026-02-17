import { removeSkill, listInstalledSkills } from '../utils/skills.js';
import { success, error, warn, bold, confirm } from '../utils/ui.js';

export function registerRemove(program) {
  program
    .command('remove <name>')
    .description('Remove an installed skill')
    .option('-f, --force', 'Remove without confirmation')
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
  const skills = await listInstalledSkills();
  const skill = skills.find(s => s.name === name);

  if (!skill) {
    throw new Error(
      `Skill "${name}" is not installed. Run ${bold('skillab list')} to see installed skills.`,
    );
  }

  if (!opts.force) {
    const ok = await confirm(`Remove skill "${name}"?`);
    if (!ok) {
      warn('Cancelled.');
      return;
    }
  }

  await removeSkill(name);
  success(`Removed ${bold(name)}`);
}
