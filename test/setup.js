import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';

const setup = {};

setup.init = () => {
  const oldWindowLocation = window.location;

  delete window.location;

  window.location = Object.defineProperties(
    {},
    {
      ...Object.getOwnPropertyDescriptors(oldWindowLocation),

      assign: {
        search: '?sat=44444',
        value: jest.fn(),
      },
    },
  );

  keepTrackApi.containerRoot.innerHTML = global.docBody;
};

const eventFire = (elObj, etype) => {
  try {
    const el = typeof elObj === 'string' ? getEl(elObj) : elObj;

    if (el.fireEvent) {
      el.fireEvent(`on${etype}`);
    } else {
      const evObj = new Event(etype, { bubbles: true, cancelable: false });

      el.dispatchEvent(evObj);
    }
  } catch (error) {
    // Intentionally left blank
  }
};

export { eventFire, setup };
