import { keepTrackApi } from '@app/js/keepTrackApi';
import { getEl } from '@app/js/lib/get-el';
import { Classification, ClassificationString } from '@app/js/static/classification';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class ClassificationBar extends KeepTrackPlugin {
  private classificationString_: ClassificationString;
  private isClassificationContainerLoaded_: boolean = false;
  private isExpanded_: boolean = false;

  constructor() {
    const PLUGIN_NAME = 'Classification';
    super(PLUGIN_NAME);
  }

  init(): void {
    super.init();
    this.classificationString_ = <ClassificationString>settingsManager.classificationStr || '';
  }

  updateClassificationString(classificationString: ClassificationString = this.classificationString_, backgroundColor = '#ffffff', color = '#000000'): void {
    if (!this.isClassificationContainerLoaded_) {
      this.loadClassificationContainer_();
    }

    if (classificationString === '') {
      getEl('classification-container').style.display = 'none';
      this.updateTopMenuHeight_(false);
    } else {
      getEl('classification-container').style.display = 'flex';
      this.updateTopMenuHeight_(true);
    }

    getEl('classification-string').innerHTML = classificationString;

    const classificationContainerDom = getEl('classification-container');
    classificationContainerDom.style.fontWeight = '500';

    if (Classification.isValidClassification(classificationString)) {
      const colors = Classification.getColors(classificationString);
      backgroundColor = colors.backgroundColor;
      color = colors.color;
    }

    classificationContainerDom.style.backgroundColor = backgroundColor;
    classificationContainerDom.style.color = color;

    this.classificationString_ = classificationString;
  }

  addHtml(): void {
    super.addHtml();

    keepTrackApi.register({
      event: 'uiManagerInit',
      cbName: this.PLUGIN_NAME,
      cb: this.uiManagerInit_.bind(this),
    });
  }

  private loadClassificationContainer_(): void {
    const node = document.createElement('div');
    node.innerHTML = keepTrackApi.html`<span id="classification-string"></span>`;
    node.id = 'classification-container';
    node.style.cssText = `
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      `;

    getEl('keeptrack-main-container').insertBefore(node, getEl('keeptrack-main-container').firstChild);

    this.isClassificationContainerLoaded_ = true;
  }

  private uiManagerInit_(): void {
    if (settingsManager.classificationStr !== '') {
      this.loadClassificationContainer_();
      this.updateClassificationString();
    }
  }

  private updateTopMenuHeight_(isExpanded: boolean): void {
    if (this.isExpanded_ === isExpanded) return;

    let topMenuHeight = parseInt(document.documentElement.style.getPropertyValue('--top-menu-height').replace('px', ''));
    if (isNaN(topMenuHeight)) topMenuHeight = 0;
    document.documentElement.style.setProperty('--top-menu-height', topMenuHeight + (isExpanded ? 20 : -20) + 'px');

    this.isExpanded_ = isExpanded;
  }
}

export const classificationBarPlugin = new ClassificationBar();
