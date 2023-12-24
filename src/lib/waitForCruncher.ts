import { errorManagerInstance } from '../singletons/errorManager';

const DEFAULT_ERROR = () => {
  errorManagerInstance.info('Cruncher failed to meet requirement after two tries!');
};

/**
 * Waits for the cruncher worker to send a valid message.
 * @param cruncher - The cruncher worker.
 * @param cb - The callback function to be called when a valid message is received.
 * @param validationFunc - The function to validate if the cruncher sent the correct message.
 * @param error - The error callback function to be called when the maximum retry count is reached.
 * @param retryCount - The current retry count (default: 0).
 */
export const waitForCruncher = (cruncher: Worker, cb: () => void, validationFunc: (data: any) => boolean, error = DEFAULT_ERROR, retryCount = 0): void => {
  cruncher.addEventListener(
    'message',
    (m) => {
      if (validationFunc(m.data)) {
        cb();
      } else {
        console.warn(m.data);
        if (retryCount < 5) {
          waitForCruncher(cruncher, cb, validationFunc, error, retryCount++);
        } else {
          error();
        }
      }
    },
    { once: true }
  );
};
