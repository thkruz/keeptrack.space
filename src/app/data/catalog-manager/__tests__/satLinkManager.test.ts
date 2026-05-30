import { SatLinkManager, SatConstellationString } from '@app/app/data/catalog-manager/satLinkManager';
import { TimeManager } from '@app/engine/core/time-manager';
import { LineManager } from '@app/engine/rendering/line-manager';

describe('SatLinkManager', () => {
  let satLinkManager: SatLinkManager;

  beforeEach(() => {
    satLinkManager = new SatLinkManager();
  });

  it('should be process showLinks for all SatConstellationString', () => {
    expect(() => satLinkManager.showLinks(new LineManager(), SatConstellationString.Aehf, new TimeManager())).not.toThrow();
    expect(() => satLinkManager.showLinks(new LineManager(), SatConstellationString.Dscs, new TimeManager())).not.toThrow();
    expect(() => satLinkManager.showLinks(new LineManager(), SatConstellationString.Galileo, new TimeManager())).not.toThrow();
    expect(() => satLinkManager.showLinks(new LineManager(), SatConstellationString.Iridium, new TimeManager())).not.toThrow();
    expect(() => satLinkManager.showLinks(new LineManager(), SatConstellationString.Sbirs, new TimeManager())).not.toThrow();
    expect(() => satLinkManager.showLinks(new LineManager(), SatConstellationString.Starlink, new TimeManager())).not.toThrow();
    expect(() => satLinkManager.showLinks(new LineManager(), SatConstellationString.Wgs, new TimeManager())).not.toThrow();
  });
});
