/**
 * Highest classification of the data used by the program.
 */
export type ClassificationString = '' | 'Unclassified' | 'CUI' | 'Confidential' | 'Secret' | 'Top Secret' | 'Top Secret//SCI';

export class Classification {
  static getColors(classification: ClassificationString | null) {
    let backgroundColor: string;
    let color: string;

    if (!classification) {
      return {
        backgroundColor: '#ffffff',
        color: '#000000',
      };
    }

    if (classification.startsWith('Top Secret//SCI')) {
      backgroundColor = '#fce93a';
      color = 'black';
    } else if (classification.startsWith('Top Secret')) {
      backgroundColor = '#ff8c00';
      color = 'black';
    } else if (classification.startsWith('Secret')) {
      backgroundColor = '#ff0000';
      color = 'white';
    } else if (classification.startsWith('Confidential')) {
      backgroundColor = '#0033a0';
      color = 'white';
    } else if (classification.startsWith('CUI')) {
      backgroundColor = '#512b85';
      color = 'white';
    } else if (classification.startsWith('Unclassified')) {
      backgroundColor = '#007a33';
      color = 'white';
    } else {
      throw new Error(`Invalid classification: ${classification}`);
    }

    return { backgroundColor, color };
  }

  static isValidClassification(classification: string): boolean {
    if (!classification || classification === '') {
      return false;
    }

    return ['Unclassified', 'Confidential', 'CUI', 'Secret', 'Top Secret', 'Top Secret//SCI'].some((validClassification) => classification.startsWith(validClassification));
  }
}
