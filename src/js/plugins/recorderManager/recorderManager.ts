/* */

import $ from 'jquery';
import { CanvasRecorder } from '@app/js/plugins/recorderManager/CanvasRecorder.js';
import { keepTrackApi } from '@app/js/api/externalApi';

let recorder: any;

export const init = (): void => {
  // Add HTML
  keepTrackApi.register({
    method: 'uiManagerInit',
    cbName: 'recorderManager',
    cb: () => {
      // Bottom Icon
      $('#bottom-icons').append(keepTrackApi.html`
      <div id="menu-record" class="bmenu-item">
        <img alt="video" src="" delayedsrc="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAABmJLR0QA/wD/AP+gvaeTAAADnElEQVR4nO3cPWwbdRjH8e/jvKA2qHuFCgtUFMcXqGOxgFAkBOUlXdkgEhuDB0AIwQILS8vQEAkWhFo21nRBUBBigcZHsZ2Il04FISQWBhApceyHBZh6vTv73ur8PqvvHv/1//n/v0d3OoOIiIiIiIiIiIiIiIjINLOyB5BUfcfnZ6+zMnKeMjjpcBw4AtyW5/f2l+3/OWp03Mc9N8rsOIMqUrPjh/egzS7tERwFSDULFVfpABpb/uQevAccK3sseamVPYAbcreg429hXGSKJx+quALca42Q9x3Wyh5KESq3AhohZzggkw8V64Iaoa/hfHCTQxzjko34cDhDZ/8vfv7hIfsjk++O6HCSdDKTqMwWtHTZ6yNnI+pzg2vUeL530i4VOa68VSKAoOsLowEfAQsRh3R9npV+YL8XOa4iVOIa4AM2gPtu+BlctTkem8bJhwoE0Ah9jeiL7vUZ55nekv1W3IiKVWoAS5e9zk32fYwXui27UuCQChd5hU9732Na5d0Flb4FHXQKoGSVaENvdUHXFxjwhsOLRPyoo7YyBTChIPRVBrzjcNc45yuAMd1/xe8Z7rPuzqlJ6qQOIO+uoCxJu75mxw8PnFeGQ17FJn8apxWQQhD66p6zgXFnVjUVQAJLX/vx4Qzr7jyedW21oTGCjp8dzbBtJJr8L9PWVwAxHF4C5mIO+9Wc5/pNHklbXwFMZmCwvrvPvb2WXcAs9e2bzK4Bed87qlr3ZfA5TrvXsu1J6uginN4v5rzWa9mFLIopgOQGBu8OD/H6Tt3+zKqoAkjC+NSh3W/ad1mXVgAx3FjdbtrFvOqrC4qR5+RDASsgbfdy0J7EaQWUTAGUTAGUTAGUTAGULPcu6KB1NWlpBZRMAZRMAZRMAZRMAZQssy6oak+sbhVaATEWQ386z/oKIIY5m43QP1kM/UQe9RVAEs6j5nSDjp+r7/jtWZZWAMnNObRru3wfbPmzWRVVAOnd4cb5oOOfBVu+OGkxBTAmhxU3vgk6fu7ur/zIuHUUwGTmHNqHZv/dltxTt+IKIIbB28Ag5rCjbpxvhHyRtr4CiNFbtpdrQxYdPk5w+MNp6yuABLoP2o/by3bKjNPAT1nWVgAp9Jq2OQ8nzHkT+DuLmnpTPkbUPa7/XtLDkr2kF1VHK2BM3z5gV/ste8KM0wbXxq2jACbUa9omc9QNzgKjtOdrC4qhP+uYcgpARERERERERERERERERHL0D2BAC2IfonfQAAAAAElFTkSuQmCC">
        <span class="bmenu-title">Record Video</span>
        <div class="status-icon"></div>
      </div>     
    `);
    },
  });

  keepTrackApi.register({
    method: 'uiManagerOnReady',
    cbName: 'recorderManager',
    cb: () => {
      try {
        recorder = new CanvasRecorder(document.getElementById('keeptrack-canvas'));
      } catch (e) {
        console.log(e);
      }
    },
  });

  // Add JavaScript
  keepTrackApi.register({
    method: 'bottomMenuClick',
    cbName: 'recordVideo',
    cb: (iconName: string): void => {
      if (iconName === 'menu-record') {
        if (recorder.checkIfRecording()) {
          recorder.stop();
          recorder.save('keeptrack.webm');
          recorder.setIsRecording(false);
          $('#menu-record').removeClass('bmenu-item-selected');
          return;
        } else {
          try {
            recorder.start();
          } catch (e) {
            M.toast({
              html: `Compatibility Error with Recording`,
            });
            recorder.setIsRecording(false);
            $('#menu-record').removeClass('bmenu-item-selected');
            $('#menu-record').addClass('bmenu-item-disabled');
            if (!$('#menu-record:animated').length) {
              $('#menu-record').effect('shake', {
                distance: 10,
              });
            }
          }
          return;
        }
      }
    },
  });
};
