import { errorManagerInstance } from '../singletons/errorManager';


export const waitForCruncher = (cruncher: Worker, cb: () => void, validationFunc: (data: any) => boolean): void => {
    cruncher.addEventListener(
        'message',
        (m) => {
            if (validationFunc(m.data)) {
                cb();
            } else {
                cruncher.addEventListener(
                    'message',
                    (m) => {
                        if (validationFunc(m.data)) {
                            cb();
                        } else {
                            errorManagerInstance.info('Cruncher failed to meet requirement after two tries!');
                        }
                    },
                    { once: true }
                );
            }
        },
        { once: true }
    );
};
