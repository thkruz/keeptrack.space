import { errorManagerInstance } from '../singletons/errorManager';

const DEFAULT_ERROR = () => {
  errorManagerInstance.info('Cruncher failed to meet requirement after two tries!');
};

export const waitForCruncher = (cruncher: Worker, cb: () => void, validationFunc: (data: any) => boolean, error = DEFAULT_ERROR): void => {
  cruncher.addEventListener(
    'message',
    (m) => {
      if (validationFunc(m.data)) {
        cb();
      } else {
        console.warn(m.data);
        cruncher.addEventListener(
          'message',
          (m) => {
            if (validationFunc(m.data)) {
              cb();
            } else {
              console.warn(m.data);
              error();
            }
          },
          { once: true }
        );
      }
    },
    { once: true }
  );
};
