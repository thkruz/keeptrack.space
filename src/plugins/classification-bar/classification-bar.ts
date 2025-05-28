import { KeepTrackApiEvents } from '@app/interfaces';
import { keepTrackApi } from '@app/keepTrackApi';
import { getEl } from '@app/lib/get-el';
import { errorManagerInstance } from '@app/singletons/errorManager';
import { Classification, ClassificationString } from '@app/static/classification';
import { KeepTrackPlugin } from '../KeepTrackPlugin';

export class ClassificationBar extends KeepTrackPlugin {
  readonly id = 'ClassificationBar';
  dependencies_ = [];
  private classificationString_: ClassificationString;
  private isClassificationContainerLoaded_ = false;
  private isExpanded_ = false;

  private readonly containerDomId = 'classification-container';
  private readonly textStringDomId = 'classification-string';
  private readonly containerHeight = 20;

  init(): void {
    super.init();
    this.classificationString_ = settingsManager.classificationStr ?? '';
  }

  updateString(classificationString: ClassificationString = this.classificationString_, backgroundColor = '#ffffff', color = '#000000'): void {
    if (!this.isClassificationContainerLoaded_) {
      this.createContainer_();
    }

    if (classificationString === '') {
      getEl(this.containerDomId)!.style.display = 'none';
      this.updateTopMenuHeight_(false);
    } else {
      getEl(this.containerDomId)!.style.display = 'flex';
      this.updateTopMenuHeight_(true);
    }

    getEl(this.textStringDomId)!.innerHTML = classificationString;

    const classificationContainerDom = getEl(this.containerDomId);

    classificationContainerDom!.style.fontWeight = '500';

    if (Classification.isValidClassification(classificationString)) {
      const colors = Classification.getColors(classificationString);

      backgroundColor = colors.backgroundColor;
      color = colors.color;
    }

    classificationContainerDom!.style.backgroundColor = backgroundColor;
    classificationContainerDom!.style.color = color;

    this.classificationString_ = classificationString;
  }

  addHtml(): void {
    super.addHtml();

    keepTrackApi.on(KeepTrackApiEvents.uiManagerInit, this.uiManagerInit_.bind(this));
  }

  private createContainer_(): void {
    const node = document.createElement('div');

    node.innerHTML = keepTrackApi.html`<span id="${this.textStringDomId}"></span>`;
    node.id = this.containerDomId;
    node.style.cssText = `
      height: ${this.containerHeight}px;
      display: flex;
      align-items: center;
      justify-content: center;
      `;

    keepTrackApi.containerRoot.insertBefore(node, keepTrackApi.containerRoot.firstChild);

    this.isClassificationContainerLoaded_ = true;
  }

  private uiManagerInit_(): void {
    if (settingsManager.classificationStr !== '') {
      this.createContainer_();
      this.updateString();
    } else {
      errorManagerInstance.debug('Classification string is empty so not loading classification bar');
    }
  }

  private updateTopMenuHeight_(isExpanded: boolean): void {
    if (this.isExpanded_ === isExpanded) {
      return;
    }

    document.documentElement.style.setProperty('--classification-bar-height', `${isExpanded ? this.containerHeight : -this.containerHeight}px`);

    this.isExpanded_ = isExpanded;
  }
}

export const classificationBarPlugin = new ClassificationBar();
