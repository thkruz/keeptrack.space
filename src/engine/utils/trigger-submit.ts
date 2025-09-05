
export const triggerSubmit = (formElement: HTMLFormElement): void => {
  const event = new CustomEvent('customSubmit', { cancelable: true });

  formElement.dispatchEvent(event);
};
