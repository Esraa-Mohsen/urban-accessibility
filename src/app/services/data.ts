import { Injectable, signal } from '@angular/core';

export interface AccessibilityIssue {
  id: string;
  type: string;
  location: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  votes: number;
}

export interface Suggestion {
  id: string;
  title: string;
  description: string;
  author: string;
  date: string;
}

export interface Zone {
  id: string;
  name: string;
  color: string;
  coords: [number, number];
  radius: number;
  population: number;
  baseCoverage: number;
  services: { pharmacies: number; hospitals: number; parks: number; schools: number };
  suggestion?: string;
  status?: string;
}

// Isochrone coverage per service type per zone
export interface IsochroneData {
  zoneId: string;
  pharmacy: number;   // coverage %
  parks: number;
  hospitals: number;
  color: string;       // computed color for this service
  tier: '5min' | '10min' | '15min' | 'underserved';
}

// Fix My City report
export interface CityReport {
  id: string;
  image: string | null;  // base64 data URL
  description: string;
  category: 'obstacle' | 'need-trees' | 'sidewalk';
  lat: number;
  lng: number;
  timestamp: string;
}

// Service Submission (Crowdsourcing)
export interface ServiceSubmission {
  id: string;
  name: string;
  nameEn?: string;
  type: 'hospital' | 'pharmacy' | 'school' | 'park' | 'club' | 'mosque' |
         'shop' | 'bank' | 'post_office' | 'fuel' | 'market' | 'supermarket';
  coords: [number, number];
  address?: string;
  zoneId?: string;
  /** `published` = visible community suggestion; legacy JSON may still have pending/approved/rejected. */
  status: 'published' | 'pending' | 'approved' | 'rejected';
  submittedBy: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
}

export type AIServiceTypeKey = 'PHARMACY' | 'PARKS' | 'HOSPITALS';

// AI Suggestion marker
export interface AISuggestion {
  zoneId: string;
  zoneName: string;
  zonePopulation: number;
  serviceTypeKey: AIServiceTypeKey;
  coords: [number, number];
  /** Short label for map popups (Latin). */
  title: string;
  populationServed: number;
  impactPercent: number;
  gapPercent: number;
  targetCoverage: number;
  seniorCopy: boolean;
}

export type ServiceType = 'pharmacy' | 'parks' | 'hospitals';

/** Approximate share 60+ (CAPMAS-style urban estimate) — used for Senior Mode “people served”. */
export const SENIOR_POPULATION_SHARE = 0.135;

/** Expected people served by one well-placed facility as a share of the uncovered population. */
const NEW_SITE_GAP_CAPTURE = 0.16;

// ═══ Real Service Locations from KML Data ═══
export interface ServiceLocation {
  id: string;
  name: string;
  type: 'hospital' | 'pharmacy' | 'school' | 'park' | 'club' | 'mosque' |
         'shop' | 'bank' | 'post_office' | 'fuel' | 'market' | 'supermarket';
  coords: [number, number]; // [latitude, longitude]
  zoneId?: string;
}

// ═══ Administrative Zone Boundaries (Polygons) ═══
export interface ZoneBoundary {
  id: string;
  name: string; // اسم المنطقة الإدارية
  nameEn?: string;
  population: number;
  areaKm2: number;
  density: number; // نسمة/كم²
  polygon: [number, number][]; // array of [lat, lng] points
  center: [number, number];
  blockCount: number; // عدد البلوكات السكنية
  serviceScore: number; // 0-100
}

// ═══ Building/Block Data ═══
export interface BuildingBlock {
  id: string;
  zoneId: string;
  name?: string;
  coords: [number, number]; // center point
  polygon?: [number, number][]; // building footprint
  population: number;
  buildingCount: number;
  floorCount: number; // average floors
  type: 'residential' | 'commercial' | 'mixed' | 'industrial';
  yearBuilt?: number; // سنة البناء
}

// ═══ Road Network ═══
export interface RoadSegment {
  id: string;
  name?: string;
  type: 'main' | 'secondary' | 'residential' | 'pedestrian' | 'highway';
  coords: [number, number][]; // line coordinates
  oneWay: boolean;
  lanes: number;
  hasSidewalk: boolean;
  surface: 'asphalt' | 'concrete' | 'dirt' | 'cobblestone';
  length: number; // meters
  maxSpeed?: number; // km/h
}

// ═══ Additional Public Places ═══
export interface PublicPlace {
  id: string;
  name: string;
  nameEn?: string;
  type: 'shop' | 'bank' | 'post_office' | 'fuel' | 'market' | 'supermarket' |
         'restaurant' | 'cafe' | 'gym' | 'police' | 'fire_station';
  coords: [number, number];
  zoneId?: string;
  address?: string;
  phone?: string;
  openingHours?: string;
}

// ═══ ADMINISTRATIVE ZONE BOUNDARIES (Real data from user) ═══
export const ZONE_BOUNDARIES: ZoneBoundary[] = [
  {
    id: 'zb1',
    name: 'عرايشية مصر',
    nameEn: 'Araishiyat Masr',
    population: 75000,
    areaKm2: 2.8,
    density: 26785,
    // Approximate polygon - replace with real boundary
    polygon: [
      [30.600, 32.270], [30.600, 32.280], [30.590, 32.280],
      [30.590, 32.270], [30.600, 32.270]
    ],
    center: [30.5950, 32.2750],
    blockCount: 25,
    serviceScore: 85
  },
  {
    id: 'zb2',
    name: 'حي السلام',
    nameEn: 'Al Salam',
    population: 90000,
    areaKm2: 3.5,
    density: 25714,
    polygon: [
      [30.605, 32.275], [30.605, 32.285], [30.595, 32.285],
      [30.595, 32.275], [30.605, 32.275]
    ],
    center: [30.6000, 32.2800],
    blockCount: 30,
    serviceScore: 78
  },
  {
    id: 'zb3',
    name: 'الشهداء',
    nameEn: 'Al Shohadaa',
    population: 55000,
    areaKm2: 2.2,
    density: 25000,
    polygon: [
      [30.590, 32.260], [30.590, 32.270], [30.580, 32.270],
      [30.580, 32.260], [30.590, 32.260]
    ],
    center: [30.5850, 32.2650],
    blockCount: 18,
    serviceScore: 65
  },
  {
    id: 'zb4',
    name: 'أبو عطوة (نطاق الحي)',
    nameEn: 'Abu Atowa',
    population: 25000,
    areaKm2: 2.5,
    density: 10000,
    polygon: [
      [30.615, 32.265], [30.615, 32.275], [30.605, 32.275],
      [30.605, 32.265], [30.615, 32.265]
    ],
    center: [30.6100, 32.2700],
    blockCount: 8,
    serviceScore: 45
  },
  {
    id: 'zb5',
    name: 'منطقة المستشفى العام',
    nameEn: 'General Hospital Area',
    population: 20000,
    areaKm2: 1.5,
    density: 13333,
    polygon: [
      [30.615, 32.280], [30.615, 32.290], [30.605, 32.290],
      [30.605, 32.280], [30.615, 32.280]
    ],
    center: [30.6100, 32.2850],
    blockCount: 12,
    serviceScore: 92
  }
];

