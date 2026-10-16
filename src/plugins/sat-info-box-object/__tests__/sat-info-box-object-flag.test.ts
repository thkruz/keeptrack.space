import { ServiceLocator } from '@app/engine/core/service-locator';
import type { ISettingNumberControl, ISettingToggleControl } from '@app/engine/plugins/core/plugin-capabilities';
import { MeshRenderer } from '@app/engine/rendering/mesh/mesh-renderer';
import { MeshManager } from '@app/engine/rendering/mesh-manager';
import { SatInfoBox } from '@app/plugins/sat-info-box/sat-info-box';
import { SatInfoBoxObject } from '@app/plugins/sat-info-box-object/sat-info-box-object';
import { EL } from '@app/plugins/sat-info-box-object/sat-info-box-object-html';
import { SelectSatManager } from '@app/plugins/select-sat-manager/select-sat-manager';
import { SettingsManager } from '@app/settings/settings';
import { setupStandardEnvironment } from '@test/environment/standard-env';
import { websiteInit } from '@test/generic-tests';
import { mat3, mat4, vec3 } from 'gl-matrix';
import { vi } from 'vitest';
import { OBJ } from 'webgl-obj-loader';

describe('SatInfoBoxObject flag decal settings', () => {
  let plugin: SatInfoBoxObject;
  let saved: Record<string, unknown>;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new SatInfoBoxObject();
    websiteInit(plugin);
    saved = {
      isFlagDecalsFeatureEnabled: settingsManager.isFlagDecalsFeatureEnabled,
      isDrawFlagDecals: settingsManager.isDrawFlagDecals,
      flagDecalScale: settingsManager.flagDecalScale,
      disableUI: settingsManager.disableUI,
      isDrawLess: settingsManager.isDrawLess,
      noMeshManager: settingsManager.noMeshManager,
      nearZoomLevel: settingsManager.nearZoomLevel,
    };
    vi.spyOn(SettingsManager, 'preserveSettings').mockImplementation(() => undefined);
  });

  afterEach(() => {
    Object.assign(settingsManager, saved);
    vi.restoreAllMocks();
  });

  const contributionOn = () => {
    settingsManager.isFlagDecalsFeatureEnabled = true;

    return plugin.getSettingsContributions()[0];
  };
  const controls = () => contributionOn().controls;
  const toggle = () => controls().find((c) => c.id === 'flagDecals') as ISettingToggleControl;
  const scale = () => controls().find((c) => c.id === 'flagDecalScale') as ISettingNumberControl;

  it('contributes nothing and hides the Model flag row while the feature switch is off (the default)', () => {
    settingsManager.isFlagDecalsFeatureEnabled = false;
    expect(plugin.getSettingsContributions()).toEqual([]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update = (plugin as any).updateModelFlag_.bind(plugin) as (obj: unknown) => void;
    const row = document.getElementById(EL.MODEL_FLAG)?.parentElement as HTMLElement;

    update({ country: 'US' });
    expect(row.style.display).toBe('none');

    settingsManager.isFlagDecalsFeatureEnabled = true;
    update({ country: 'US' });
    expect(row.style.display).toBe('');
  });

  it('contributes a graphics card with a medium-quality toggle and a 0.2..0.6 size control', () => {
    const contribution = contributionOn();

    expect(contribution.target).toBe('graphics');
    expect(toggle().quality).toEqual({ minLevel: 'medium' });
    expect([scale().min, scale().max]).toEqual([0.2, 0.6]);
  });

  it('the toggle flips isDrawFlagDecals and persists', () => {
    toggle().set(false);
    expect(settingsManager.isDrawFlagDecals).toBe(false);
    expect(toggle().get()).toBe(false);
    toggle().set(true);
    expect(settingsManager.isDrawFlagDecals).toBe(true);
    expect(SettingsManager.preserveSettings).toHaveBeenCalledTimes(2);
  });

  it('the size control clamps to 0.2..0.6 and ignores NaN', () => {
    scale().set(0.9);
    expect(settingsManager.flagDecalScale).toBe(0.6);
    scale().set(0.05);
    expect(settingsManager.flagDecalScale).toBe(0.2);
    scale().set(Number.NaN);
    expect(settingsManager.flagDecalScale).toBe(0.2);
  });

  it('turning the toggle off makes the renderer write uFlagEnabled = 0 for a flagged model', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gl = global.mocks.glMock as any;

    vi.spyOn(gl, 'getUniformLocation').mockImplementation((_p: unknown, name: string) => ({ name }) as never);
    settingsManager.disableUI = false;
    settingsManager.isDrawLess = false;
    settingsManager.noMeshManager = false;
    settingsManager.nearZoomLevel = 1_000_000;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ServiceLocator.getMainCamera() as any).state.camDistBuffer = 0;

    const mm = new MeshManager();
    const internals = mm as unknown as { flagAtlasState_: string; flagAtlasTexture_: unknown; setFlag_(o: unknown, id: number): void };

    mm.isReady = true;
    mm.mvMatrix_ = mat4.create();
    mm.nMatrix_ = mat3.create();
    mm.currentMeshObject.id = 1;
    mm.currentMeshObject.model = {
      id: 1,
      name: 'm',
      mesh: {} as never,
      layout: new OBJ.Layout(OBJ.Layout.POSITION, OBJ.Layout.NORMAL, OBJ.Layout.UV, OBJ.Layout.AMBIENT, OBJ.Layout.DIFFUSE, OBJ.Layout.SPECULAR, OBJ.Layout.SPECULAR_EXPONENT),
      buffers: { vertexBuffer: {}, indexBuffer: {}, vertexCount: 3, indexCount: 3 },
      bounds: { min: vec3.create(), max: vec3.create(), center: vec3.fromValues(0, 0, 0), radius: 1 },
    };
    internals.setFlag_({ country: 'US' }, 1);
    internals.flagAtlasState_ = 'ready';
    internals.flagAtlasTexture_ = { atlas: true };

    const renderer = new MeshRenderer(mm, gl);
    const f1 = vi.spyOn(gl, 'uniform1f');
    const enabledWrites = () => f1.mock.calls.filter(([loc]) => (loc as { name?: string }).name === 'uFlagEnabled').map(([, v]) => v);

    toggle().set(true);
    renderer.draw(mat4.create(), mat4.create());
    toggle().set(false);
    renderer.draw(mat4.create(), mat4.create());

    expect(enabledWrites()).toEqual([1, 0]);
  });
});

describe('SatInfoBoxObject model flag row', () => {
  let plugin: SatInfoBoxObject;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = () => plugin as any;

  beforeEach(() => {
    setupStandardEnvironment([SelectSatManager, SatInfoBox]);
    plugin = new SatInfoBoxObject();
    websiteInit(plugin);
    document.body.insertAdjacentHTML('beforeend', p().createObjectSection_());
  });

  it('shows the override flag before the country', () => {
    p().updateModelFlag_({ country: 'US', operatorLogo: 'ISS' });
    expect(document.getElementById('sat-model-flag')!.innerHTML).toContain('fi-iss');
  });

  it('shows the country flag, and unknown when there is none', () => {
    p().updateModelFlag_({ country: 'PRC' });
    expect(document.getElementById('sat-model-flag')!.innerHTML).toContain('fi-cn');
    p().updateModelFlag_({ country: '' });
    expect(document.getElementById('sat-model-flag')!.querySelector('.fi')).toBeNull();
  });

  it('never writes an unsafe override into the DOM', () => {
    p().updateModelFlag_({ operatorLogo: '<img src=x onerror=alert(1)>' });
    expect(document.getElementById('sat-model-flag')!.querySelector('img')).toBeNull();
  });
});
