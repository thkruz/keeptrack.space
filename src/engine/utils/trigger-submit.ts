/**
 * Runs a form's submit path from code (e.g. a right-click "Create Sensor Here").
 *
 * Plugins wire their handlers to the native `submit` event (KeepTrackPlugin
 * listens for it and calls preventDefault), so dispatch exactly that. A
 * script-created event never performs the browser's default navigation, and it
 * skips constraint validation, matching what the old `customSubmit` intended,
 * which no handler ever listened for.
 */
export const triggerSubmit = (formElement: HTMLFormElement | null | undefined): void => {
  formElement?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
};
