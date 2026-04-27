import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsCards } from '../../components/stats-cards/stats-cards';
import { DataService, Zone, ServiceType } from '../../services/data';
import { TranslateModule } from '@ngx-translate/core';
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, StatsCards, TranslateModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('barChart') barChartRef!: ElementRef;
  @ViewChild('pieChart') pieChartRef!: ElementRef;
  @ViewChild('lineChart') lineChartRef!: ElementRef;

  private barChartInstance: any;
  private pieChartInstance: any;
  private lineChartInstance: any;

  zones: Zone[] = [];

  constructor(public dataService: DataService) {
    effect(() => {
      this.dataService.seniorMode();
      this.dataService.activeService();
      if (this.barChartInstance && this.pieChartInstance && this.lineChartInstance) {
        this.updateCharts();
      }
    });
  }

  ngOnInit() {
    this.zones = this.dataService.getZones(); // KML-synced service counts per zone
  }

  ngAfterViewInit() {
    this.initCharts();
  }

  ngOnDestroy() {
    if (this.barChartInstance) this.barChartInstance.destroy();
    if (this.pieChartInstance) this.pieChartInstance.destroy();
    if (this.lineChartInstance) this.lineChartInstance.destroy();
  }

  /** Coverage % per zone per service — reflects Senior Mode (−20 pts) via DataService. */
  private getBarCoverageSeries(): { pharmacy: number[]; parks: number[]; hospitals: number[] } {
    return {
      pharmacy: this.zones.map(z => this.dataService.getZoneCoverageForService(z, 'pharmacy')),
      parks: this.zones.map(z => this.dataService.getZoneCoverageForService(z, 'parks')),
      hospitals: this.zones.map(z => this.dataService.getZoneCoverageForService(z, 'hospitals')),
    };
  }

  private initCharts() {
    const labels = this.zones.map(z => z.name);
    const svc: ServiceType = this.dataService.activeService();
    const bar = this.getBarCoverageSeries();

    // 1. Bar Chart: modeled access coverage % by service type (same engine as map/KPIs; reacts to Senior Mode)
    this.barChartInstance = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Pharmacies %', data: bar.pharmacy, backgroundColor: '#10b981', borderRadius: 4 },
          { label: 'Parks %', data: bar.parks, backgroundColor: '#f59e0b', borderRadius: 4 },
          { label: 'Hospitals %', data: bar.hospitals, backgroundColor: '#3b82f6', borderRadius: 4 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#cbd5e1' } } },
        scales: {
          y: {
            min: 0,
            max: 100,
            grid: { color: '#334155' },
            ticks: { color: '#94a3b8' }
          },
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
        }
      }
    });

    // 2. Pie Chart: zone distribution by active-service coverage tier
    this.pieChartInstance = new Chart(this.pieChartRef.nativeElement, {
      type: 'pie',
      data: this.getPieData(),
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#cbd5e1' } } } }
    });

    // 3. Line Chart: Population vs coverage % for active service
    this.lineChartInstance = new Chart(this.lineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Population', data: this.zones.map(z => z.population), yAxisID: 'y', borderColor: '#a855f7', backgroundColor: '#a855f720', fill: true, tension: 0.4 },
          { label: 'Coverage %', data: this.zones.map(z => this.dataService.getZoneCoverageForService(z, svc)), yAxisID: 'y1', borderColor: '#10b981', backgroundColor: '#10b981', tension: 0.4 }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#cbd5e1' } } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
          y: { type: 'linear', display: true, position: 'left', grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
          y1: { type: 'linear', display: true, position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  }

  private updateCharts() {
    const svc = this.dataService.activeService();
    const bar = this.getBarCoverageSeries();
    this.barChartInstance.data.datasets[0].data = bar.pharmacy;
    this.barChartInstance.data.datasets[1].data = bar.parks;
    this.barChartInstance.data.datasets[2].data = bar.hospitals;
    this.barChartInstance.update();

    this.pieChartInstance.data = this.getPieData();
    this.pieChartInstance.update();

    this.lineChartInstance.data.datasets[1].data = this.zones.map(z =>
      this.dataService.getZoneCoverageForService(z, svc)
    );
    this.lineChartInstance.update();
  }

  private getPieData() {
    const svc = this.dataService.activeService();
    const coverage = this.zones.map(z => this.dataService.getZoneCoverageForService(z, svc));
    let excellent = 0, good = 0, limited = 0, critical = 0;
    
    coverage.forEach(c => {
      if (c >= 80) excellent++;
      else if (c >= 50) good++;
      else if (c >= 25) limited++;
      else critical++;
    });

    return {
      labels: ['Excellent (5 min)', 'Good (10 min)', 'Limited (15 min)', 'Critical'],
      datasets: [{
        data: [excellent, good, limited, critical],
        backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
        borderWidth: 0
      }]
    };
  }

  getCoverage(zone: Zone) {
    return this.dataService.getZoneCoverageForService(zone, this.dataService.activeService());
  }
}
