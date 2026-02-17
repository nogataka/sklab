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
