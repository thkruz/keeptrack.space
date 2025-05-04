import { isThisNode } from '@app/static/isThisNode';
import { Engine } from './core/engine';

export class Tessa {
  static readonly id = 'Tessa';
  private static readonly defaultCanvas: string = 'keeptrack-canvas';
  static instance: Engine | null = null; // NOSONAR

  constructor() {
    Tessa.printConsoleMessage_();
  }

  static getInstance() {
    Tessa.instance ??= new Engine({
      canvasId: isThisNode() ? Tessa.defaultCanvas : 'keeptrack-canvas',
    });

    return Tessa.instance;
  }

  private static printConsoleMessage_() {
    // eslint-disable-next-line no-console
    console.log(`
 _____ _____ _____ _____  ___
|_   _|  ___/  ___/  ___|/ _ \\
  | | | |__ \\ \`--.\\ \`--./ /_\\ \\
  | | |  __| \`--. \\\`--. \\  _  |
  | | | |___/\\__/ /\\__/ / | | |
  \\_/ \\____/\\____/\\____/\\_| |_/

Powered by the TESSA engine.
Learn more at https://keeptrack.space/tessa
This software is licensed under the GNU Affero General Public License (AGPL).
See https://www.gnu.org/licenses/agpl-3.0.html for details.
    `);
  }
}
