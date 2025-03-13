export class GetVariables {
  static godrays(value: string) {
    switch (value) {
      case 'low':
        return 16;
      case 'med':
      case 'medium':
        return 32;
      case 'hi':
      case 'high':
        return 64;
      case 'u':
      case 'ultra':
        return 128;
      default:
        return 32;
    }
  }
}
