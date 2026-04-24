import { Component, computed, OnInit, effect, signal } from '@angular/core';
import { DataService, AccessibilityIssue, Suggestion, Zone, ServiceType } from '../../services/data';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AnimatedCounter } from '../animated-counter/animated-counter';

@Component({
  selector: 'app-stats-cards',
  imports: [TranslateModule, CommonModule, AnimatedCounter],
  templateUrl: './stats-cards.html',
  styleUrl: './stats-cards.scss',
})
export class StatsCards implements OnInit {
  issues: AccessibilityIssue[] = [];
  suggestions: Suggestion[] = [];
  zones: Zone[] = [];

  // KPI signals for animated updates
  populationCoverage = signal<number>(0);
  accessibilityScore = signal<number>(0);
  activeService = signal<ServiceType>('pharmacy');

  constructor(public dataService: DataService) {
    // React to service changes
    effect(() => {
      const service = this.dataService.activeService();
      this.activeService.set(service);
      this.updateKPIs();
    });

    // React to senior mode changes
    effect(() => {
      const _ = this.dataService.seniorMode();
      this.updateKPIs();
    });
  }

  ngOnInit() {
    this.issues = this.dataService.getIssues();
    this.suggestions = this.dataService.getSuggestions();
    this.zones = this.dataService.getZones();
    this.updateKPIs();
  }

  private updateKPIs() {
    this.populationCoverage.set(this.dataService.getPopulationCoverage());
    this.accessibilityScore.set(this.dataService.getOverallAccessibilityScore());
  }

  openIssues = computed(() => this.issues.filter(i => i.status === 'Open').length);
  resolvedIssues = computed(() => this.issues.filter(i => i.status === 'Resolved').length);

  // Dynamic service coverage based on active service
  serviceCoverage = computed(() => {
    const service = this.activeService();
    const totalPop = this.zones.reduce((s, z) => s + z.population, 0);
    const coveredPop = this.zones.reduce((sum, z) => {
      const cov = this.dataService.getZoneCoverageForService(z, service);
      return sum + (z.population * cov / 100);
    }, 0);
    return Math.round((coveredPop / totalPop) * 100) || 0;
  });

  // Service-specific colors
  serviceColor = computed(() => {
    const colors: Record<ServiceType, string> = {
      pharmacy: '#10b981',
      parks: '#f59e0b',
      hospitals: '#3b82f6'
    };
    return colors[this.activeService()];
  });

  serviceName = computed(() => {
    const names: Record<ServiceType, string> = {
      pharmacy: 'Pharmacy',
      parks: 'Parks',
      hospitals: 'Hospitals'
    };
    return names[this.activeService()];
  });

  avgPharmacy = computed(() => {
    if (!this.zones.length) return 62;
    const avg = this.zones.reduce((s, z) => s + z.services.pharmacies, 0) / this.zones.length;
    return Math.round(avg * 8);
  });

  avgParks = computed(() => {
    if (!this.zones.length) return 51;
    const avg = this.zones.reduce((s, z) => s + z.services.parks, 0) / this.zones.length;
    return Math.round(avg * 25);
  });

  avgHospitals = computed(() => {
    if (!this.zones.length) return 47;
    const avg = this.zones.reduce((s, z) => s + z.services.hospitals, 0) / this.zones.length;
    return Math.round(avg * 23);
  });

  totalPopulation = computed(() => this.zones.reduce((s, z) => s + z.population, 0));

  // Service icon based on active service
  serviceIcon = computed(() => {
    const icons: Record<ServiceType, string> = {
      pharmacy: '🏥',
      parks: '🌳',
      hospitals: '🏨'
    };
    return icons[this.activeService()];
  });
}
