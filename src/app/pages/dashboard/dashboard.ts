import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsCards } from '../../components/stats-cards/stats-cards';
import { DataService, Zone } from '../../services/data';
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
      // Re-render charts when senior mode changes
      const isSenior = this.dataService.seniorMode();
      if (this.barChartInstance && this.pieChartInstance && this.lineChartInstance) {
        this.updateCharts(isSenior);
      }
    });
  }

  ngOnInit() {
    this.zones = this.dataService.getZones();
  }

  ngAfterViewInit() {
    this.initCharts();
  }

  ngOnDestroy() {
    if (this.barChartInstance) this.barChartInstance.destroy();
    if (this.pieChartInstance) this.pieChartInstance.destroy();
    if (this.lineChartInstance) this.lineChartInstance.destroy();
  }

  private initCharts() {
    const isSenior = this.dataService.seniorMode();
    const labels = this.zones.map(z => z.name);
    const factor = isSenior ? 0.7 : 1;

    // 1. Bar Chart: Services Coverage
    this.barChartInstance = new Chart(this.barChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Pharmacies', data: this.zones.map(z => Math.round(z.services.pharmacies * 8 * factor)), backgroundColor: '#10b981', borderRadius: 4 },
          { label: 'Parks', data: this.zones.map(z => Math.round(z.services.parks * 15 * factor)), backgroundColor: '#f59e0b', borderRadius: 4 },
          { label: 'Hospitals', data: this.zones.map(z => Math.round(z.services.hospitals * 40 * factor)), backgroundColor: '#3b82f6', borderRadius: 4 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#cbd5e1' } } }, scales: { y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } }, x: { grid: { display: false }, ticks: { color: '#94a3b8' } } } }
    });

    // 2. Pie Chart: Accessibility Distribution
    this.pieChartInstance = new Chart(this.pieChartRef.nativeElement, {
      type: 'pie',
      data: this.getPieData(isSenior),
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#cbd5e1' } } } }
    });

    // 3. Line Chart: Population vs Coverage
    this.lineChartInstance = new Chart(this.lineChartRef.nativeElement, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          { label: 'Population', data: this.zones.map(z => z.population), yAxisID: 'y', borderColor: '#a855f7', backgroundColor: '#a855f720', fill: true, tension: 0.4 },
          { label: 'Coverage %', data: this.getCoverageData(isSenior), yAxisID: 'y1', borderColor: '#10b981', backgroundColor: '#10b981', tension: 0.4 }
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

  private updateCharts(isSenior: boolean) {
    // Bar chart: scale service scores down in senior mode (reduced effective coverage)
    const factor = isSenior ? 0.7 : 1;
    this.barChartInstance.data.datasets[0].data = this.zones.map(z => Math.round(z.services.pharmacies * 8 * factor));
    this.barChartInstance.data.datasets[1].data = this.zones.map(z => Math.round(z.services.parks * 15 * factor));
    this.barChartInstance.data.datasets[2].data = this.zones.map(z => Math.round(z.services.hospitals * 40 * factor));
    this.barChartInstance.update();

    // Pie chart: recalculate distribution
    this.pieChartInstance.data = this.getPieData(isSenior);
    this.pieChartInstance.update();

    // Line chart: update coverage line
    this.lineChartInstance.data.datasets[1].data = this.getCoverageData(isSenior);
    this.lineChartInstance.update();
  }

  private getCoverageData(isSenior: boolean) {
    return this.zones.map(z => isSenior ? Math.max(0, z.baseCoverage - 20) : z.baseCoverage);
  }

  private getPieData(isSenior: boolean) {
    const coverage = this.getCoverageData(isSenior);
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
    return this.dataService.seniorMode() ? Math.max(0, zone.baseCoverage - 20) : zone.baseCoverage;
  }
}
