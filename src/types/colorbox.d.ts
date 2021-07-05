interface colorboxParams {
  iframe: boolean;
  width: string;
  height: string;
  fastIframe: boolean;
  closeButton: boolean;
}
export interface JQueryColorbox extends JQuery<HTMLElement> {
  colorbox(param: colorboxParams): void;
}