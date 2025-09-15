/**
 * /////////////////////////////////////////////////////////////////////////////
 *
 * https://keeptrack.space
 *
 * @Copyright (C) 2025 Kruczek Labs LLC
 *
 * KeepTrack is free software: you can redistribute it and/or modify it under the
 * terms of the GNU Affero General Public License as published by the Free Software
 * Foundation, either version 3 of the License, or (at your option) any later version.
 *
 * KeepTrack is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with
 * KeepTrack. If not, see <http://www.gnu.org/licenses/>.
 *
 * /////////////////////////////////////////////////////////////////////////////
 */

import { PersistenceManager, StorageKey } from '@app/engine/utils/persistence-manager';

export class ColorPick {
  element: HTMLElement;
  options: {
    initialColor: string;
    allowRecent: boolean;
    recentMax: number;
    allowCustomColor: boolean;
    palette: string[];
    onColorSelected: (colorpick: ColorPick) => void;
  };
  color: string;
  palette: string[];

  constructor(element: HTMLElement, options = {}) {
    this.element = element;
    this.options = { ...ColorPick.defaults, ...options };
    this.color = this.options.initialColor.toUpperCase();

    this.element.style.cssText = `background-color: ${this.color}; color: ${this.color}`;

    this.init();
    this.options.onColorSelected(this);
  }

  init() {
    const dataInitialColor = this.element.dataset.initialcolor;

    if (dataInitialColor) {
      this.color = dataInitialColor;
    }

    this.palette = [...new Set(this.options.palette.map((color) => color.toUpperCase()))];

    this.element.addEventListener('click', this.handleClick.bind(this));
    document.addEventListener('click', this.hide.bind(this));
  }

  handleClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.show(event.pageX, event.pageY);
  }

  show(left: number, top: number) {
    const existingColorPick = document.getElementById('colorPick');

    if (existingColorPick) {
      existingColorPick.remove();
    }

    const colorPick = document.createElement('div');

    colorPick.id = 'colorPick';
    colorPick.style.display = 'none';
    colorPick.style.top = `${top}px`;
    colorPick.style.left = `${left}px`;
    colorPick.style.position = 'absolute';
    colorPick.style.zIndex = '1000'; // Ensure it's on top of other elements

    this.palette.forEach((color) => {
      const colorButton = document.createElement('div');

      colorButton.className = 'colorPickButton';
      colorButton.setAttribute('hexValue', color);
      colorButton.style.background = color;
      colorButton.addEventListener('click', this.handleColorSelection.bind(this));
      colorPick.appendChild(colorButton);
    });

    if (this.options.allowCustomColor) {
      const customColorInput = document.createElement('input');

      customColorInput.type = 'text';
      customColorInput.className = 'customColorHash';
      customColorInput.value = this.color;
      customColorInput.addEventListener('click', (e) => e.stopPropagation());
      customColorInput.addEventListener('keyup', this.handleCustomColorInput.bind(this));
      colorPick.appendChild(customColorInput);
    }

    if (this.options.allowRecent) {
      // Implementation for recent colors...
    }

    document.body.appendChild(colorPick);
    colorPick.style.display = 'block';
  }

  handleColorSelection(event: MouseEvent) {
    const target = event.target as HTMLElement;

    this.color = target.getAttribute('hexValue') || '';
    this.hide();
    this.options.onColorSelected(this);
    this.saveColor();
  }

  handleCustomColorInput(event: KeyboardEvent) {
    const target = event.target as HTMLInputElement;
    let hash = target.value;

    if (!hash.startsWith('#')) {
      hash = `#${hash}`;
    }
    if ((/(?:^#[0-9A-F]{6}$)|(?:^#[0-9A-F]{3}$)/iu).test(hash)) {
      this.color = hash;
      this.options.onColorSelected.call(this);
      this.saveColor();
      target.classList.remove('error');
    } else {
      target.classList.add('error');
    }
  }

  hide(event?: MouseEvent) {
    if (event) {
      const target = event.target as HTMLElement;

      if (this.element.contains(target) || document.getElementById('colorPick')?.contains(target)) {
        return; // Don't hide if clicking inside the color picker or the element
      }
    }
    const colorPick = document.getElementById('colorPick');

    if (colorPick) {
      colorPick.style.display = 'none';
      setTimeout(() => colorPick.remove(), 200);
    }
  }

  private saveColor(): void {
    PersistenceManager.getInstance().saveItem(StorageKey.SETTINGS_DOT_COLORS, JSON.stringify(settingsManager.colors));
  }

  static readonly defaults = {
    initialColor: '#3498db',
    allowRecent: false,
    recentMax: 5,
    allowCustomColor: false,
    palette: [
      '#1abc9c', '#16a085', '#2ecc71', '#27ae60', '#3498db',
      '#2980b9', '#9b59b6', '#8e44ad', '#34495e', '#2c3e50',
      '#f1c40f', '#f39c12', '#e67e22', '#d35400', '#e74c3c',
      '#c0392b', '#ecf0f1', '#bdc3c7', '#95a5a6', '#7f8c8d',
    ],
    onColorSelected(this: ColorPick) {
      this.element.style.backgroundColor = this.color;
      this.element.style.color = this.color;
    },
  };

  static initColorPick(selector: string, options: Partial<ColorPick['options']> = {}) {
    const elements = document.querySelectorAll(selector);

    elements.forEach((element) => new ColorPick(element as HTMLElement, options));
  }
}
