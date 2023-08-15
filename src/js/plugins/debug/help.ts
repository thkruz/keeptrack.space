import { keepTrackApi } from '@app/js/keepTrackApi';

export const helpTitleTextDebug = `Debug Menu`;

export const helpBodyTextDebug = keepTrackApi.html`The Debug Menu is used for debugging the app. It is probably not very useful unless you are assisting me with debugging an issue
    <br><br>
    Open Debug Menu allows you to access the console even when it is blocked by the browser. This is useful for debugging issues that only occur in the browser console.
    <br><br>
    Run Gremlins will run a series of tests to try to break the app. This kind of fuzz testing is useful for testing the app's robustness.`;
