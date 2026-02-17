import { getAllAgents, detectInstalledAgents } from '../utils/agents.js';
import { table, bold, dim } from '../utils/ui.js';

export function registerAgents(program) {
  program
    .command('agents')
    .description('List supported coding agents and their skill directories')
    .action(async () => {
      const all = getAllAgents();
      const installed = await detectInstalledAgents();
      const installedIds = new Set(installed.map(a => a.id));

      table(
        all.map(a => [
          bold(a.id),
          a.name,
          a.dir.replace(process.env.HOME, '~'),
          installedIds.has(a.id) ? '✔' : dim('—'),
        ]),
        ['ID', 'Agent', 'Skills Directory', 'Detected'],
      );
    });
}
