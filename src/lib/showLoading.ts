import { fadeIn, fadeOut } from './fade';


/**
 * Show loading screen for a given time and then run callback
 */
export const showLoading = (callback?: () => void, delay?: number): void => {
    const loading = document.getElementById('loading-screen');
    fadeIn(loading, 'flex', 500);
    setTimeout(() => {
        if (callback) callback();
        fadeOut(loading, 500);
    }, delay || 100);
};

export const showLoadingSticky = (): void => {
    const loading = document.getElementById('loading-screen');
    fadeIn(loading, 'flex', 500);
};

export const hideLoading = () => {
    const loading = document.getElementById('loading-screen');
    fadeOut(loading, 500);
};
