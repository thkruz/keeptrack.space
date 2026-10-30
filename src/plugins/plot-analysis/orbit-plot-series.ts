import { EChartsData } from '@app/engine/core/interfaces';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBus } from '@app/engine/events/event-bus';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { Satellite } from '@ootk/src/main';
import type { SelectSatManager } from '../select-sat-manager/select-sat-manager';

/** Samples one orbit of a satellite as `points` positions (km), starting at the sim time. */
export type OrbitSampler = (sat: Satellite, points: number) => { x: number; y: number; z: number }[];

/**
 * Series for the ECI / ECF orbit plots: the primary, then the secondary only when it is a
 * different object. Each value is `[x, y, z, isoTime]`, sampled evenly over one period.
 */
export const buildOrbitPlotSeries = (selectSatManager: SelectSatManager, sampler: OrbitSampler, numberOfPoints: number): EChartsData => {
  const data = [] as EChartsData;
  const now = ServiceLocator.getTimeManager().simulationTimeObj.getTime();
  const primary = ServiceLocator.getCatalogManager().getObject(selectSatManager.selectedSat) as Satellite | null;

  if (!primary) {
    return data;
  }

  const toSeries = (sat: Satellite): EChartsData[number] => ({
    name: sat.name,
    value: sampler(sat, numberOfPoints).map((point, idx: number): [number, number, number, string] => [
      point.x,
      point.y,
      point.z,
      new Date(now + ((sat.period * 60 * idx) / numberOfPoints) * 1000).toISOString(),
    ]),
  });

  data.push(toSeries(primary));

  const secondary = selectSatManager.secondarySatObj;

  if (secondary && secondary.id !== primary.id) {
    data.push(toSeries(secondary));
  }

  return data;
};

/**
 * Redraw an open orbit plot when the primary or secondary selection changes. Losing the primary
 * is left to the base plugin, which disables the icon and closes the menu.
 */
export const redrawOrbitPlotOnSelectionChange = (isOpen: () => boolean, getSelectedSat: () => number, redraw: () => void): void => {
  const onChange = () => {
    if (!isOpen() || getSelectedSat() === -1) {
      return;
    }
    redraw();
  };

  EventBus.getInstance().on(EventBusEvent.selectSatData, onChange);
  EventBus.getInstance().on(EventBusEvent.setSecondarySat, onChange);
};
