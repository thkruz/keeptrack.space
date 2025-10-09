import { exec } from 'child_process';

export const openFile = (filePath: string) => {
  const platform = process.platform;

  let command: string;

  if (platform === 'win32') {
    command = `start "" "${filePath}"`;
  } else if (platform === 'darwin') {
    command = `open "${filePath}"`;
  } else {
    command = `xdg-open "${filePath}"`;
  }

  exec(command);
};
