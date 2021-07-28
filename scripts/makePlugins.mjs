import { exec } from 'child_process';
import { forEach } from 'cypress/types/lodash';

const cmds = ['tsc .\\src\\js\\plugins\\atmosphere\\atmosphere.ts --module esnext --outDir .\\dist\\plugins\\atmosphere\\'];

forEach(cmds, (cmd) => {
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      // node couldn't execute the command
      return;
    }

    // the *entire* stdout and stderr (buffered)
    // console.log(`stdout: ${stdout}`);
    // console.log(`stderr: ${stderr}`);
  });
});