// ═══ BUILDING BLOCKS DATA (Placeholders) ═══
export const BUILDING_BLOCKS: BuildingBlock[] = [
  // عرايشية مصر blocks
  { id: 'b1', zoneId: 'zb1', name: 'بلوك 1', coords: [30.600, 32.270], population: 1800, buildingCount: 15, floorCount: 8, type: 'residential' },
  { id: 'b2', zoneId: 'zb1', name: 'بلوك 2', coords: [30.598, 32.272], population: 2200, buildingCount: 18, floorCount: 10, type: 'residential' },
  { id: 'b3', zoneId: 'zb1', name: 'بلوك 3', coords: [30.596, 32.269], population: 1500, buildingCount: 12, floorCount: 6, type: 'mixed' },
  { id: 'b4', zoneId: 'zb1', name: 'بلوك 4', coords: [30.599, 32.274], population: 2500, buildingCount: 20, floorCount: 12, type: 'residential' },
  { id: 'b5', zoneId: 'zb1', name: 'بلوك 5', coords: [30.602, 32.273], population: 1900, buildingCount: 16, floorCount: 8, type: 'residential' },
  
  // حي السلام blocks
  { id: 'b6', zoneId: 'zb2', name: 'بلوك أ', coords: [30.605, 32.275], population: 2800, buildingCount: 22, floorCount: 10, type: 'residential' },
  { id: 'b7', zoneId: 'zb2', name: 'بلوك ب', coords: [30.608, 32.277], population: 3200, buildingCount: 25, floorCount: 12, type: 'residential' },
  { id: 'b8', zoneId: 'zb2', name: 'بلوك ج', coords: [30.603, 32.278], population: 2100, buildingCount: 18, floorCount: 8, type: 'residential' },
  { id: 'b9', zoneId: 'zb2', name: 'بلوك د', coords: [30.607, 32.274], population: 2400, buildingCount: 20, floorCount: 10, type: 'mixed' },
  { id: 'b10', zoneId: 'zb2', name: 'بلوك هـ', coords: [30.602, 32.276], population: 1700, buildingCount: 14, floorCount: 6, type: 'residential' },
  
  // الشهداء blocks
  { id: 'b11', zoneId: 'zb3', name: 'بلوك 1', coords: [30.592, 32.258], population: 2000, buildingCount: 16, floorCount: 8, type: 'residential' },
  { id: 'b12', zoneId: 'zb3', name: 'بلوك 2', coords: [30.589, 32.260], population: 1800, buildingCount: 14, floorCount: 6, type: 'residential' },
  { id: 'b13', zoneId: 'zb3', name: 'بلوك 3', coords: [30.591, 32.256], population: 1500, buildingCount: 12, floorCount: 6, type: 'residential' },
  
  // أبو عطوة blocks
  { id: 'b14', zoneId: 'zb4', name: 'بلوك 1', coords: [30.614, 32.263], population: 1200, buildingCount: 10, floorCount: 5, type: 'residential' },
  { id: 'b15', zoneId: 'zb4', name: 'بلوك 2', coords: [30.612, 32.267], population: 900, buildingCount: 8, floorCount: 4, type: 'residential' },
  
  // منطقة المستشفى العام blocks
  { id: 'b16', zoneId: 'zb5', name: 'بلوك أ', coords: [30.611, 32.283], population: 800, buildingCount: 6, floorCount: 5, type: 'residential' },
  { id: 'b17', zoneId: 'zb5', name: 'بلوك ب', coords: [30.609, 32.287], population: 650, buildingCount: 5, floorCount: 4, type: 'residential' }
];

// ═══ ROAD NETWORK (Placeholders) ═══
export const ROAD_NETWORK: RoadSegment[] = [
  // Main roads
  { id: 'r1', name: 'شارع أحمد عرابي', type: 'main', coords: [[30.590, 32.265], [30.620, 32.285]], oneWay: false, lanes: 4, hasSidewalk: true, surface: 'asphalt', length: 4200, maxSpeed: 60 },
  { id: 'r2', name: 'شارع السلام', type: 'main', coords: [[30.595, 32.270], [30.610, 32.280]], oneWay: false, lanes: 3, hasSidewalk: true, surface: 'asphalt', length: 2100, maxSpeed: 50 },
  { id: 'r3', name: 'شارع قناة السويس', type: 'main', coords: [[30.600, 32.255], [30.615, 32.290]], oneWay: false, lanes: 4, hasSidewalk: true, surface: 'asphalt', length: 4800, maxSpeed: 60 },
  
  // Secondary roads
  { id: 'r4', name: 'شارع الجلاء', type: 'secondary', coords: [[30.598, 32.268], [30.605, 32.275]], oneWay: false, lanes: 2, hasSidewalk: true, surface: 'asphalt', length: 1200, maxSpeed: 40 },
  { id: 'r5', name: 'شارع الثورة', type: 'secondary', coords: [[30.602, 32.260], [30.612, 32.270]], oneWay: false, lanes: 2, hasSidewalk: true, surface: 'asphalt', length: 1800, maxSpeed: 40 },
  { id: 'r6', name: 'شارع النصر', type: 'secondary', coords: [[30.595, 32.275], [30.608, 32.285]], oneWay: true, lanes: 2, hasSidewalk: true, surface: 'asphalt', length: 2200, maxSpeed: 40 },
  
  // Residential streets
  { id: 'r7', type: 'residential', coords: [[30.600, 32.270], [30.600, 32.275]], oneWay: false, lanes: 1, hasSidewalk: true, surface: 'asphalt', length: 500 },
  { id: 'r8', type: 'residential', coords: [[30.605, 32.272], [30.605, 32.278]], oneWay: false, lanes: 1, hasSidewalk: false, surface: 'concrete', length: 650 },
  { id: 'r9', type: 'residential', coords: [[30.592, 32.256], [30.592, 32.262]], oneWay: false, lanes: 1, hasSidewalk: true, surface: 'asphalt', length: 600 },
  { id: 'r10', type: 'residential', coords: [[30.610, 32.280], [30.614, 32.285]], oneWay: false, lanes: 1, hasSidewalk: true, surface: 'asphalt', length: 700 }
];

