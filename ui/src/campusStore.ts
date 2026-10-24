export interface CampusBuildingData {
  id: string;
  name: string;
  code: string;
  type: 'hostel' | 'academic' | 'library' | 'dining' | 'hub';
  coordinates: { x: number; y: number; z: number };
  mapPosition: { x: number; y: number };
  floors: string[];
}

export const DEFAULT_CAMPUS_BUILDINGS: CampusBuildingData[] = [
  {
    id: 'b-hostel-b',
    name: 'Gargi Hostel (Block B)',
    code: 'GH-B',
    type: 'hostel',
    coordinates: { x: -11.5, y: 1.3, z: 6.0 },
    mapPosition: { x: 18, y: 74 },
    floors: ['Floor 1 (Rooms 101-125)', 'Floor 2 (Rooms 201-225)', 'Floor 3 (Rooms 301-325)', 'Common Washroom Wing B'],
  },
  {
    id: 'b-hostel-c',
    name: 'Tagore Hostel (Block C)',
    code: 'TH-C',
    type: 'hostel',
    coordinates: { x: -11.5, y: 1.4, z: -6.0 },
    mapPosition: { x: 18, y: 26 },
    floors: ['Floor 1 (Rooms 101-130)', 'Floor 2 (Rooms 201-230)', 'Floor 3 (Rooms 301-330)', 'Floor 4 (Rooms 401-430)'],
  },
  {
    id: 'b-hostel-a',
    name: 'Hostel Block A (Raman Hostel)',
    code: 'RH-A',
    type: 'hostel',
    coordinates: { x: -15.0, y: 1.2, z: 0.0 },
    mapPosition: { x: 10, y: 50 },
    floors: ['Ground Floor (Rooms G1-G20)', 'Floor 1 (Rooms 101-125)', 'Floor 2 (Rooms 201-225)'],
  },
  {
    id: 'b-library',
    name: 'Central Knowledge Commons (Library)',
    code: 'CK-LIB',
    type: 'library',
    coordinates: { x: 0.0, y: 1.5, z: 0.0 },
    mapPosition: { x: 50, y: 50 },
    floors: ['Ground Floor Circulation', 'Floor 1 Quiet Study', 'Floor 2 Digital Commons & Wi-Fi', 'Floor 3 Research Pods'],
  },
  {
    id: 'b-science',
    name: 'Science & Innovation Complex (Lab 1)',
    code: 'SI-LAB',
    type: 'academic',
    coordinates: { x: 11.5, y: 1.5, z: 6.0 },
    mapPosition: { x: 82, y: 74 },
    floors: ['Lab 1 (Robotics & Circuits)', 'Lab 2 (Optics & Physics)', 'Floor 2 Faculty Chambers'],
  },
  {
    id: 'b-eng-quad',
    name: 'APJ Abdul Kalam Engineering Quad',
    code: 'AK-EQ',
    type: 'academic',
    coordinates: { x: 11.5, y: 1.6, z: -6.0 },
    mapPosition: { x: 82, y: 26 },
    floors: ['Ground Auditorium', 'Floor 1 Computing Cluster', 'Floor 2 Lecture Halls', 'Server & Switch Vault'],
  },
  {
    id: 'b-dining',
    name: 'Student Dining & Cafeteria Hub',
    code: 'SD-CH',
    type: 'dining',
    coordinates: { x: 0.0, y: 1.1, z: 10.5 },
    mapPosition: { x: 50, y: 88 },
    floors: ['Ground Main Mess Hall', 'Courtyard Food Court', 'Pantry & Refrigeration'],
  },
  {
    id: 'b-dispatch-hub',
    name: 'Facilities Maintenance & Dispatch Hub',
    code: 'FM-HUB',
    type: 'hub',
    coordinates: { x: 0.0, y: 1.2, z: -10.5 },
    mapPosition: { x: 50, y: 12 },
    floors: ['Ground Equipment Depot', 'Rapid Dispatch Command', 'Parts & Spares Inventory'],
  },
];

const campusBuildingsStorageKey = 'campusconnect_custom_buildings';

export function getCampusBuildings(): CampusBuildingData[] {
  try {
    const raw = localStorage.getItem(campusBuildingsStorageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as CampusBuildingData[];
      }
    }
  } catch {
    /* fallback to defaults */
  }
  return DEFAULT_CAMPUS_BUILDINGS;
}

export function saveCampusBuildings(buildings: CampusBuildingData[]): void {
  try {
    localStorage.setItem(campusBuildingsStorageKey, JSON.stringify(buildings));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('campus_buildings_updated', { detail: buildings }));
    }
  } catch {
    /* ignore storage errors */
  }
}

export function resetCampusBuildings(): CampusBuildingData[] {
  try {
    localStorage.removeItem(campusBuildingsStorageKey);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('campus_buildings_updated', { detail: DEFAULT_CAMPUS_BUILDINGS }));
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_CAMPUS_BUILDINGS;
}
