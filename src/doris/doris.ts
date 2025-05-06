import { isThisNode } from '@app/doris/utils/isThisNode';
import { Engine } from './core/engine';
import { EventBus } from './events/event-bus';
import { Renderer } from './rendering/renderer';

export class Doris {
  static readonly id = 'Doris';
  private static readonly nodeCanvas: string = 'keeptrack-canvas';
  private static readonly nodeContainer: string = 'keeptrack-root';
  private static readonly browserCanvas: string = 'keeptrack-canvas';
  private static readonly browserContainer: string = 'keeptrack-root';
  static instance: Engine | null = null; // NOSONAR

  static getInstance({
    Renderer,
  }: {
    Renderer?: new (eventBus: EventBus) => Renderer;
  } = {}) {
    if (!Doris.instance) {
      Doris.instance = new Engine({
        canvasId: isThisNode() ? Doris.nodeCanvas : Doris.browserCanvas,
        containerRoot: isThisNode() ? Doris.nodeContainer : Doris.browserContainer,
        Renderer,
      });

      Doris.printConsoleMessage_();
    }

    return Doris.instance;
  }

  private static printConsoleMessage_() {
    // eslint-disable-next-line no-console
    console.log(`
______ ___________ _____ _____
|  _  \\  _  | ___ \\_   _/  ___|
| | | | | | | |_/ / | | \\ \`--.
| | | | | | |    /  | |  \`--. \\
| |/ /\\ \\_/ / |\\ \\ _| |_/\\__/ /
|___/  \\___/\\_| \\_|\\___/\\____/

Powered by the Definitely Overengineered Render & Input System (DORIS) engine.
A not-so-intelligent, definitely-overambitious, and surprisingly useful small space engine.
Learn more at https://keeptrack.space/tessa
This software is licensed under the GNU Affero General Public License (AGPL).
See https://www.gnu.org/licenses/agpl-3.0.html for details.
    `);
  }
}
