/**
 * Persistent name tags for the embed API. The engine's own sat labels are digit-only glyph quads, so host names are
 * drawn as absolutely positioned DOM elements, re-projected from each object's position once per frame.
 */

import type { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { GetSatType } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import type { EngineLabel } from './embed-engine';

interface Tag {
  label: EngineLabel;
  el: HTMLElement;
}

const CONTAINER_ID = 'keeptrack-embed-labels';

export class EmbedLabelLayer {
  private container_: HTMLElement | null = null;
  private tags_: Tag[] = [];
  private isSubscribed_ = false;

  set(labels: EngineLabel[]): void {
    if (typeof document === 'undefined') {
      return;
    }
    for (const tag of this.tags_) {
      tag.el.remove();
    }
    this.tags_ = [];
    if (labels.length === 0) {
      return;
    }
    const container = this.ensureContainer_();

    for (const label of labels) {
      const el = document.createElement('div');

      el.textContent = label.text;
      el.style.cssText = [
        'position:absolute',
        'left:0',
        'top:0',
        'display:none',
        'white-space:nowrap',
        'font:12px/1 system-ui,sans-serif',
        `font-weight:${label.bold ? 700 : 400}`,
        'padding:1px 4px',
        'border-radius:3px',
        'background:rgba(0,0,0,0.45)',
        'text-shadow:0 0 3px #000',
        `color:${label.color ? `rgb(${Math.round(label.color[0] * 255)},${Math.round(label.color[1] * 255)},${Math.round(label.color[2] * 255)})` : '#fff'}`,
      ].join(';');
      container.appendChild(el);
      this.tags_.push({ label, el });
    }
    if (!this.isSubscribed_) {
      this.isSubscribed_ = true;
      EventBus.getInstance().on(EventBusEvent.updateLoop, () => this.update_());
    }
  }

  private ensureContainer_(): HTMLElement {
    if (this.container_ && this.container_.isConnected) {
      return this.container_;
    }
    const existing = document.getElementById(CONTAINER_ID);
    const container = existing ?? document.createElement('div');

    container.id = CONTAINER_ID;
    container.style.cssText = 'position:fixed;inset:0;pointer-events:none;overflow:hidden;z-index:5';
    if (!existing) {
      document.body.appendChild(container);
    }
    this.container_ = container;

    return container;
  }

  private update_(): void {
    if (this.tags_.length === 0) {
      return;
    }
    const renderer = ServiceLocator.getRenderer();
    const catalog = ServiceLocator.getCatalogManager();
    const time = ServiceLocator.getTimeManager().simulationTimeObj;
    const canvas = renderer?.domElement;
    const rect = canvas?.getBoundingClientRect();

    for (const { label, el } of this.tags_) {
      let obj: unknown = null;

      if (label.sensor) {
        const eci = (label.sensor as unknown as DetailedSensor).eci(time);

        obj = { position: { x: eci.x, y: eci.y, z: eci.z } };
      } else if (label.id !== undefined) {
        obj = catalog.getObject(label.id, GetSatType.POSITION_ONLY);
      }
      const p = obj ? renderer.getScreenCoords(obj as never) : null;

      if (!p || p.error || !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.y < 0 || p.x > window.innerWidth || p.y > window.innerHeight) {
        el.style.display = 'none';
        continue;
      }
      const x = (rect?.left ?? 0) + p.x + 8;
      const y = (rect?.top ?? 0) + p.y - 6;

      el.style.display = 'block';
      el.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
    }
  }
}