// ═══ ADDITIONAL PUBLIC PLACES (Shops, Banks, Markets, etc.) ═══
export const PUBLIC_PLACES: PublicPlace[] = [
  // Banks
  { id: 'bank1', name: 'البنك الأهلي المصري', nameEn: 'National Bank of Egypt', type: 'bank', coords: [30.5985, 32.2720], address: 'شارع أحمد عرابي' },
  { id: 'bank2', name: 'بنك مصر', nameEn: 'Banque Misr', type: 'bank', coords: [30.6040, 32.2760], address: 'شارع السلام' },
  { id: 'bank3', name: 'البنك التجاري الدولي', nameEn: 'CIB', type: 'bank', coords: [30.5930, 32.2600], address: 'شارع الثورة' },
  { id: 'bank4', name: 'بنك القاهرة', nameEn: 'Banque du Caire', type: 'bank', coords: [30.6080, 32.2820], address: 'شارع قناة السويس' },
  { id: 'bank5', name: 'البنك العربي الأفريقي', nameEn: 'Arab African Bank', type: 'bank', coords: [30.5970, 32.2690], address: 'ميدان عرايشية' },
  
  // Post Offices
  { id: 'post1', name: 'مكتب بريد عرايشية', nameEn: 'Araishiya Post Office', type: 'post_office', coords: [30.5990, 32.2715], address: 'شارع الجلاء' },
  { id: 'post2', name: 'مكتب بريد السلام', nameEn: 'Al-Salam Post Office', type: 'post_office', coords: [30.6055, 32.2755], address: 'شارع السلام' },
  { id: 'post3', name: 'مكتب بريد الشهداء', nameEn: 'Al-Shuhada Post Office', type: 'post_office', coords: [30.5910, 32.2585], address: 'شارع الثورة' },
  
  // Fuel Stations
  { id: 'fuel1', name: 'محطة وقود موبيل', nameEn: 'Mobil Gas Station', type: 'fuel', coords: [30.5960, 32.2750], address: 'شارع أحمد عرابي' },
  { id: 'fuel2', name: 'محطة وقود شل', nameEn: 'Shell Gas Station', type: 'fuel', coords: [30.6060, 32.2780], address: 'شارع قناة السويس' },
  { id: 'fuel3', name: 'محطة وقود الكوثر', nameEn: 'Al-Kawthar Gas Station', type: 'fuel', coords: [30.5890, 32.2550], address: 'شارع الثورة' },
  { id: 'fuel4', name: 'محطة وقود الوطنية', nameEn: 'National Gas Station', type: 'fuel', coords: [30.6120, 32.2800], address: 'طريق المستشفى العام' },
  
  // Supermarkets & Markets
  { id: 'market1', name: 'فتح الله ماركت', nameEn: 'Fathalla Market', type: 'supermarket', coords: [30.5975, 32.2710], address: 'شارع أحمد عرابي' },
  { id: 'market2', name: 'كارفور إسماعيلية', nameEn: 'Carrefour Ismailia', type: 'supermarket', coords: [30.6030, 32.2765], address: 'شارع قناة السويس' },
  { id: 'market3', name: 'سوق السلام المركزي', nameEn: 'Al-Salam Central Market', type: 'market', coords: [30.6060, 32.2740], address: 'شارع السلام' },
  { id: 'market4', name: 'خضار وفاكهة الشهداء', nameEn: 'Al-Shuhada Vegetable Market', type: 'market', coords: [30.5900, 32.2570], address: 'شارع الثورة' },
  { id: 'market5', name: 'أولاد رجب', nameEn: 'Awlad Ragab', type: 'supermarket', coords: [30.6000, 32.2730], address: 'شارع الجلاء' },
  { id: 'market6', name: 'سعودي ماركت', nameEn: 'Saudi Market', type: 'supermarket', coords: [30.6090, 32.2830], address: 'شارع المستشفى' },
  
  // Shops
  { id: 'shop1', name: 'محل ملابس الروضة', type: 'shop', coords: [30.5980, 32.2725], address: 'شارع الجلاء' },
  { id: 'shop2', name: 'مكتبة السلام', type: 'shop', coords: [30.6045, 32.2760], address: 'شارع السلام' },
  { id: 'shop3', name: 'مخبز الحجازي', type: 'shop', coords: [30.5920, 32.2590], address: 'شارع الثورة' },
  { id: 'shop4', name: 'محل أدوات كهربائية', type: 'shop', coords: [30.6070, 32.2780], address: 'شارع قناة السويس' },
  
  // Restaurants & Cafes
  { id: 'rest1', name: 'كشري التحرير', type: 'restaurant', coords: [30.5995, 32.2715], address: 'شارع أحمد عرابي' },
  { id: 'rest2', name: 'مطعم السلام', type: 'restaurant', coords: [30.6050, 32.2755], address: 'شارع السلام' },
  { id: 'cafe1', name: 'كافيه أبو عطوة', type: 'cafe', coords: [30.6130, 32.2655], address: 'شارع أبو عطوة' },
  { id: 'cafe2', name: 'الكافية', type: 'cafe', coords: [30.5980, 32.2700], address: 'ميدان عرايشية' }
];

