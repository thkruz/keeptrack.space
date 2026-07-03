import { sensors } from '@app/app/data/catalogs/sensors';
import { DetailedSensor } from '@app/app/sensors/DetailedSensor';
import { ServiceLocator } from '@app/engine/core/service-locator';
import { EventBusEvent } from '@app/engine/events/event-bus-events';
import { getEl } from '@app/engine/utils/get-el';
import { buildCustomSensorParams } from '../../sensor/custom-sensor-core';
import { l } from '../onboarding-t7e';
import type { TourStep } from '../tour-engine';
import {
  advanceOnIconClick,
  advanceWhenMenuOpens,
  collapseUtilityFooter,
  DO_IT_FOR_ME_HINT_MS,
  drawerItemTarget,
  expandUtilityFooter,
  isCatalogLoaded,
  isPluginUsable,
  isSatSelected,
  openDrawerAt,
  selectIssForUser,
  sideMenuTarget,
  TASK_RESULT_DWELL_MS,
  utilityIconTarget,
} from '../tour-steps';
import type { ChapterDefinition } from './chapter-types';

/** A well-known radar for the "Do it for me" fallback (Cape Cod SFS). */
const selectDemoSensor = (): void => {
  const sensorManager = ServiceLocator.getSensorManager();

  sensorManager.clearSecondarySensors();
  sensorManager.setSensor(sensors.CODSFS);
};

/** Places a demo custom sensor (an observer in the US capital region). */
const placeDemoCustomSensor = (): void => {
  const params = buildCustomSensorParams(
    {
      uiName: l('chapters.sensors.demoCustomSensorName'),
      type: 'Observer',
      lat: 38.9,
      lon: -77.0,
      alt: 0.1,
      minAz: 0,
      maxAz: 360,
      minEl: 10,
      maxEl: 90,
      minRng: 0,
      maxRng: 5500,
    },
    'onboarding-demo',
  );

  ServiceLocator.getSensorManager().addSecondarySensor(new DetailedSensor(params), true);
};

const step = (key: string) => ({
  title: l(`chapters.sensors.steps.${key}.title`),
  body: l(`chapters.sensors.steps.${key}.body`),
});

/** Chapter 1: Sensors & Coverage (~3 min, task-verified). */
export const sensorsChapter: ChapterDefinition = {
  id: 'sensors',
  title: () => l('chapters.sensors.title'),
  description: () => l('chapters.sensors.description'),
  minutes: 3,
  isAvailable: () => isPluginUsable('SensorListPlugin'),
  buildSteps: (): TourStep[] => [
    {
      id: 's1-sensor-list',
      kind: 'coachmark',
      ...step('openList'),
      beforeEnter: () => openDrawerAt('SensorListPlugin'),
      target: () => drawerItemTarget('SensorListPlugin'),
      placement: 'right',
      advanceOn: advanceWhenMenuOpens('SensorListPlugin'),
    },
    {
      id: 's2-select-sensor',
      kind: 'coachmark',
      ...step('selectSensor'),
      target: () => sideMenuTarget('SensorListPlugin') ?? drawerItemTarget('SensorListPlugin'),
      placement: 'right',
      advanceOn: {
        event: EventBusEvent.setSensor,
        predicate: (...args: unknown[]) => args[0] !== null,
        timeoutHintMs: DO_IT_FOR_ME_HINT_MS,
        dwellMs: TASK_RESULT_DWELL_MS,
      },
      actionButton: {
        label: l('buttons.doItForMe'),
        action: selectDemoSensor,
      },
    },
    {
      id: 's3-coverage',
      kind: 'coachmark',
      ...step('coverage'),
      target: () => getEl('keeptrack-canvas', true),
      placement: 'bottom',
    },
    {
      id: 's4-fov-layer',
      kind: 'coachmark',
      ...step('fovLayer'),
      // SensorFov is a UTILITY_ONLY toggle: it lives in the hover-expanded
      // utility footer, not the drawer list. The step pins the footer open
      // (else the spotlight chases the hover animation) and anchors to the
      // icon; without the icon the step is unavailable, never a silent skip.
      isAvailable: () => isPluginUsable('SensorFov') && utilityIconTarget('SensorFov') !== null,
      beforeEnter: expandUtilityFooter,
      afterExit: collapseUtilityFooter,
      target: () => utilityIconTarget('SensorFov'),
      placement: 'top',
      advanceOn: advanceOnIconClick('SensorFov'),
    },
    {
      id: 's5-sensor-info',
      kind: 'coachmark',
      ...step('sensorInfo'),
      isAvailable: () => isPluginUsable('SensorInfoPlugin'),
      beforeEnter: () => openDrawerAt('SensorInfoPlugin'),
      target: () => drawerItemTarget('SensorInfoPlugin'),
      placement: 'right',
      advanceOn: advanceWhenMenuOpens('SensorInfoPlugin'),
    },
    {
      id: 's6-custom-sensor',
      kind: 'coachmark',
      ...step('customSensor'),
      isAvailable: () => isPluginUsable('CustomSensorPlugin'),
      beforeEnter: () => openDrawerAt('CustomSensorPlugin'),
      target: () => drawerItemTarget('CustomSensorPlugin'),
      placement: 'right',
      advanceOn: {
        event: EventBusEvent.setSensor,
        predicate: (...args: unknown[]) => {
          const sensor = args[0] as { objName?: string } | null;

          return !!sensor?.objName?.startsWith('Custom Sensor');
        },
        timeoutHintMs: DO_IT_FOR_ME_HINT_MS,
        dwellMs: TASK_RESULT_DWELL_MS,
      },
      actionButton: {
        label: l('buttons.doItForMe'),
        action: placeDemoCustomSensor,
      },
    },
    {
      id: 's7-multi-look-angles',
      kind: 'coachmark',
      ...step('multiSensor'),
      // Comparing look angles needs a satellite selected (the plugin's menu
      // refuses to open without one), so the step requires the catalog and
      // auto-selects the ISS when the user has nothing selected.
      isAvailable: () => isPluginUsable('MultiSensorLookAnglesPlugin') && isCatalogLoaded(),
      beforeEnter: () => {
        if (!isSatSelected()) {
          selectIssForUser();
        }
        openDrawerAt('MultiSensorLookAnglesPlugin');
      },
      target: () => drawerItemTarget('MultiSensorLookAnglesPlugin'),
      placement: 'right',
      advanceOn: advanceWhenMenuOpens('MultiSensorLookAnglesPlugin'),
    },
  ],
};
