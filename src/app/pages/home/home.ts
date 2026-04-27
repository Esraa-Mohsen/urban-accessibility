import { Component, OnInit, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { DataService, ServiceType } from '../../services/data';
import { AnimatedCounter } from '../../components/animated-counter/animated-counter';

@Component({
  selector: 'app-home',
  imports: [RouterLink, CommonModule, TranslateModule, AnimatedCounter],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  /** District-wide population-weighted coverage — same formula as dashboard (KML counts vs zone pop). */
  pharmacyCoverage = computed(() => {
    this.dataService.seniorMode();
    return this.dataService.getDistrictPopulationCoverageForService('pharmacy');
  });
  parksCoverage = computed(() => {
    this.dataService.seniorMode();
    return this.dataService.getDistrictPopulationCoverageForService('parks');
  });
  hospitalsCoverage = computed(() => {
    this.dataService.seniorMode();
    return this.dataService.getDistrictPopulationCoverageForService('hospitals');
  });
  totalPopulation = computed(() => this.dataService.getZones().reduce((s, z) => s + z.population, 0));

  // Live service status
  activeService = computed(() => this.dataService.activeService());
  seniorMode = computed(() => this.dataService.seniorMode());

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

  serviceIcon = computed(() => {
    const icons: Record<ServiceType, string> = {
      pharmacy: '🏥',
      parks: '🌳',
      hospitals: '🏨'
    };
    return icons[this.activeService()];
  });

  // Real-time KPIs — read signals in computed so Senior Mode / active service invalidate correctly
  populationCoverage = computed(() => {
    this.dataService.seniorMode();
    this.dataService.activeService();
    return this.dataService.getPopulationCoverage();
  });
  accessibilityScore = computed(() => {
    this.dataService.seniorMode();
    this.dataService.activeService();
    return this.dataService.getOverallAccessibilityScore();
  });

  constructor(public dataService: DataService) {}

  ngOnInit() {
    // Static values are already set, animated counter handles animation
  }
}