// Real coordinates extracted from KML file (longitude,latitude → converted to latitude,longitude)
export const REAL_SERVICES: ServiceLocation[] = [
  // ═══ HOSPITALS & MEDICAL (12 locations) ═══
  { id: 'h1', name: 'مستشفى الطلبة', type: 'hospital', coords: [30.5908, 32.2646] },
  { id: 'h2', name: 'مستشفى دار الشفا', type: 'hospital', coords: [30.6123, 32.2620] },
  { id: 'h3', name: 'مستشفى السلام', type: 'hospital', coords: [30.6092, 32.2635] },
  { id: 'h4', name: 'مستشفى جامعة قناة السويس', type: 'hospital', coords: [30.6225, 32.2812] },
  { id: 'h5', name: 'عيادات خارجية', type: 'hospital', coords: [30.6220, 32.2822] },
  { id: 'h6', name: 'مستشفى أبو خليفة', type: 'hospital', coords: [30.7432, 32.2597] },
  { id: 'h7', name: 'معمل الشرق', type: 'hospital', coords: [30.5977, 32.2708] },
  { id: 'h8', name: 'معمل مكة', type: 'hospital', coords: [30.6137, 32.2710] },
  { id: 'h9', name: 'مستشفى الخير والبركة', type: 'hospital', coords: [30.6057, 32.2723] },
  { id: 'h10', name: 'بنك الدم', type: 'hospital', coords: [30.5970, 32.2702] },
  { id: 'h11', name: 'عيادة د. آية فؤاد', type: 'hospital', coords: [30.6029, 32.2613] },
  { id: 'h12', name: 'عيادة أورام', type: 'hospital', coords: [30.5971, 32.2692] },

  // ═══ PHARMACIES (30 locations) ═══
  { id: 'p1', name: 'صيدلية بلال', type: 'pharmacy', coords: [30.5987, 32.2714] },
  { id: 'p2', name: 'صيدلية ابتسام الموافي', type: 'pharmacy', coords: [30.5974, 32.2808] },
  { id: 'p3', name: 'صيدلية أحمد علي', type: 'pharmacy', coords: [30.5995, 32.2744] },
  { id: 'p4', name: 'صيدلية دسوقي', type: 'pharmacy', coords: [30.5992, 32.2752] },
  { id: 'p5', name: 'صيدلية العراقي', type: 'pharmacy', coords: [30.5978, 32.2761] },
  { id: 'p6', name: 'صيدلية مروة الشوادفي', type: 'pharmacy', coords: [30.6005, 32.2675] },
  { id: 'p7', name: 'صيدلية نسمة فاروق', type: 'pharmacy', coords: [30.5972, 32.2714] },
  { id: 'p8', name: 'صيدلية أحمد عبدالرحمن', type: 'pharmacy', coords: [30.5954, 32.2728] },
  { id: 'p9', name: 'صيدلية العزبي', type: 'pharmacy', coords: [30.6101, 32.2713] },
  { id: 'p10', name: 'صيدلية الجمل', type: 'pharmacy', coords: [30.6148, 32.2844] },
  { id: 'p11', name: 'صيدلية محمد حمعه', type: 'pharmacy', coords: [30.5908, 32.2575] },
  { id: 'p12', name: 'صيدلية عبدالحميد سليمان', type: 'pharmacy', coords: [30.5959, 32.2587] },
  { id: 'p13', name: 'صيدلية مريم مرجان', type: 'pharmacy', coords: [30.5855, 32.2600] },
  { id: 'p14', name: 'صيدلية مايكل', type: 'pharmacy', coords: [30.5986, 32.2611] },
  { id: 'p15', name: 'صيدلية د. نهى فايز', type: 'pharmacy', coords: [30.6003, 32.2588] },
  { id: 'p16', name: 'صيدلية سامي عبدالحميد', type: 'pharmacy', coords: [30.6025, 32.2566] },
  { id: 'p17', name: 'صيدلية سالي شكري', type: 'pharmacy', coords: [30.6027, 32.2560] },
  { id: 'p18', name: 'صيدلية وليد', type: 'pharmacy', coords: [30.6081, 32.2558] },
  { id: 'p19', name: 'صيدلية أسامة سليم', type: 'pharmacy', coords: [30.6094, 32.2534] },
  { id: 'p20', name: 'صيدلية مهران', type: 'pharmacy', coords: [30.6137, 32.2687] },
  { id: 'p21', name: 'صيدلية محمد السيد', type: 'pharmacy', coords: [30.6134, 32.2662] },
  { id: 'p22', name: 'صيدلية قمحاوي', type: 'pharmacy', coords: [30.6167, 32.2688] },
  { id: 'p23', name: 'صيدلية دعاء', type: 'pharmacy', coords: [30.6156, 32.2633] },
  { id: 'p24', name: 'صيدلية بشير الطحلاوي', type: 'pharmacy', coords: [30.6106, 32.2552] },
  { id: 'p25', name: 'صيدلية داليا', type: 'pharmacy', coords: [30.6108, 32.2531] },
  { id: 'p26', name: 'صيدلية علاء الدين', type: 'pharmacy', coords: [30.6080, 32.2621] },
  { id: 'p27', name: 'صيدلية أحمد القرشي', type: 'pharmacy', coords: [30.6089, 32.2641] },
  { id: 'p28', name: 'صيدلية كريم الشربيني', type: 'pharmacy', coords: [30.6063, 32.2694] },
  { id: 'p29', name: 'صيدلية جمال الكيال', type: 'pharmacy', coords: [30.6287, 32.2823] },
  { id: 'p30', name: 'صيدلية سلوى عبدالحكيم', type: 'pharmacy', coords: [30.7255, 32.2612] },

  // ═══ PARKS (2 locations) ═══
  { id: 'pk1', name: 'حديقة الخالدين', type: 'park', coords: [30.6121, 32.2843] },
  { id: 'pk2', name: 'حديقة الشيخ زايد', type: 'park', coords: [30.6053, 32.2756] },

  // ═══ CLUBS (3 locations) ═══
  { id: 'c1', name: 'نادي القنال', type: 'club', coords: [30.5962, 32.2887] },
  { id: 'c2', name: 'الاستاد', type: 'club', coords: [30.6011, 32.2739] },
  { id: 'c3', name: 'نادي الشهداء', type: 'club', coords: [30.5899, 32.2601] },

  // ═══ SCHOOLS (29 locations) ═══
  { id: 's1', name: 'مدرسة', type: 'school', coords: [30.6132, 32.2600] },
  { id: 's2', name: 'مدرسة الجيل الجديد', type: 'school', coords: [30.6139, 32.2533] },
  { id: 's3', name: 'مدرسة المشير أحمد إسماعيل', type: 'school', coords: [30.5944, 32.2595] },
  { id: 's4', name: 'مدرسة الشهيد مؤمن نعمان', type: 'school', coords: [30.5858, 32.2580] },
  { id: 's5', name: 'مدرسة أرض المشتل', type: 'school', coords: [30.5990, 32.2534] },
  { id: 's6', name: 'مدرسة السيدة عائشة', type: 'school', coords: [30.6019, 32.2552] },
  { id: 's7', name: 'مدرسة', type: 'school', coords: [30.6002, 32.2560] },
  { id: 's8', name: 'مدرسة علي مبارك', type: 'school', coords: [30.6111, 32.2662] },
  { id: 's9', name: 'مدرسة طلعت حرب', type: 'school', coords: [30.6147, 32.2528] },
  { id: 's10', name: 'مدرسة النصر الإعدادية بنات', type: 'school', coords: [30.6011, 32.2713] },
  { id: 's11', name: 'مدرسة الزهراء الابتدائية', type: 'school', coords: [30.6170, 32.2753] },
  { id: 's12', name: 'مدرسة السادات الثانوية بنين', type: 'school', coords: [30.5985, 32.2694] },
  { id: 's13', name: 'مدرسة عاطف بركات الابتدائية', type: 'school', coords: [30.5996, 32.2708] },
  { id: 's14', name: 'مدرسة إبراهيم عثمان', type: 'school', coords: [30.5995, 32.2720] },
  { id: 's15', name: 'مدرسة الجلاء الابتدائية', type: 'school', coords: [30.5989, 32.2710] },
  { id: 's16', name: 'مدرسة الطائف', type: 'school', coords: [30.5999, 32.2819] },
  { id: 's17', name: 'مدرسة أم الأبطال', type: 'school', coords: [30.5972, 32.2813] },
  { id: 's18', name: 'مدرسة 25 يناير', type: 'school', coords: [30.5996, 32.2789] },
  { id: 's19', name: 'مدرسة الإسماعيلية الإعدادية', type: 'school', coords: [30.5998, 32.2783] },
  { id: 's20', name: 'مدرسة أحمد أمين الابتدائية', type: 'school', coords: [30.5970, 32.2781] },
  { id: 's21', name: 'مدرسة الإسماعيلية الثانوية', type: 'school', coords: [30.5969, 32.2790] },
  { id: 's22', name: 'مدرسة مصطفى كامل الابتدائية', type: 'school', coords: [30.6016, 32.2697] },
  { id: 's23', name: 'مدرسة مكة المكرمة', type: 'school', coords: [30.6187, 32.2804] },
  { id: 's24', name: 'مدرسة المنار اللغات', type: 'school', coords: [30.6172, 32.2802] },
  { id: 's25', name: 'مدرسة مصطفى العطار', type: 'school', coords: [30.6163, 32.2793] },
  { id: 's26', name: 'مدرسة أمون', type: 'school', coords: [30.6164, 32.2777] },
  { id: 's27', name: 'مدرسة السلام', type: 'school', coords: [30.6180, 32.2776] },
  { id: 's28', name: 'معهد آل نوح', type: 'school', coords: [30.6112, 32.2719] },
  { id: 's29', name: 'مدرسة 24 أكتوبر', type: 'school', coords: [30.6113, 32.2837] },
  { id: 's30', name: 'مدرسة الشهداء الإعدادية', type: 'school', coords: [30.5878, 32.2585] },
  { id: 's31', name: 'مدرسة القناة', type: 'school', coords: [30.5886, 32.2572] },

  // ═══ MOSQUES (12 locations) ═══
  { id: 'm1', name: 'جامع فاطمة الزهراء', type: 'mosque', coords: [30.6057, 32.2655] },
  { id: 'm2', name: 'مسجد', type: 'mosque', coords: [30.5905, 32.2555] },
  { id: 'm3', name: 'مسجد عثمان أحمد عثمان', type: 'mosque', coords: [30.5933, 32.2561] },
  { id: 'm4', name: 'مسجد التوحيد', type: 'mosque', coords: [30.6046, 32.2582] },
  { id: 'm5', name: 'مسجد الصالحين', type: 'mosque', coords: [30.6149, 32.2694] },
  { id: 'm6', name: 'مسجد', type: 'mosque', coords: [30.6108, 32.2558] },
  { id: 'm7', name: 'مسجد الفتح', type: 'mosque', coords: [30.6072, 32.2610] },
  { id: 'm8', name: 'مسجد الرحمن عاصم', type: 'mosque', coords: [30.6037, 32.2692] },
  { id: 'm9', name: 'مسجد زمزم', type: 'mosque', coords: [30.5991, 32.2835] },
  { id: 'm10', name: 'مسجد علي بن أبي طالب', type: 'mosque', coords: [30.5999, 32.2762] },
  { id: 'm11', name: 'مسجد التوبة', type: 'mosque', coords: [30.5952, 32.2837] },
  { id: 'm12', name: 'مسجد الؤلؤة', type: 'mosque', coords: [30.6095, 32.2513] },
  { id: 'm13', name: 'مسجد المطافي', type: 'mosque', coords: [30.5982, 32.2707] },
  { id: 'm14', name: 'مسجد الحرمين', type: 'mosque', coords: [30.6154, 32.2774] },
];

