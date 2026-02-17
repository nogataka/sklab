import { listInstalledSkills } from '../utils/skills.js';
import { info, table, dim, bold } from '../utils/ui.js';

export function registerList(program) {
  program
    .command('list')
    .description('List installed skills')
    .option('--json', 'Output as JSON')
    .action(async (opts) => {
      const skills = await listInstalledSkills();

      if (opts.json) {
        console.log(JSON.stringify(skills, null, 2));
        return;
      }

      if (skills.length === 0) {
        info('No skills installed. Run ' + bold('skillab add <owner/repo>') + ' to install one.');
        return;
      }

      table(
        skills.map(s => [
          bold(s.name),
          s.source || dim('(local)'),
          s.commit ? s.commit.slice(0, 7) : dim('—'),
        ]),
        ['Name', 'Source', 'Commit'],
      );
    });
}
