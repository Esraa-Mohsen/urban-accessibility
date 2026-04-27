import { Component, OnInit, OnDestroy, computed, effect, signal, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import * as L from 'leaflet';
import { DataService, Zone, ServiceType, CityReport, AISuggestion, ServiceLocation } from '../../services/data';

@Component({
  selector: 'app-map',
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './map.html',
  styleUrl: './map.scss',
})
export class Map implements OnInit, OnDestroy {
  private map: L.Map | undefined;
  private zoneLayers: L.Circle[] = [];
  private selectedZoneHighlight: L.Circle | null = null;
  private zoneBoundaryLayers: L.LayerGroup | null = null;
  private roadNetworkLayer: L.LayerGroup | null = null;
  private buildingBlocksLayer: L.LayerGroup | null = null;
  private publicPlacesLayer: L.LayerGroup | null = null;
  private aiMarkers: L.Marker[] = [];
  private reportMarkers: L.Marker[] = [];
  private serviceMarkers: L.Marker[] = [];
  private sunlightOverlay: HTMLElement | null = null;
  private buildingLayers: L.Polygon[] = [];

  // Toggle for showing real service markers
  showRealServices = signal<boolean>(true);
  showZoneBoundaries = signal<boolean>(true);
  showRoadNetwork = signal<boolean>(true);
  showBuildingBlocks = signal<boolean>(false);
  showPublicPlaces = signal<boolean>(true);

  zones: Zone[] = [];
  selectedZone: Zone | null = null;
  showPanel = signal(false);

  // Fix My City
  showFixModal = signal(false);
  fixDescription = '';
  fixCategory: 'obstacle' | 'need-trees' | 'sidewalk' = 'obstacle';
  fixImageData: string | null = null;
  fixPickingLocation = signal(false);
  fixLat: number | null = null;
  fixLng: number | null = null;
  private fixLocationMarker: L.Marker | null = null;

  // Success message for report submission
  reportSuccessMessage = signal<string | null>(null);

  // Service selector
  activeService = computed(() => this.dataService.activeService());

  // Mobile UI state
  showMobileLayers = signal(false);
  showMobilePanel = signal(false);

  // KPI computed values
  currentCoverage = computed(() => {
    if (!this.selectedZone) return 0;
    // Read seniorMode to make this reactive to Senior Mode changes
    const seniorMode = this.dataService.seniorMode();
    return this.dataService.getZoneCoverageForService(this.selectedZone, this.activeService());
  });

  accessibilityScore = computed(() => {
    // Read seniorMode to make this reactive to Senior Mode changes
    const seniorMode = this.dataService.seniorMode();
    return this.dataService.getOverallAccessibilityScore();
  });

  populationCoverage = computed(() => {
    // Read seniorMode to make this reactive to Senior Mode changes
    const seniorMode = this.dataService.seniorMode();
    return this.dataService.getPopulationCoverage();
  });

  // AI suggestion for selected zone (recomputes on zone, service, senior mode)
  currentAISuggestion = computed((): AISuggestion | null => {
    if (!this.selectedZone) return null;
    this.dataService.seniorMode();
    this.dataService.activeService();
    return this.dataService.getAISuggestionForZone(this.selectedZone.id);
  });

  constructor(public dataService: DataService, private ngZone: NgZone) {
    // React to service change — update zone colors and service markers
    effect(() => {
      const service = this.dataService.activeService();
      this.updateZoneColors(service);
      this.addRealServiceMarkers();
    });

    // React to real services toggle
    effect(() => {
      const show = this.showRealServices();
      this.addRealServiceMarkers();
    });

    // React to senior mode change
    effect(() => {
      const isSenior = this.dataService.seniorMode();
      // Update zone colors when senior mode changes
      this.updateZoneColors(this.dataService.activeService());
      // Update zone circle radii for seniors (smaller walking areas)
      const seniorFactor = isSenior ? 0.7 : 1; // 30% smaller for seniors
      this.zoneLayers.forEach((circle, index) => {
        const zone = this.zones[index];
        if (zone) {
          circle.setRadius(zone.radius * seniorFactor);
          // Also reduce opacity for seniors to indicate lower coverage
          circle.setStyle({
            fillOpacity: isSenior ? 0.25 : 0.4,
            weight: isSenior ? 2 : 3
          });
        }
      });
    });

    // AI map pins follow active service + senior mode (same formulas as side panel)
    effect(() => {
      this.dataService.seniorMode();
      this.dataService.activeService();
      if (!this.map) return;
      this.refreshAIMarkers();
    });

    // React to new city reports
    effect(() => {
      const reports = this.dataService.cityReports();
      this.renderReportMarkers(reports);
    });
  }

  ngOnInit() {
    this.zones = this.dataService.getZones();
    this.initMap();

    // Add resize listener for responsive map
    window.addEventListener('resize', this.handleResize);

    // Wait for map to be fully ready before adding layers
    // This fixes the partial circle rendering issue
    if (this.map) {
      this.map.whenReady(() => {
        // Force map to calculate correct size
        this.map!.invalidateSize();

        // Use requestAnimationFrame to ensure DOM is fully painted
        requestAnimationFrame(() => {
          this.addZoneBoundaries();
          this.addRoadNetwork();
          this.addBuildingBlocks();
          this.addPublicPlaces();
          this.addSunlightOverlay();
          this.addAIMarkers();
          this.addRealServiceMarkers();

          // Force another invalidate after all layers added
          setTimeout(() => {
            this.map?.invalidateSize();
            this.map?.invalidateSize(); // Second call ensures proper rendering
          }, 100);
        });
      });
    }
  }

  ngOnDestroy() {
    if (this.map) {
      this.map.remove();
    }
    // Remove resize listener
    window.removeEventListener('resize', this.handleResize);
  }

  private handleResize = () => {
    if (this.map) {
      // Small delay to allow container to settle
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 100);
    }
  };

  selectService(service: ServiceType) {
    this.dataService.activeService.set(service);
  }

  selectZone(zone: Zone) {
    this.ngZone.run(() => {
      this.selectedZone = zone;
      this.showPanel.set(true);
      // Auto-show mobile panel when zone selected
      this.showMobilePanel.set(true);
    });

    // Add visual highlight on the map
    this.highlightSelectedZone(zone);
  }

  private highlightSelectedZone(zone: Zone) {
    if (!this.map) return;

    // Remove previous highlight
    if (this.selectedZoneHighlight) {
      this.selectedZoneHighlight.remove();
      this.selectedZoneHighlight = null;
    }

    // Create a pulsing highlight circle around selected zone
    this.selectedZoneHighlight = L.circle(zone.coords, {
      color: '#ffffff',
      fillColor: 'transparent',
      fillOpacity: 0,
      radius: zone.radius + 50, // Slightly larger than zone
      weight: 4,
      dashArray: '8, 8',
      className: 'selected-zone-pulse'
    }).addTo(this.map);

    // Animate the highlight
    const animate = () => {
      if (!this.selectedZoneHighlight) return;
      // The CSS animation will handle the pulsing effect
    };
    animate();

    // Pan to the selected zone smoothly
    this.map.flyTo(zone.coords, 15, {
      duration: 1,
      easeLinearity: 0.25
    });
  }

  getZoneColor(zone: Zone): string {
    return this.dataService.getZoneColorForService(zone, this.activeService());
  }

  // ── Fix My City ──
  openFixModal() {
    // Reset form when opening modal
    this.showFixModal.set(true);
    this.fixDescription = '';
    this.fixCategory = 'obstacle';
    this.fixImageData = null;
    this.fixLat = null;
    this.fixLng = null;
    this.fixPickingLocation.set(false);
    // Remove any previous location marker
    if (this.fixLocationMarker) {
      this.fixLocationMarker.remove();
      this.fixLocationMarker = null;
    }
  }

  closeFixModal() {
    this.showFixModal.set(false);
    this.fixPickingLocation.set(false);
    if (this.fixLocationMarker) {
      this.fixLocationMarker.remove();
      this.fixLocationMarker = null;
    }
  }

  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.ngZone.run(() => {
          this.fixImageData = e.target?.result as string;
        });
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  startPickLocation() {
    this.fixPickingLocation.set(true);
    // Set up one-time click handler on map
    if (this.map) {
      this.map.once('click', (e: L.LeafletMouseEvent) => {
        this.ngZone.run(() => {
          this.fixLat = e.latlng.lat;
          this.fixLng = e.latlng.lng;
          this.fixPickingLocation.set(false);

          if (this.fixLocationMarker) this.fixLocationMarker.remove();
          this.fixLocationMarker = L.marker([e.latlng.lat, e.latlng.lng], {
            icon: L.divIcon({
              className: '',
              html: '<div style="width:20px;height:20px;background:#f59e0b;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>',
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(this.map!);

          // Re-open the modal after location is picked
          this.showFixModal.set(true);
        });
      });
    }
  }

  submitReport() {
    if (!this.fixDescription.trim() || !this.fixLat || !this.fixLng) return;

    // Add the report
    this.dataService.addCityReport({
      image: this.fixImageData,
      description: this.fixDescription,
      category: this.fixCategory,
      lat: this.fixLat,
      lng: this.fixLng
    });

    // Show success message
    this.reportSuccessMessage.set('✅ Report submitted successfully! Thank you for helping improve the city.');

    // Close modal
    this.closeFixModal();

    // Clear success message after 5 seconds
    setTimeout(() => {
      this.reportSuccessMessage.set(null);
    }, 5000);
  }

  // ═══ MAP INIT ═══
  private initMap() {
    // Use preferCanvas for better performance with many markers
    this.map = L.map('accessibility-map', {
      zoomControl: false,
      attributionControl: false,
      preferCanvas: true
    }).setView([30.5965, 32.2715], 14);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);

    // Add zone circles with better visibility
    const defaultService = this.dataService.activeService();
    this.zones.forEach(zone => {
      const isoData = this.dataService.getIsochroneForZone(zone.id, defaultService);
      const circle = L.circle(zone.coords, {
        color: isoData.color,
        fillColor: isoData.color,
        fillOpacity: 0.4,  // Increased for better visibility
        radius: zone.radius,
        weight: 3,         // Thicker border
        className: zone.status === 'critical' ? 'critical-zone-circle' : ''
      }).addTo(this.map!);

      circle.on('click', () => this.selectZone(zone));

      // Label
      const label = L.divIcon({
        className: '',
        html: `<div style="color:white;font-size:10px;font-weight:700;text-shadow:0 1px 4px rgba(0,0,0,0.8);white-space:nowrap;pointer-events:none;">${zone.name}</div>`,
        iconSize: [100, 16],
        iconAnchor: [50, 8]
      });
      L.marker(zone.coords, { icon: label, interactive: false }).addTo(this.map!);

      this.zoneLayers.push(circle);

      if (zone.id === 'z3') {
        this.selectedZone = zone;
        this.showPanel.set(true);
      }
    });

    // Fix My City map click handler when picking
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      // Only process when picking location is active
    });
  }

  // ═══ ISOCHRONE: Update zone colors on service change ═══
  private updateZoneColors(service: ServiceType) {
    this.zoneLayers.forEach((circle, i) => {
      const zone = this.zones[i];
      if (zone) {
        const isoData = this.dataService.getIsochroneForZone(zone.id, service);
        circle.setStyle({
          color: isoData.color,
          fillColor: isoData.color,
          fillOpacity: 0.25
        });
      }
    });
  }

  // ═══ SIMULATED 3D: Building Polygons ═══
  private addBuildingPolygons() {
    const buildings: [number, number][][] = [
      [[30.6050, 32.2710], [30.6055, 32.2710], [30.6055, 32.2720], [30.6050, 32.2720]],
      [[30.6035, 32.2730], [30.6040, 32.2730], [30.6040, 32.2738], [30.6035, 32.2738]],
      [[30.6060, 32.2700], [30.6063, 32.2700], [30.6063, 32.2706], [30.6060, 32.2706]],
      [[30.6025, 32.2740], [30.6030, 32.2740], [30.6030, 32.2748], [30.6025, 32.2748]],
      [[30.6015, 32.2590], [30.6020, 32.2590], [30.6020, 32.2598], [30.6015, 32.2598]],
      [[30.5895, 32.2840], [30.5900, 32.2840], [30.5900, 32.2850], [30.5895, 32.2850]],
      [[30.6115, 32.2715], [30.6120, 32.2715], [30.6120, 32.2725], [30.6115, 32.2725]],
      [[30.5905, 32.2610], [30.5910, 32.2610], [30.5910, 32.2618], [30.5905, 32.2618]],
    ];

    buildings.forEach(coords => {
      const poly = L.polygon(coords as L.LatLngExpression[], {
        color: 'rgba(148, 163, 184, 0.4)',
        fillColor: 'rgba(148, 163, 184, 0.15)',
        fillOpacity: 1,
        weight: 1,
      }).addTo(this.map!);
      this.buildingLayers.push(poly);
    });
  }

  // ═══ SUNLIGHT / TIME-BASED OVERLAY ═══
  private addSunlightOverlay() {
    if (!this.map) return;
    const container = this.map.getContainer();
    this.sunlightOverlay = document.createElement('div');
    this.sunlightOverlay.className = 'sunlight-overlay';
    this.updateSunlightGradient();
    container.appendChild(this.sunlightOverlay);

    // Update every 60 seconds
    setInterval(() => this.updateSunlightGradient(), 60000);
  }

  private updateSunlightGradient() {
    if (!this.sunlightOverlay) return;
    const hour = new Date().getHours();
    // Sun angle: morning = left, noon = top, evening = right
    let angle = 180;
    let warmth = 'rgba(255, 200, 100, 0.1)';

    if (hour >= 6 && hour < 10) {
      angle = 240 + (hour - 6) * 15;
      warmth = 'rgba(255, 180, 80, 0.12)';
    } else if (hour >= 10 && hour < 14) {
      angle = 180;
      warmth = 'rgba(255, 220, 130, 0.08)';
    } else if (hour >= 14 && hour < 18) {
      angle = 120 - (hour - 14) * 15;
      warmth = 'rgba(255, 150, 50, 0.12)';
    } else {
      warmth = 'rgba(40, 50, 120, 0.15)';
      angle = 180;
    }

    this.sunlightOverlay.style.background = `linear-gradient(${angle}deg, ${warmth}, transparent 60%)`;
  }

  // ═══ AI SUGGESTION MARKERS ═══
  private refreshAIMarkers() {
    this.aiMarkers.forEach(m => m.remove());
    this.aiMarkers = [];
    this.addAIMarkers();
  }

  private addAIMarkers() {
    if (!this.map) return;
    const suggestions = this.dataService.getAllAISuggestions();
    suggestions.forEach(s => {
      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(139,92,246,0.3);animation:pulse-ring 1.5s cubic-bezier(0.215,0.61,0.355,1) infinite;"></div>
            <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#3b82f6);border:2px solid white;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 12px rgba(139,92,246,0.5);z-index:1;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            </div>
          </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      const marker = L.marker(s.coords, { icon }).addTo(this.map!);
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;padding:4px 0;min-width:180px;">
          <div style="font-size:10px;color:#8b5cf6;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">🤖 AI Suggestion</div>
          <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#1e293b;">${s.title}</div>
          <div style="font-size:11px;color:#64748b;">Type: <strong>${s.serviceType}</strong></div>
          <div style="font-size:11px;color:#64748b;">Serves: <strong>${s.populationServed.toLocaleString()}</strong> residents</div>
          <div style="font-size:11px;color:#64748b;">Impact: <strong style="color:#10b981;">+${s.impactPercent}%</strong></div>
        </div>
      `, { className: 'ai-popup' });
      this.aiMarkers.push(marker);
    });
  }

  // ═══ REAL SERVICE MARKERS (with Icons) ═══
  private addRealServiceMarkers() {
    if (!this.map) return;

    // Clear existing markers
    this.serviceMarkers.forEach(m => m.remove());
    this.serviceMarkers = [];

    if (!this.showRealServices()) return;

    const services = this.dataService.getRealServices();
    const activeServiceType = this.activeService();

    // Filter services based on active service type
    const filteredServices = services.filter(s => {
      if (activeServiceType === 'pharmacy') return s.type === 'pharmacy';
      if (activeServiceType === 'hospitals') return s.type === 'hospital';
      if (activeServiceType === 'parks') return s.type === 'park';
      return false;
    });

    // Simple colored circle icons with emoji
    const iconColors: Record<string, string> = {
      hospital: '#ef4444',
      pharmacy: '#10b981',
      park: '#f59e0b',
      school: '#3b82f6',
      club: '#8b5cf6',
      mosque: '#6366f1'
    };

    const iconEmojis: Record<string, string> = {
      hospital: '🏥',
      pharmacy: '💊',
      park: '🌳',
      school: '🏫',
      club: '🏛️',
      mosque: '🕌'
    };

    // Create icons using simple SVG for better performance than divIcon
    filteredServices.forEach(service => {
      const color = iconColors[service.type] || '#64748b';
      const emoji = iconEmojis[service.type] || '📍';

      // Create simple SVG icon
      const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
          <text x="16" y="21" font-size="14" text-anchor="middle">${emoji}</text>
        </svg>
      `;

      const icon = L.divIcon({
        className: 'service-icon-marker',
        html: svgIcon,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker(service.coords, { icon }).addTo(this.map!);

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;padding:4px;min-width:160px;">
          <div style="font-size:11px;color:${color};font-weight:700;text-transform:uppercase;margin-bottom:4px;">${iconEmojis[service.type] || ''} ${service.type}</div>
          <div style="font-weight:700;font-size:13px;color:#1e293b;">${service.name}</div>
        </div>
      `);
      this.serviceMarkers.push(marker);
    });
  }

  toggleRealServices() {
    this.showRealServices.update(v => !v);
    this.addRealServiceMarkers();
  }

  // ═══ ZONE BOUNDARIES (Polygons) ═══
  private addZoneBoundaries() {
    if (!this.map) return;
    
    this.zoneBoundaryLayers = L.layerGroup().addTo(this.map);
    const boundaries = this.dataService.getZoneBoundaries();
    
    boundaries.forEach(zone => {
      // Convert polygon coordinates to Leaflet format [lat, lng]
      const latLngs = zone.polygon.map(coord => L.latLng(coord[0], coord[1]));
      
      const polygon = L.polygon(latLngs, {
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.1,
        weight: 2,
        dashArray: '5, 10',
        lineCap: 'round'
      }).addTo(this.zoneBoundaryLayers!);
      
      polygon.bindPopup(`
        <div style="font-family:Inter,sans-serif;padding:4px;">
          <div style="font-weight:700;font-size:13px;color:#1e293b;">${zone.name}</div>
          <div style="font-size:11px;color:#64748b;">Population: ${zone.population.toLocaleString()}</div>
          <div style="font-size:11px;color:#64748b;">Area: ${zone.areaKm2} km²</div>
          <div style="font-size:11px;color:#64748b;">Density: ${zone.density.toLocaleString()}/km²</div>
        </div>
      `);
    });
  }

  toggleZoneBoundaries() {
    this.showZoneBoundaries.update(v => !v);
    if (this.zoneBoundaryLayers) {
      if (this.showZoneBoundaries()) {
        this.zoneBoundaryLayers.addTo(this.map!);
      } else {
        this.zoneBoundaryLayers.removeFrom(this.map!);
      }
    }
  }

  // ═══ ROAD NETWORK ═══
  private addRoadNetwork() {
    if (!this.map) return;
    
    this.roadNetworkLayer = L.layerGroup().addTo(this.map);
    const roads = this.dataService.getRoadNetwork();
    
    const roadColors: Record<string, string> = {
      main: '#f59e0b',
      secondary: '#64748b',
      residential: '#94a3b8',
      pedestrian: '#10b981',
      highway: '#ef4444'
    };
    
    const roadWeights: Record<string, number> = {
      main: 4,
      secondary: 3,
      residential: 2,
      pedestrian: 2,
      highway: 5
    };
    
    roads.forEach(road => {
      const latLngs = road.coords.map(coord => L.latLng(coord[0], coord[1]));
      
      const polyline = L.polyline(latLngs, {
        color: roadColors[road.type] || '#94a3b8',
        weight: roadWeights[road.type] || 2,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.roadNetworkLayer!);
      
      if (road.name) {
        polyline.bindPopup(`
          <div style="font-family:Inter,sans-serif;padding:4px;">
            <div style="font-weight:700;font-size:12px;color:#1e293b;">${road.name}</div>
            <div style="font-size:10px;color:#64748b;">${road.type} • ${road.length}m • ${road.lanes} lanes</div>
          </div>
        `);
      }
    });
  }

  toggleRoadNetwork() {
    this.showRoadNetwork.update(v => !v);
    if (this.roadNetworkLayer) {
      if (this.showRoadNetwork()) {
        this.roadNetworkLayer.addTo(this.map!);
      } else {
        this.roadNetworkLayer.removeFrom(this.map!);
      }
    }
  }

  // ═══ BUILDING BLOCKS ═══
  private addBuildingBlocks() {
    if (!this.map) return;
    
    this.buildingBlocksLayer = L.layerGroup();
    // Initially hidden by default (too many markers can slow down)
    if (this.showBuildingBlocks()) {
      this.buildingBlocksLayer.addTo(this.map);
    }
    
    const blocks = this.dataService.getBuildingBlocks();
    
    blocks.forEach(block => {
      const color = block.type === 'residential' ? '#3b82f6' : 
                    block.type === 'commercial' ? '#f59e0b' : 
                    block.type === 'mixed' ? '#8b5cf6' : '#64748b';
      
      // Use small circles for buildings (better performance than polygons)
      const circle = L.circleMarker(block.coords, {
        radius: 6,
        fillColor: color,
        color: '#ffffff',
        weight: 1,
        fillOpacity: 0.7
      }).addTo(this.buildingBlocksLayer!);
      
      circle.bindPopup(`
        <div style="font-family:Inter,sans-serif;padding:4px;min-width:140px;">
          <div style="font-weight:700;font-size:12px;color:#1e293b;">${block.name || 'Building Block'}</div>
          <div style="font-size:10px;color:#64748b;">Type: ${block.type}</div>
          <div style="font-size:10px;color:#64748b;">Population: ${block.population}</div>
          <div style="font-size:10px;color:#64748b;">Buildings: ${block.buildingCount} • Floors: ${block.floorCount}</div>
        </div>
      `);
    });
  }

  toggleBuildingBlocks() {
    this.showBuildingBlocks.update(v => !v);
    if (this.buildingBlocksLayer) {
      if (this.showBuildingBlocks()) {
        this.buildingBlocksLayer.addTo(this.map!);
      } else {
        this.buildingBlocksLayer.removeFrom(this.map!);
      }
    }
  }

  // ═══ PUBLIC PLACES ═══
  private addPublicPlaces() {
    if (!this.map) return;
    
    this.publicPlacesLayer = L.layerGroup().addTo(this.map);
    const places = this.dataService.getPublicPlaces();
    
    const icons: Record<string, string> = {
      bank: '🏦',
      post_office: '📮',
      fuel: '⛽',
      supermarket: '🏪',
      market: '🛒',
      shop: '🛍️',
      restaurant: '🍽️',
      cafe: '☕',
      gym: '💪',
      police: '👮',
      fire_station: '🚒'
    };
    
    const colors: Record<string, string> = {
      bank: '#3b82f6',
      post_office: '#f59e0b',
      fuel: '#ef4444',
      supermarket: '#10b981',
      market: '#8b5cf6',
      shop: '#6366f1',
      restaurant: '#f97316',
      cafe: '#a855f7',
      gym: '#14b8a6',
      police: '#1e293b',
      fire_station: '#dc2626'
    };
    
    places.forEach(place => {
      const icon = L.divIcon({
        className: 'public-place-marker',
        html: `
          <div style="width:24px;height:24px;background:${colors[place.type] || '#64748b'};border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;">
            ${icons[place.type] || '📍'}
          </div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });
      
      const marker = L.marker(place.coords, { icon }).addTo(this.publicPlacesLayer!);
      
      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;padding:4px;min-width:160px;">
          <div style="font-size:10px;color:${colors[place.type] || '#64748b'};font-weight:700;text-transform:uppercase;">${place.type}</div>
          <div style="font-weight:700;font-size:13px;color:#1e293b;">${place.name}</div>
          ${place.address ? `<div style="font-size:11px;color:#64748b;">📍 ${place.address}</div>` : ''}
        </div>
      `);
    });
  }

  togglePublicPlaces() {
    this.showPublicPlaces.update(v => !v);
    if (this.publicPlacesLayer) {
      if (this.showPublicPlaces()) {
        this.publicPlacesLayer.addTo(this.map!);
      } else {
        this.publicPlacesLayer.removeFrom(this.map!);
      }
    }
  }

  // ═══ FIX MY CITY REPORT MARKERS ═══
  private renderReportMarkers(reports: CityReport[]) {
    // Clear old markers
    this.reportMarkers.forEach(m => m.remove());
    this.reportMarkers = [];

    if (!this.map) return;

    reports.forEach(report => {
      const catColors: Record<string, string> = {
        'obstacle': '#ef4444',
        'need-trees': '#10b981',
        'sidewalk': '#f59e0b'
      };
      const color = catColors[report.category] || '#ef4444';
      const catLabels: Record<string, string> = {
        'obstacle': '🚧 Obstacle',
        'need-trees': '🌳 Need Trees',
        'sidewalk': '🚶 Sidewalk Issue'
      };

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:18px;height:18px;background:${color};border-radius:50%;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });
      const marker = L.marker([report.lat, report.lng], { icon }).addTo(this.map!);

      const imgHtml = report.image
        ? `<img src="${report.image}" style="width:100%;border-radius:6px;margin-bottom:6px;max-height:120px;object-fit:cover;" />`
        : '';

      marker.bindPopup(`
        <div style="font-family:Inter,sans-serif;min-width:180px;max-width:220px;">
          ${imgHtml}
          <div style="font-size:10px;font-weight:700;color:${color};text-transform:uppercase;margin-bottom:4px;">${catLabels[report.category]}</div>
          <div style="font-size:12px;color:#334155;line-height:1.4;">${report.description}</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:6px;">${new Date(report.timestamp).toLocaleDateString()}</div>
        </div>
      `);

      this.reportMarkers.push(marker);
    });
  }
}
