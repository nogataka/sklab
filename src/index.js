import { program } from 'commander';
import { createRequire } from 'node:module';
import { registerAdd } from './commands/add.js';
import { registerList } from './commands/list.js';
import { registerRemove } from './commands/remove.js';
import { registerUpdate } from './commands/update.js';
import { registerSearch } from './commands/search.js';
import { registerAgents } from './commands/agents.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json');

program
  .name('skillab')
  .description('Skill Manager for coding agents — install and manage skills from GitHub')
  .version(pkg.version);

registerAdd(program);
registerList(program);
registerRemove(program);
registerUpdate(program);
registerSearch(program);
registerAgents(program);

program.parse();
