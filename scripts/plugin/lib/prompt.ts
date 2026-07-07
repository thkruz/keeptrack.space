/* eslint-disable no-console */
import { createInterface } from 'node:readline/promises';

async function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

/** Free-text prompt. Returns `def` immediately when stdin is not a TTY (CI). */
export async function promptText(label: string, def = ''): Promise<string> {
  if (!process.stdin.isTTY) {
    return def;
  }

  const answer = await ask(`${label}${def ? ` (${def})` : ''}: `);

  return answer || def;
}

export interface Choice {
  value: string;
  label: string;
}

/** Numbered single-select. Returns the default choice when stdin is not a TTY. */
export async function promptSelect(label: string, choices: Choice[], defIndex = 0): Promise<string> {
  if (!process.stdin.isTTY) {
    return choices[defIndex].value;
  }

  console.log(label);
  choices.forEach((c, i) => console.log(`  ${i + 1}) ${c.label}`));

  const answer = await ask(`Choose [1-${choices.length}] (${defIndex + 1}): `);
  const n = Number.parseInt(answer, 10);

  return n >= 1 && n <= choices.length ? choices[n - 1].value : choices[defIndex].value;
}
