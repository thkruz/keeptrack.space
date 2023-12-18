
export const shake = (el: HTMLElement | HTMLDivElement, duration?: number, callback?: () => void): void => {
    // Avoid errors for now
    // TODO: Throw an error here
    if (el === null) return;

    if (el.classList.contains('shake')) return;

    duration ??= 500;
    el.classList.add('shake');
    setTimeout(() => {
        el.classList.remove('shake');
        if (callback) callback();
    }, duration);
};
