export class UUID {
  private static counter: number = 0;

  /**
   * Generate a simple unique ID
   * Note: This is not a true UUID, but sufficient for most use cases
   */
  static generate(): string {
    const timestamp = Date.now().toString(36);
    const counter = (UUID.counter++).toString(36);
    const random = Math.random().toString(36).substring(2, 10);

    return `${timestamp}-${counter}-${random}`;
  }
}
