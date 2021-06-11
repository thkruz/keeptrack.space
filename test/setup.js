/* globals
  jest
  global
*/

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
    }
  );

  document.body.innerHTML = global.docBody;
};

const eventFire = (elObj, etype) => {
  try {
    let el = typeof elObj == 'string' ? document.getElementById(elObj) : elObj;
    if (el.fireEvent) {
      el.fireEvent('on' + etype);
    } else {
      const evObj = new Event(etype, { bubbles: true, cancelable: false });
      el.dispatchEvent(evObj);
    }
  } catch (error) {
    console.debug(elObj);
  }
};

export { eventFire, setup };
