/**
 * This is a dependency container for all singletons and other objects that need to be shared between modules.
 *
 * Singletons are registered here, and then injected into the modules that need them.
 */
export class Container {
  private static instance: Container;

  static getInstance(): Container {
    if (!this.instance) {
      this.instance = new Container();
    }

    return this.instance;
  }

  private constructor() {
    // private constructor to prevent direct instantiation
  }

  registerSingleton<T>(name: string, singleton: T): void {
    this[name] = singleton;
  }

  get<T>(name: string): T {
    return this[name];
  }
}