@Injectable({
  providedIn: 'root',
})
export class DataService {
  seniorMode = signal<boolean>(false);
  activeService = signal<ServiceType>('pharmacy');

  // ═══ Real Zones Data - Ismailia Second District ═══
  // Population: zone JSON (265k total across five sheiakhas). Service counts synced from REAL_SERVICES (KML) in getZones().
  private mockZones: Zone[] = [
    {
      id: 'z1', name: 'عرايشية مصر', color: '#10b981',
      coords: [30.5987, 32.2714], radius: 900, population: 75000, baseCoverage: 78,
      services: { pharmacies: 10, hospitals: 3, parks: 1, schools: 12 },
      status: 'excellent'
    },
    {
      id: 'z2', name: 'حي السلام', color: '#f59e0b',
      coords: [30.6050, 32.2750], radius: 1000, population: 90000, baseCoverage: 68,
      services: { pharmacies: 12, hospitals: 4, parks: 1, schools: 14 },
      status: 'good'
    },
    {
      id: 'z3', name: 'الشهداء', color: '#f59e0b',
      coords: [30.5908, 32.2585], radius: 850, population: 55000, baseCoverage: 55,
      services: { pharmacies: 7, hospitals: 2, parks: 0, schools: 8 },
      status: 'limited'
    },
    {
      id: 'z4', name: 'أبو عطوة', color: '#f97316',
      coords: [30.6140, 32.2650], radius: 800, population: 25000, baseCoverage: 35,
      services: { pharmacies: 3, hospitals: 1, parks: 0, schools: 3 },
      status: 'critical',
      suggestion: 'يحتاج إلى صيدلية وحديقة عامة'
    },
    {
      id: 'z5', name: 'منطقة المستشفى العام', color: '#10b981',
      coords: [30.6100, 32.2850], radius: 600, population: 20000, baseCoverage: 88,
      services: { pharmacies: 3, hospitals: 1, parks: 0, schools: 2 },
      status: 'excellent'
    }
  ];

