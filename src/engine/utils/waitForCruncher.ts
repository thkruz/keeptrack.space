import { PositionCruncherOutgoingMsg } from '@app/webworker/constants';
import { errorManagerInstance } from './errorManager';

const DEFAULT_ERROR = () => {
  errorManagerInstance.info('Cruncher failed to meet requirement after two tries!');
};

interface WaitForCruncherParams {
  /** The web worker we are watiing on. */
  cruncher: Worker;
  /** The callback function to be called when a valid message is received. */
  cb: () => void;
  /** The function to validate if the cruncher sent the correct message. */
  validationFunc: (data: PositionCruncherOutgoingMsg) => boolean | Int8Array | undefined;
  /** The error callback function to be called when the maximum retry count is reached. */
  error?: () => void;
  /** The current retry count. */
  retryCount?: number;
  /** How many messages shhould we skip? This is useful if we want to wait for the cruncher to sync with the main thread.*/
  skipNumber?: number;
  /** How many times has the message passed our test */
  passCount?: number;
  /** Run the cb on failure? */
  isRunCbOnFailure?: boolean;
  /** How many times to retry. */
  maxRetries?: number;
}

/**
 * Waits for the cruncher worker to send a valid message.
 * @param params The parameters to wait for the cruncher.
 */
export const waitForCruncher = (params: WaitForCruncherParams): void => {
  const {
    cruncher,
    cb,
    validationFunc,
    error = DEFAULT_ERROR,
    retryCount = 0,
    skipNumber = 0,
    passCount = 0,
    isRunCbOnFailure = false,
    maxRetries = 5,
  } = params;

  cruncher.addEventListener(
    'message',
    (m) => {
      // Is this the message we are waiting for?
      if (validationFunc(m.data)) {
        // If this is the first message and we are skipping it, wait for the next valid message.
        if (passCount < skipNumber) {
          waitForCruncher({ ...params, passCount: passCount + 1 });

          return;
        }

        // If we have a valid message, call the callback function.
        // eslint-disable-next-line callback-return
        cb();
      } else if (retryCount < maxRetries) {
        // If we don't have a valid message, wait for the next message.
        waitForCruncher({ ...params, retryCount: retryCount + 1 });
      } else if (isRunCbOnFailure) {
        // If we have reached the maximum retry count, but we want to run the callback function on failure, call the callback function.
        // eslint-disable-next-line callback-return
        cb();
      } else {
        // If we have reached the maximum retry count, call the error callback function.
        error();
      }
    },
    { once: true },
  );
};
