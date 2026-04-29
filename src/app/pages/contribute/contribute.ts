import {
  Component,
  computed,
  signal,
  ViewChild,
  ElementRef,
  OnDestroy,
  NgZone,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RouterLink } from '@angular/router';
import * as L from 'leaflet';
import { DataService, ServiceSubmission } from '../../services/data';

@Component({
  selector: 'app-contribute',
  imports: [CommonModule, FormsModule, TranslateModule, RouterLink],
  templateUrl: './contribute.html',
  styleUrl: './contribute.scss',
})
export class Contribute implements OnDestroy {
  @ViewChild('mapPickHost') private mapPickHost?: ElementRef<HTMLElement>;

  private pickMap?: L.Map;
  private pickMarker?: L.Marker;

  showForm = signal(false);
  submitting = signal(false);
  submitted = signal(false);

  serviceNameAr = '';
  serviceNameEn = '';
  serviceType: ServiceSubmission['type'] = 'pharmacy';
  address = '';
  coords: [number, number] | null = null;
  submittedBy = 'Anonymous';
  geoMessage = signal<string | null>(null);

  /** Filter by service type; `all` shows every visible community entry. */
  typeFilter = signal<'all' | ServiceSubmission['type']>('all');

  /** Newest first; excludes rejected legacy rows. */
  visibleSubmissions = computed(() => {
    const rows = this.dataService
      .serviceSubmissions()
      .filter(s => s.status !== 'rejected');
    const t = this.typeFilter();
    const filtered = t === 'all' ? rows : rows.filter(s => s.type === t);
    return [...filtered].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    );
  });

  totalCommunityCount = computed(
    () => this.dataService.serviceSubmissions().filter(s => s.status !== 'rejected').length
  );

  typeFilterOptions: { value: 'all' | ServiceSubmission['type']; label: string }[] = [
    { value: 'all', label: 'FILTER_ALL' },
    { value: 'pharmacy', label: 'TYPE_PHARMACY' },
    { value: 'hospital', label: 'TYPE_HOSPITAL' },
    { value: 'park', label: 'TYPE_PARK' },
    { value: 'school', label: 'TYPE_SCHOOL' },
    { value: 'mosque', label: 'TYPE_MOSQUE' },
    { value: 'club', label: 'TYPE_CLUB' },
    { value: 'shop', label: 'TYPE_SHOP' },
    { value: 'bank', label: 'TYPE_BANK' },
    { value: 'post_office', label: 'TYPE_POST_OFFICE' },
    { value: 'fuel', label: 'TYPE_FUEL' },
    { value: 'market', label: 'TYPE_MARKET' },
    { value: 'supermarket', label: 'TYPE_SUPERMARKET' },
  ];

  constructor(public dataService: DataService, private ngZone: NgZone) {}

  ngOnDestroy() {
    this.destroyPickMap();
  }

  setTypeFilter(value: string) {
    this.typeFilter.set(value as 'all' | ServiceSubmission['type']);
  }

  openForm() {
    this.destroyPickMap();
    this.showForm.set(true);
    this.submitted.set(false);
    this.resetForm();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => this.ensurePickMap());
    });
  }

  closeForm() {
    this.destroyPickMap();
    this.showForm.set(false);
    this.resetForm();
  }

  resetForm() {
    this.serviceNameAr = '';
    this.serviceNameEn = '';
    this.serviceType = 'pharmacy';
    this.address = '';
    this.coords = null;
    this.submittedBy = 'Anonymous';
    this.geoMessage.set(null);
  }

  useGeolocation() {
    if (!navigator.geolocation) {
      this.geoMessage.set('GEO_UNSUPPORTED');
      return;
    }
    this.geoMessage.set('GEO_WAIT');
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.ngZone.run(() => {
          this.coords = [lat, lng];
          this.syncPickMarker([lat, lng]);
          this.geoMessage.set('GEO_OK');
        });
      },
      () => {
        this.ngZone.run(() => {
          this.geoMessage.set('GEO_DENIED');
        });
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 }
    );
  }

  private syncPickMarker(c: [number, number]) {
    if (!this.pickMap) return;
    if (this.pickMarker) {
      this.pickMap.removeLayer(this.pickMarker);
      this.pickMarker = undefined;
    }
    this.pickMarker = L.marker(c).addTo(this.pickMap);
    this.pickMap.setView(c, 16);
    setTimeout(() => this.pickMap?.invalidateSize(), 80);
  }

  private ensurePickMap() {
    if (!this.showForm() || this.submitted()) return;
    const el = this.mapPickHost?.nativeElement;
    if (!el || this.pickMap) return;

    const start: [number, number] = this.coords ?? [30.5965, 32.2715];
    this.pickMap = L.map(el, {
      zoomControl: true,
      attributionControl: false,
    }).setView(start, this.coords ? 16 : 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.pickMap);

    if (this.coords) {
      this.pickMarker = L.marker(this.coords).addTo(this.pickMap);
    }

    this.pickMap.on('click', (e: L.LeafletMouseEvent) => {
      const ll = e.latlng;
      this.ngZone.run(() => {
        this.coords = [ll.lat, ll.lng];
        if (this.pickMarker) this.pickMap!.removeLayer(this.pickMarker);
        this.pickMarker = L.marker([ll.lat, ll.lng]).addTo(this.pickMap!);
        this.geoMessage.set(null);
      });
    });

    setTimeout(() => this.pickMap?.invalidateSize(), 150);
  }

  private destroyPickMap() {
    if (this.pickMarker) {
      try {
        this.pickMap?.removeLayer(this.pickMarker);
      } catch {
        /* ignore */
      }
      this.pickMarker = undefined;
    }
    if (this.pickMap) {
      this.pickMap.remove();
      this.pickMap = undefined;
    }
  }

  submitForm() {
    if (!this.serviceNameAr?.trim() || !this.coords) return;

    this.submitting.set(true);
    this.dataService.submitService({
      name: this.serviceNameAr.trim(),
      nameEn: this.serviceNameEn?.trim() || undefined,
      type: this.serviceType,
      coords: this.coords,
      address: this.address?.trim() || undefined,
      submittedBy: this.submittedBy?.trim() || 'Anonymous',
    });

    setTimeout(() => {
      this.submitting.set(false);
      this.submitted.set(true);
      setTimeout(() => this.closeForm(), 2800);
    }, 450);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  serviceTypes: { value: ServiceSubmission['type']; label: string }[] = [
    { value: 'hospital', label: 'TYPE_HOSPITAL' },
    { value: 'pharmacy', label: 'TYPE_PHARMACY' },
    { value: 'school', label: 'TYPE_SCHOOL' },
    { value: 'park', label: 'TYPE_PARK' },
    { value: 'club', label: 'TYPE_CLUB' },
    { value: 'mosque', label: 'TYPE_MOSQUE' },
    { value: 'shop', label: 'TYPE_SHOP' },
    { value: 'bank', label: 'TYPE_BANK' },
    { value: 'post_office', label: 'TYPE_POST_OFFICE' },
    { value: 'fuel', label: 'TYPE_FUEL' },
    { value: 'market', label: 'TYPE_MARKET' },
    { value: 'supermarket', label: 'TYPE_SUPERMARKET' },
  ];
}
