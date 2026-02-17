import { searchRepos } from '../utils/github.js';
import { info, error, bold, dim, table } from '../utils/ui.js';

export function registerSearch(program) {
  program
    .command('search <query>')
    .description('Search GitHub for skill repositories')
    .option('-r, --repo <owner/repo>', 'Search within a specific repository')
    .action(async (query, opts) => {
      try {
        await searchCommand(query, opts);
      } catch (err) {
        error(err.message);
        process.exit(1);
      }
    });
}

async function searchCommand(query, opts) {
  const results = await searchRepos(query, { repo: opts.repo });

  if (results.length === 0) {
    info('No repositories found.');
    return;
  }

  table(
    results.map(r => [
      bold(r.fullName),
      truncate(r.description, 50),
      `★ ${r.stars}`,
    ]),
    ['Repository', 'Description', 'Stars'],
  );

  console.log();
  info(`Install with: ${bold('sklab add <owner/repo>')}`);
}

function truncate(str, len) {
  if (!str) return dim('—');
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}
