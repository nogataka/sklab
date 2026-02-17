import { program } from 'commander';
import { createRequire } from 'node:module';
import { registerAdd } from './commands/add.js';
import { registerList } from './commands/list.js';
import { registerRemove } from './commands/remove.js';
import { registerUpdate } from './commands/update.js';
import { registerSearch } from './commands/search.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

program
  .name('skillab')
  .description('Claude Code Skill Manager — install and manage skills from GitHub')
  .version(pkg.version);

registerAdd(program);
registerList(program);
registerRemove(program);
registerUpdate(program);
registerSearch(program);

program.parse();
