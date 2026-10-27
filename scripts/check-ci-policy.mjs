// Fails when a check step in the given workflow can be skipped by an earlier
// failure. Setup steps (`uses:`) stay fail-fast; every `run:` step must carry
// `if: ${{ !cancelled() }}`.
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/check-ci-policy.mjs <workflow.yml>');
  process.exit(2);
}

const steps = [];
for (const line of readFileSync(file, 'utf8').split('\n')) {
  const start = line.match(/^(\s*)- (\w+):/);
  if (start && (start[2] === 'name' || start[2] === 'uses' || start[2] === 'run')) {
    steps.push({ lines: [line.trim().slice(2)] });
  } else if (steps.length) {
    steps[steps.length - 1].lines.push(line.trim());
  }
}

const offenders = steps.filter(({ lines }) =>
  !lines.some((l) => l.startsWith('uses:')) &&
  lines.some((l) => l.startsWith('run:')) &&
  !lines.includes('if: ${{ !cancelled() }}'));

if (steps.length === 0) {
  console.error(`${file}: no steps found`);
  process.exit(1);
}
for (const { lines } of offenders) {
  console.error(`${file}: step "${lines[0].replace(/^name:\s*/, '')}" lacks if: \${{ !cancelled() }}`);
}
if (offenders.length) process.exit(1);
console.log(`${file}: ${steps.length} steps, every run step runs through failures`);
