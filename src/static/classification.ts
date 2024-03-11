/**
 * Highest classification of the data used by the program.
 */
export type ClassificationString = '' | 'Unclassified' | 'CUI' | 'Confidential' | 'Secret' | 'Top Secret' | 'Top Secret//SCI';

export class Classification {
  static getColors(classification: ClassificationString) {
    let backgroundColor: string;
    let color: string;

    switch (classification) {
      case 'Top Secret//SCI':
        backgroundColor = '#fce93a';
        color = 'black';
        break;
      case 'Top Secret':
        backgroundColor = '#ff8c00';
        color = 'black';
        break;
      case 'Secret':
        backgroundColor = '#ff0000';
        color = 'white';
        break;
      case 'Confidential':
        backgroundColor = '#0033a0';
        color = 'white';
        break;
      case 'CUI':
        backgroundColor = '#512b85';
        color = 'white';
        break;
      case 'Unclassified':
        backgroundColor = '#007a33';
        color = 'white';
        break;
      default:
        throw new Error(`Invalid classification: ${classification}`);
    }

    return { backgroundColor, color };
  }

  static isValidClassification(classification: string): boolean {
    return ['Unclassified', 'Confidential', 'CUI', 'Secret', 'Top Secret', 'Top Secret//SCI'].includes(classification);
  }
}
