import { Component, OnInit, signal, computed, effect } from '@angular/core';
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
  pharmacyCoverage = signal(62);
  parksCoverage = signal(51);
  hospitalsCoverage = signal(47);
  totalPopulation = signal(55800);

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

  // Real-time KPIs from data service
  populationCoverage = computed(() => this.dataService.getPopulationCoverage());
  accessibilityScore = computed(() => this.dataService.getOverallAccessibilityScore());

  constructor(public dataService: DataService) {
    // React to service/senior mode changes for live updates
    effect(() => {
      const _ = this.dataService.activeService();
      const __ = this.dataService.seniorMode();
      // Triggers re-computation of populationCoverage and accessibilityScore
    });
  }

  ngOnInit() {
    // Static values are already set, animated counter handles animation
  }
}
