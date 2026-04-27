import { TestBed } from '@angular/core/testing';

import { DataService } from './data';

describe('DataService', () => {
  let service: DataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('AI suggestion differs across zones (pharmacy)', () => {
    service.activeService.set('pharmacy');
    const a = service.getAISuggestionForZone('z2');
    const b = service.getAISuggestionForZone('z4');
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    if (a && b) {
      expect(
        a.populationServed !== b.populationServed || a.impactPercent !== b.impactPercent
      ).toBe(true);
    }
  });

  it('senior mode lowers coverage and changes AI metrics when suggestion exists', () => {
    service.activeService.set('pharmacy');
    service.seniorMode.set(false);
    const before = service.getAISuggestionForZone('z4');
    service.seniorMode.set(true);
    const after = service.getAISuggestionForZone('z4');
    expect(before).toBeTruthy();
    expect(after).toBeTruthy();
    if (before && after) {
      expect(
        after.impactPercent !== before.impactPercent || after.populationServed !== before.populationServed
      ).toBe(true);
    }
    const zone = service.getZones().find(z => z.id === 'z4');
    expect(zone).toBeTruthy();
    if (zone) {
      service.seniorMode.set(false);
      const c0 = service.getZoneCoverageForService(zone, 'pharmacy');
      service.seniorMode.set(true);
      const c1 = service.getZoneCoverageForService(zone, 'pharmacy');
      expect(c1).toBeLessThanOrEqual(c0);
    }
  });
});
