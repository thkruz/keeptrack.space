/* eslint-disable no-unused-vars */
declare module '*.css';
declare module '*.jpg';
declare module '*.png';

interface JQuery<HTMLElement> {
  effect: any;
}

interface HTMLDivElement {
  addClass: (classStr: string) => void;
  removeClass: (classStr: string) => void;
  hide: () => void;
  on: (type: string, cb: any) => void;
  off: (type?: string, cb?: any) => void;
  scrollTop: (y?: number) => number;
  draggable: (options: any) => void;
  css: any;
  text: any;
  show: any;
  effect: any;
  is: any;
}

interface JQueryStatic {
  colorbox: any;
}
