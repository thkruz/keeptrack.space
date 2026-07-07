import { createInterface } from 'node:readline/promises';

/**
 * Ask a yes/no question. Returns true immediately when `assumeYes` is set or
 * stdin is not a TTY (CI), so automated flows never hang. Interactive users get
 * a real prompt defaulting to No.
 */
export async function confirm(question: string, assumeYes: boolean): Promise<boolean> {
  if (assumeYes || !process.stdin.isTTY) {
    return true;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    const answer = (await rl.question(`${question} [y/N] `)).trim().toLowerCase();

    return answer === 'y' || answer === 'yes';
  } finally {
    rl.close();
  }
}