  // ═══ Fix My City reports ═══
  cityReports = signal<CityReport[]>([]);

  // ═══ Service Submissions (Crowdsourcing) ═══
  /** Read in UI `computed` / `effect` so map & dashboards refresh when submissions change. */
  readonly serviceSubmissions = signal<ServiceSubmission[]>([]);

  // Load submissions from localStorage on init
  constructor() {
    this.loadSubmissionsFromStorage();
  }

  private loadSubmissionsFromStorage() {
    try {
      const stored = localStorage.getItem('serviceSubmissions');
      if (!stored) return;
      const parsed: ServiceSubmission[] = JSON.parse(stored);
      const normalized = parsed.map(s => ({
        ...s,
        status:
          s.status === 'rejected'
            ? ('rejected' as const)
            : ('published' as const),
      }));
      this.serviceSubmissions.set(normalized);
      this.saveSubmissionsToStorage();
    } catch (e) {
      console.error('Failed to load submissions from storage:', e);
    }
  }

  private saveSubmissionsToStorage() {
    try {
      localStorage.setItem('serviceSubmissions', JSON.stringify(this.serviceSubmissions()));
    } catch (e) {
      console.error('Failed to save submissions to storage:', e);
    }
  }

  submitService(submission: Omit<ServiceSubmission, 'id' | 'status' | 'submittedAt'>): ServiceSubmission {
    const zoneId =
      submission.zoneId ??
      this.findZoneIdForCoords(submission.coords[0], submission.coords[1]);
    const newSubmission: ServiceSubmission = {
      ...submission,
      zoneId,
      id: `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'published',
      submittedAt: new Date().toISOString(),
    };

    this.serviceSubmissions.update(subs => [...subs, newSubmission]);
    this.saveSubmissionsToStorage();
    return newSubmission;
  }

  getAllSubmissions(): ServiceSubmission[] {
    return this.serviceSubmissions();
  }

  /** Zone disc containing the point (for optional labeling on submissions). */
  private findZoneIdForCoords(lat: number, lng: number): string | undefined {
    const z = this.mockZones.find(zone => this.isPointInsideZone(lat, lng, zone));
    return z?.id;
  }

  deleteSubmission(id: string) {
    this.serviceSubmissions.update(subs => subs.filter(s => s.id !== id));
    this.saveSubmissionsToStorage();
  }

  getZones(): Zone[] {
    return this.mockZones.map(z => {
      const c = this.getZoneServiceCounts(z.id);
      return {
        ...z,
        services: {
          pharmacies: c.pharmacies,
          hospitals: c.hospitals,
          parks: c.parks,
          schools: c.schools,
        },
      };
    });
  }

  /** Population-weighted % “served” for a fixed service type (matches dashboard / home cards). */
  getDistrictPopulationCoverageForService(service: ServiceType): number {
    const zones = this.mockZones;
    const totalPop = zones.reduce((s, z) => s + z.population, 0);
    if (totalPop <= 0) return 0;
    const covered = zones.reduce(
      (sum, z) => sum + (z.population * this.getZoneCoverageForService(z, service)) / 100,
      0
    );
    return Math.round((covered / totalPop) * 100);
  }

  /** Coverage 0–95 from KML point counts inside the zone disc (benchmark vs population). */
  private computeCoverageFromRealServices(zone: Zone, service: ServiceType): number {
    const c = this.getZoneServiceCounts(zone.id);
    let count = 0;
    let peoplePerFacility = 4500;
    if (service === 'pharmacy') {
      count = c.pharmacies;
      peoplePerFacility = 4200;
    } else if (service === 'hospitals') {
      count = c.hospitals;
      peoplePerFacility = 22000;
    } else {
      count = c.parks;
      peoplePerFacility = 55000;
    }
    const need = zone.population / Math.max(1, peoplePerFacility);
    const ratio = count / Math.max(0.35, need);
    const raw = Math.min(1, ratio);
    return Math.min(95, Math.max(6, Math.round(raw * 94 + 4)));
  }

  private tierFromCoverage(coverage: number): { tier: IsochroneData['tier']; color: string } {
    if (coverage >= 70) return { tier: '5min', color: '#10b981' };
    if (coverage >= 45) return { tier: '10min', color: '#f59e0b' };
    if (coverage >= 25) return { tier: '15min', color: '#f97316' };
    return { tier: 'underserved', color: '#ef4444' };
  }

  /** True if [lat,lng] lies inside the zone’s modeled service disc (center + radius in meters). */
  isPointInsideZone(lat: number, lng: number, zone: Zone): boolean {
    return this.calculateDistance(lat, lng, zone.coords[0], zone.coords[1]) <= zone.radius;
  }

  /**
   * Local access % near a map click from KML points within a walk radius
   * (tighter radius in Senior Mode). Independent of zone aggregate; blended in AI planner.
   */
  getLocalCoverageNearPoint(lat: number, lng: number, service: ServiceType): number {
    const senior = this.seniorMode();
    const radiusM = senior ? 650 : 1000;
    const types: ServiceLocation['type'][] =
      service === 'pharmacy' ? ['pharmacy'] : service === 'hospitals' ? ['hospital'] : ['park'];
    let n = 0;
    for (const s of REAL_SERVICES) {
      if (!types.includes(s.type)) continue;
      const d = this.calculateDistance(lat, lng, s.coords[0], s.coords[1]);
      if (d <= radiusM) n++;
    }
    const perUnit = senior ? 24 : 20;
    return Math.min(95, Math.max(6, Math.round(10 + n * perUnit)));
  }

  private suggestionOffset(zoneId: string, service: ServiceType): [number, number] {
    const seed = zoneId + service;
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
    const dLat = ((h % 19) - 9) * 0.00022;
    const dLng = ((((h >> 3) & 0xffff) % 19) - 9) * 0.00022;
    return [dLat, dLng];
  }

  private mockIssues: AccessibilityIssue[] = [
    { id: '1', type: 'Broken Sidewalk', location: 'Main St & 4th Ave', status: 'Open', votes: 12 },
    { id: '2', type: 'Missing Ramp', location: 'City Hall Entrance', status: 'In Progress', votes: 45 },
    { id: '3', type: 'Faulty Elevator', location: 'Central Station', status: 'Open', votes: 38 },
    { id: '4', type: 'No Audio Signals', location: 'Broadway & 5th Ave', status: 'Resolved', votes: 5 }
  ];

  private mockSuggestions: Suggestion[] = [
    { id: 's1', title: 'More Benches in Park', description: 'Add resting spots along the main trail for elderly.', author: 'Alice M.', date: '2026-04-10' },
    { id: 's2', title: 'Wider Bus Doors', description: 'Make it easier for wheelchairs to board all city buses.', author: 'John D.', date: '2026-04-12' },
  ];

  getIssues() {
    return this.mockIssues;
  }

  getSuggestions() {
    return this.mockSuggestions;
  }

  toggleSeniorMode() {
    this.seniorMode.update(val => !val);
  }

  // ── Isochrone API (colors tied to coverage from real KML counts) ──
  getIsochroneForZone(zoneId: string, service: ServiceType) {
    const zone = this.mockZones.find(z => z.id === zoneId);
    if (!zone) return { coverage: 0, tier: 'underserved' as const, color: '#ef4444' };
    const coverage = this.getZoneCoverageForService(zone, service);
    const { tier, color } = this.tierFromCoverage(coverage);
    return { coverage, tier, color };
  }

  getZoneColorForService(zone: Zone, service: ServiceType): string {
    return this.tierFromCoverage(this.getZoneCoverageForService(zone, service)).color;
  }

  /**
   * Coverage % at a map click: blends zone aggregate with local KML density (same model as AI card).
   */
  getCoverageAtAnchor(zone: Zone, service: ServiceType, anchor: [number, number]): number {
    const zoneCovAdj = this.getZoneCoverageForService(zone, service);
    let effectiveCov = zoneCovAdj;
    if (this.isPointInsideZone(anchor[0], anchor[1], zone)) {
      const localCov = this.getLocalCoverageNearPoint(anchor[0], anchor[1], service);
      effectiveCov = Math.round(zoneCovAdj * 0.38 + localCov * 0.62);
      effectiveCov = Math.min(95, Math.max(5, effectiveCov));
    }
    return effectiveCov;
  }

  getZoneColorAtAnchor(zone: Zone, service: ServiceType, anchor: [number, number]): string {
    return this.tierFromCoverage(this.getCoverageAtAnchor(zone, service, anchor)).color;
  }

  getZoneCoverageForService(zone: Zone, service: ServiceType): number {
    const base = this.computeCoverageFromRealServices(zone, service);
    return this.seniorMode() ? Math.max(5, base - 20) : base;
  }

  getOverallAccessibilityScore(): number {
    const service = this.activeService();
    const total = this.mockZones.reduce((sum, z) => {
      return sum + this.getZoneCoverageForService(z, service);
    }, 0);
    return Math.round(total / this.mockZones.length);
  }

  getPopulationCoverage(): number {
    const service = this.activeService();
    const coveredPop = this.mockZones.reduce((sum, z) => {
      const cov = this.getZoneCoverageForService(z, service);
      return sum + (z.population * cov / 100);
    }, 0);
    const totalPop = this.mockZones.reduce((sum, z) => sum + z.population, 0);
    return Math.round((coveredPop / totalPop) * 100);
  }

  // ── AI Planner (click-aware: blends zone KPI with local KML density near anchor point) ──
  getAISuggestionForZone(zoneId: string, anchor?: [number, number] | null): AISuggestion | null {
    const zone = this.mockZones.find(z => z.id === zoneId);
    if (!zone) return null;

    const service = this.activeService();
    const pt: [number, number] = anchor ?? zone.coords;

    const effectiveCov = this.getCoverageAtAnchor(zone, service, pt);

    const gap = Math.max(0, 100 - effectiveCov);
    if (gap <= 4) return null;
    const senior = this.seniorMode();

    const impactPercent = Math.min(
      senior ? 88 : 82,
      Math.round(gap * (senior ? 0.82 : 0.71))
    );

    let populationServed: number;
    if (senior) {
      populationServed = Math.round(
        zone.population * SENIOR_POPULATION_SHARE * (gap / 100) * NEW_SITE_GAP_CAPTURE * 1.25
      );
    } else {
      populationServed = Math.round(zone.population * (gap / 100) * NEW_SITE_GAP_CAPTURE);
    }
    populationServed = Math.max(120, populationServed);

    const serviceKey: Record<ServiceType, AIServiceTypeKey> = {
      pharmacy: 'PHARMACY',
      parks: 'PARKS',
      hospitals: 'HOSPITALS',
    };

    const [dLat, dLng] = this.suggestionOffset(zone.id + `${pt[0].toFixed(4)}`, service);
    const targetCov = Math.min(95, effectiveCov + Math.round(gap * 0.55));

    const coords: [number, number] = [
      pt[0] + dLat * 0.45,
      pt[1] + dLng * 0.45,
    ];

    const sk = serviceKey[service];
    const title = `${zone.name} · +${impactPercent}%`;

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      zonePopulation: zone.population,
      serviceTypeKey: sk,
      coords,
      title,
      populationServed,
      impactPercent,
      gapPercent: gap,
      targetCoverage: targetCov,
      seniorCopy: senior,
    };
  }

  getAllAISuggestions(): AISuggestion[] {
    return this.mockZones
      .map(z => this.getAISuggestionForZone(z.id, z.coords))
      .filter((s): s is AISuggestion => s !== null);
  }

  // ── Fix My City ──
  addCityReport(report: Omit<CityReport, 'id' | 'timestamp'>) {
    const newReport: CityReport = {
      ...report,
      id: 'r' + Date.now(),
      timestamp: new Date().toISOString()
    };
    this.cityReports.update(reports => [...reports, newReport]);
    return newReport;
  }

  // ── Official KML-backed service locations only (coverage & map Services layer) ──
  getRealServices(): ServiceLocation[] {
    return REAL_SERVICES;
  }

  getServicesByType(type: ServiceLocation['type']): ServiceLocation[] {
    return REAL_SERVICES.filter(s => s.type === type);
  }

  getServicesByZone(zoneId: string): ServiceLocation[] {
    const zone = this.mockZones.find(z => z.id === zoneId);
    if (!zone) return [];

    return REAL_SERVICES.filter(service => {
      const distance = this.calculateDistance(
        zone.coords[0], zone.coords[1],
        service.coords[0], service.coords[1]
      );
      return distance <= zone.radius;
    });
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Haversine formula for calculating distance between two points in meters
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  // Get service counts per zone for stats
  getZoneServiceCounts(zoneId: string) {
    const services = this.getServicesByZone(zoneId);
    return {
      hospitals: services.filter(s => s.type === 'hospital').length,
      pharmacies: services.filter(s => s.type === 'pharmacy').length,
      parks: services.filter(s => s.type === 'park').length,
      schools: services.filter(s => s.type === 'school').length,
      clubs: services.filter(s => s.type === 'club').length,
      mosques: services.filter(s => s.type === 'mosque').length,
    };
  }

  // ═══ Administrative Zone Boundaries ═══
  getZoneBoundaries(): ZoneBoundary[] {
    return ZONE_BOUNDARIES;
  }

  getZoneBoundaryById(zoneId: string): ZoneBoundary | undefined {
    return ZONE_BOUNDARIES.find(zb => zb.id === zoneId);
  }

  // ═══ Building Blocks ═══
  getBuildingBlocks(): BuildingBlock[] {
    return BUILDING_BLOCKS;
  }

  getBlocksByZone(zoneId: string): BuildingBlock[] {
    return BUILDING_BLOCKS.filter(b => b.zoneId === zoneId);
  }

  getTotalPopulationByZone(zoneId: string): number {
    return BUILDING_BLOCKS
      .filter(b => b.zoneId === zoneId)
      .reduce((sum, b) => sum + b.population, 0);
  }

  // ═══ Road Network ═══
  getRoadNetwork(): RoadSegment[] {
    return ROAD_NETWORK;
  }

  getRoadsByType(type: RoadSegment['type']): RoadSegment[] {
    return ROAD_NETWORK.filter(r => r.type === type);
  }

  getTotalRoadLength(): number {
    return ROAD_NETWORK.reduce((sum, r) => sum + r.length, 0);
  }

  getSidewalkCoverage(): number {
    const withSidewalk = ROAD_NETWORK.filter(r => r.hasSidewalk).length;
    return Math.round((withSidewalk / ROAD_NETWORK.length) * 100);
  }

  // ═══ Public Places ═══
  getPublicPlaces(): PublicPlace[] {
    return PUBLIC_PLACES;
  }

  getPublicPlacesByType(type: PublicPlace['type']): PublicPlace[] {
    return PUBLIC_PLACES.filter(p => p.type === type);
  }

  getPublicPlacesByZone(zoneId: string): PublicPlace[] {
    const zone = ZONE_BOUNDARIES.find(z => z.id === zoneId);
    if (!zone) return [];
    
    return PUBLIC_PLACES.filter(place => {
      const distance = this.calculateDistance(
        zone.center[0], zone.center[1],
        place.coords[0], place.coords[1]
      );
      return distance <= 1000; // Within 1km of zone center
    });
  }

  // ═══ Statistics & Analytics ═══
  getDistrictStats() {
    const totalPopulation = ZONE_BOUNDARIES.reduce((sum, z) => sum + z.population, 0);
    const totalArea = ZONE_BOUNDARIES.reduce((sum, z) => sum + z.areaKm2, 0);
    const avgDensity = totalPopulation / totalArea;
    const totalBuildings = BUILDING_BLOCKS.reduce((sum, b) => sum + b.buildingCount, 0);
    const totalBlocks = BUILDING_BLOCKS.length;
    
    return {
      totalPopulation,
      totalArea,
      avgDensity: Math.round(avgDensity),
      totalBuildings,
      totalBlocks,
      totalRoadLength: this.getTotalRoadLength(),
      sidewalkCoverage: this.getSidewalkCoverage(),
      totalServices: REAL_SERVICES.length,
      totalPublicPlaces: PUBLIC_PLACES.length,
      serviceDensity: Math.round(REAL_SERVICES.length / totalArea),
      banks: PUBLIC_PLACES.filter(p => p.type === 'bank').length,
      markets: PUBLIC_PLACES.filter(p => p.type === 'market' || p.type === 'supermarket').length,
      fuelStations: PUBLIC_PLACES.filter(p => p.type === 'fuel').length,
      postOffices: PUBLIC_PLACES.filter(p => p.type === 'post_office').length,
    };
  }
}
