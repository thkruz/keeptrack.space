export class Worker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = () => {
      // This is intentional
    };
  }

  postMessage(msg) {
    this.onmessage(msg);
  }
}

export default Worker;
