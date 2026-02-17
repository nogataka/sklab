import { listInstalledSkills } from '../utils/skills.js';
import { resolveTargetsOrDefault, addTargetOption } from '../utils/agents.js';
import { info, table, dim, bold, error } from '../utils/ui.js';

export function registerList(program) {
  const cmd = program
    .command('list')
    .description('List installed skills')
    .option('--json', 'Output as JSON');
  addTargetOption(cmd)
    .action(async (opts) => {
      try {
        const targets = resolveTargetsOrDefault(opts);

        if (opts.json) {
          const result = {};
          for (const agent of targets) {
            result[agent.id] = await listInstalledSkills(agent.dir);
          }
          console.log(JSON.stringify(targets.length === 1 ? result[targets[0].id] : result, null, 2));
          return;
        }

        for (const agent of targets) {
          const skills = await listInstalledSkills(agent.dir);

          if (targets.length > 1) {
            console.log();
            console.log(bold(`  ${agent.name}`) + dim(` (${agent.dir})`));
          }

          if (skills.length === 0) {
            info('No skills installed.');
            continue;
          }

          table(
            skills.map(s => [
              bold(s.name),
              s.source || dim('(local)'),
              s.commit ? s.commit.slice(0, 7) : dim('—'),
            ]),
            ['Name', 'Source', 'Commit'],
          );
        }
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });
}
