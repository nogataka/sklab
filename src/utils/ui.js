import pc from 'picocolors';
import * as readline from 'node:readline';

export function info(msg) {
  console.log(pc.blue('ℹ'), msg);
}

export function success(msg) {
  console.log(pc.green('✔'), msg);
}

export function warn(msg) {
  console.log(pc.yellow('⚠'), msg);
}

export function error(msg) {
  console.error(pc.red('✖'), msg);
}

export function dim(msg) {
  return pc.dim(msg);
}

export function bold(msg) {
  return pc.bold(msg);
}

export function table(rows, headers) {
  if (rows.length === 0) return;

  const cols = headers.length;
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length))
  );

  const sep = widths.map(w => '─'.repeat(w + 2)).join('┼');
  const fmt = (row) =>
    row.map((cell, i) => ` ${String(cell ?? '').padEnd(widths[i])} `).join('│');

  console.log(pc.bold(fmt(headers)));
  console.log(sep);
  rows.forEach(row => console.log(fmt(row)));
}

export async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${pc.yellow('?')} ${question} ${pc.dim('[y/N]')} `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Interactive multi-select checkbox prompt.
 * items: [{ label, description?, checked? }]
 * Returns array of selected indices.
 */
export async function multiSelect(title, items) {
  const selected = items.map(item => item.checked ?? false);
  let cursor = 0;

  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    const wasRaw = stdin.isRaw;

    if (!stdin.isTTY) {
      // Non-interactive: return pre-checked items
      resolve(items.map((_, i) => i).filter(i => selected[i]));
      return;
    }

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    function render() {
      // Move cursor up to clear previous render
      if (cursor >= 0) {
        stdout.write(`\x1b[${items.length + 2}A`);
      }

      stdout.write(`\x1b[2K${pc.cyan('?')} ${pc.bold(title)} ${pc.dim('(↑↓ navigate, space select, enter confirm)')}\n`);

      for (let i = 0; i < items.length; i++) {
        const isCursor = i === cursor;
        const isSelected = selected[i];
        const checkbox = isSelected ? pc.green('■') : pc.dim('□');
        const label = isCursor ? pc.cyan(items[i].label) : items[i].label;
        const desc = items[i].description ? pc.dim(` ${items[i].description}`) : '';
        const pointer = isCursor ? pc.cyan('❯') : ' ';
        stdout.write(`\x1b[2K ${pointer} ${checkbox} ${label}${desc}\n`);
      }

      const count = selected.filter(Boolean).length;
      stdout.write(`\x1b[2K  ${pc.dim(`${count} selected`)}\n`);
    }

    // Initial render - print blank lines first so cursor-up works
    for (let i = 0; i < items.length + 2; i++) stdout.write('\n');
    render();

    function onKey(key) {
      // Up arrow or k
      if (key === '\x1b[A' || key === 'k') {
        cursor = (cursor - 1 + items.length) % items.length;
        render();
      }
      // Down arrow or j
      else if (key === '\x1b[B' || key === 'j') {
        cursor = (cursor + 1) % items.length;
        render();
      }
      // Space - toggle
      else if (key === ' ') {
        selected[cursor] = !selected[cursor];
        render();
      }
      // Enter - confirm
      else if (key === '\r' || key === '\n') {
        cleanup();
        const result = items.map((_, i) => i).filter(i => selected[i]);
        resolve(result);
      }
      // a - select all / deselect all
      else if (key === 'a') {
        const allSelected = selected.every(Boolean);
        selected.fill(!allSelected);
        render();
      }
      // Ctrl+C or q - abort
      else if (key === '\x03' || key === 'q') {
        cleanup();
        process.exit(0);
      }
    }

    function cleanup() {
      stdin.removeListener('data', onKey);
      stdin.setRawMode(wasRaw ?? false);
      stdin.pause();
    }

    stdin.on('data', onKey);
  });
}

export function spinner(msg) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  const id = setInterval(() => {
    process.stderr.write(`\r${pc.cyan(frames[i++ % frames.length])} ${msg}`);
  }, 80);

  return {
    stop(finalMsg) {
      clearInterval(id);
      process.stderr.write(`\r${' '.repeat(msg.length + 4)}\r`);
      if (finalMsg) success(finalMsg);
    },
    fail(finalMsg) {
      clearInterval(id);
      process.stderr.write(`\r${' '.repeat(msg.length + 4)}\r`);
      if (finalMsg) error(finalMsg);
    },
  };
}
