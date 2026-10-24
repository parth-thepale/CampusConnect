import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { Category, Ticket } from './types';
import { playSound, isAudioMuted, setAudioMuted } from './audio';
import {
  type CampusBuildingData,
  getCampusBuildings,
} from './campusStore';

export type { CampusBuildingData };

export interface TechnicianOnDuty {
  id: string;
  name: string;
  role: string;
  buildingId: string;
  buildingName: string;
  status: 'on_site' | 'en_route' | 'diagnostics' | 'available';
  etaMinutes: number;
  assignedTicketId?: string;
  problemSummary?: string;
  category?: Category;
  contact: string;
}

const categoryColors: Record<Category, { hex: number; css: string; label: string }> = {
  plumbing: { hex: 0x0284c7, css: '#0284c7', label: 'Plumbing' },
  electricity: { hex: 0xd97706, css: '#d97706', label: 'Electricity' },
  cleanliness: { hex: 0x059669, css: '#059669', label: 'Cleanliness' },
  internet: { hex: 0x7c3aed, css: '#7c3aed', label: 'Internet' },
};

function Symbol({ name, filled = false }: { name: string; filled?: boolean }) {
  return <span className="material-symbols-rounded symbol" data-filled={filled}>{name}</span>;
}

// Billboard Sprite Generator for Floating Building Labels
function createBuildingLabelSprite(
  code: string,
  name: string,
  isNight: boolean,
  isSelected: boolean
): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 130;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Sprite();

  const displayNames: Record<string, string> = {
    'GH-B': 'Gargi Hostel (Block B)',
    'TH-C': 'Tagore Hostel (Block C)',
    'RH-A': 'Raman Hostel (Block A)',
    'CK-LIB': 'Central Library',
    'SI-LAB': 'Science & Labs (Lab 1)',
    'AK-EQ': 'Engineering Quad',
    'SD-CH': 'Dining & Cafeteria',
    'FM-HUB': 'Facilities Dispatch Hub',
  };
  const displayName = displayNames[code] ?? name;

  // Background Rounded Rect Pill
  const bx = 12;
  const by = 12;
  const bw = 488;
  const bh = 106;
  const radius = 22;

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(bx, by, bw, bh, radius);
  } else {
    ctx.rect(bx, by, bw, bh);
  }

  if (isSelected) {
    ctx.fillStyle = isNight ? 'rgba(12, 38, 72, 0.95)' : 'rgba(0, 103, 102, 0.95)';
    ctx.strokeStyle = isNight ? '#38bdf8' : '#00ffff';
    ctx.lineWidth = 5;
  } else {
    ctx.fillStyle = isNight ? 'rgba(10, 20, 38, 0.90)' : 'rgba(15, 45, 38, 0.90)';
    ctx.strokeStyle = isNight ? 'rgba(56, 189, 248, 0.5)' : 'rgba(110, 231, 183, 0.5)';
    ctx.lineWidth = 3;
  }
  ctx.fill();
  ctx.stroke();

  // Code Badge Chip (Left)
  const chipX = bx + 14;
  const chipY = by + 16;
  const chipW = 125;
  const chipH = 74;
  const chipRadius = 14;

  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(chipX, chipY, chipW, chipH, chipRadius);
  } else {
    ctx.rect(chipX, chipY, chipW, chipH);
  }

  ctx.fillStyle = isSelected
    ? (isNight ? '#38bdf8' : '#e0f2fe')
    : (isNight ? '#1e293b' : '#143c33');
  ctx.fill();

  // Code Text
  ctx.font = 'bold 30px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = isSelected
    ? (isNight ? '#0b1120' : '#0369a1')
    : (isNight ? '#38bdf8' : '#6ee7b7');
  ctx.fillText(code, chipX + chipW / 2, chipY + chipH / 2);

  // Building Name Text (Right)
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(displayName, chipX + chipW + 18, by + bh / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(4.6, 1.18, 1);
  return sprite;
}

export interface Campus3DProps {
  tickets: Ticket[];
  onOpenTicket?: (ticketId: string) => void;
  isAdmin?: boolean;
  onOpenArchitect?: () => void;
}

export default function Campus3D({
  tickets,
  onOpenTicket,
  isAdmin = false,
  onOpenArchitect,
}: Campus3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [campusBuildings, setCampusBuildings] = useState<CampusBuildingData[]>(() => getCampusBuildings());
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');
  const [lightingMode, setLightingMode] = useState<'day' | 'night'>('day');
  const [audioMutedState, setAudioMutedState] = useState(isAudioMuted());
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>('b-hostel-b');
  const [hoveredBuildingName, setHoveredBuildingName] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [routeActive, setRouteActive] = useState(true);

  useEffect(() => {
    const handleUpdate = () => {
      setCampusBuildings(getCampusBuildings());
    };
    window.addEventListener('campus_buildings_updated', handleUpdate);
    return () => window.removeEventListener('campus_buildings_updated', handleUpdate);
  }, []);

  const resetCameraRef = useRef<() => void>(() => {});

  // Compute live technician positions from active tickets and base roster
  const technicians: TechnicianOnDuty[] = useMemo(() => {
    const list: TechnicianOnDuty[] = [
      {
        id: 'tech-aarav',
        name: 'Aarav Mehta',
        role: 'Facilities Plumbing Specialist',
        buildingId: 'b-hostel-b',
        buildingName: 'Gargi Hostel (Block B)',
        status: 'on_site',
        etaMinutes: 0,
        contact: 'Radio CH-04 · Ext 4410',
      },
      {
        id: 'tech-neha',
        name: 'Neha Kapoor',
        role: 'Electrical Infrastructure Specialist',
        buildingId: 'b-hostel-a',
        buildingName: 'Hostel Block A (Raman Hostel)',
        status: 'en_route',
        etaMinutes: 4,
        contact: 'Radio CH-02 · Ext 4412',
      },
      {
        id: 'tech-vikram',
        name: 'Facilities On-Call (IT)',
        role: 'IT Systems & Network Support',
        buildingId: 'b-library',
        buildingName: 'Central Knowledge Commons (Library)',
        status: 'diagnostics',
        etaMinutes: 0,
        contact: 'VoIP 8021 · IT Helpdesk',
      },
    ];

    // Overlay active tickets to bind technicians to actual reported tickets
    const activeTickets = tickets.filter((t) => t.status !== 'resolved');
    for (const tech of list) {
      const match = activeTickets.find((t) => {
        if (t.assignee && t.assignee.toLowerCase().includes(tech.name.split(' ')[0].toLowerCase())) return true;
        if (t.locationId.includes('block-b') && tech.id === 'tech-aarav') return true;
        if (t.locationId.includes('library') && tech.id === 'tech-vikram') return true;
        if (t.locationId.includes('hostel-a') && tech.id === 'tech-neha') return true;
        return false;
      });
      if (match) {
        tech.assignedTicketId = match.id;
        tech.problemSummary = match.summary;
        tech.category = match.category;
        if (match.locationId.includes('block-b')) {
          tech.buildingId = 'b-hostel-b';
          tech.buildingName = 'Gargi Hostel (Block B)';
        } else if (match.locationId.includes('library')) {
          tech.buildingId = 'b-library';
          tech.buildingName = 'Central Knowledge Commons (Library)';
        } else if (match.locationId.includes('hostel-a')) {
          tech.buildingId = 'b-hostel-a';
          tech.buildingName = 'Hostel Block A (Raman Hostel)';
        } else if (match.locationId.includes('science')) {
          tech.buildingId = 'b-science';
          tech.buildingName = 'Science & Innovation Complex (Lab 1)';
        } else if (match.locationId.includes('cafeteria')) {
          tech.buildingId = 'b-dining';
          tech.buildingName = 'Student Dining & Cafeteria Hub';
        }
      }
    }

    return list;
  }, [tickets]);

  // Selected building object
  const selectedBuilding = useMemo(() => {
    if (!selectedBuildingId) return campusBuildings[0] ?? null;
    return campusBuildings.find((b) => b.id === selectedBuildingId) ?? campusBuildings[0] ?? null;
  }, [selectedBuildingId, campusBuildings]);

  // Selected building's technician (if any)
  const selectedTech = useMemo(() => {
    if (!selectedBuilding) return null;
    return technicians.find((t) => t.buildingId === selectedBuilding.id);
  }, [technicians, selectedBuilding]);

  // Tickets affecting the selected building
  const buildingTickets = useMemo(() => {
    if (!selectedBuilding) return [];
    const locKey = selectedBuilding.id === 'b-hostel-b' ? 'block-b'
      : selectedBuilding.id === 'b-hostel-c' ? 'block-c'
      : selectedBuilding.id === 'b-hostel-a' ? 'hostel-a'
      : selectedBuilding.id === 'b-library' ? 'library'
      : selectedBuilding.id === 'b-science' ? 'science'
      : selectedBuilding.id === 'b-dining' ? 'cafeteria' : '';

    return tickets.filter((t) => {
      if (t.status === 'resolved') return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (!locKey) return false;
      return t.locationId.includes(locKey) || t.location.toLowerCase().includes(locKey);
    });
  }, [tickets, selectedBuilding, categoryFilter]);

  // Three.js Mount Effect
  useEffect(() => {
    if (viewMode !== '3d') return;
    const container = mountRef.current;
    if (!container) return;

    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setViewMode('2d');
        return;
      }
    } catch {
      setViewMode('2d');
      return;
    }

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 560;

    const isNight = lightingMode === 'night';

    // 1. Scene setup: airy daylight or cyber-twilight night campus
    const scene = new THREE.Scene();
    const bgColor = isNight ? 0x080d1a : 0xf6faf8;
    scene.background = new THREE.Color(bgColor);
    scene.fog = new THREE.FogExp2(bgColor, 0.018);

    // 2. Camera setup with wide perspective
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 150);

    // Damped Smooth Orbit State
    let targetAngle = 0.72;
    let targetElevation = 0.54;
    let targetDistance = 38;
    let currentAngle = 0.72;
    let currentElevation = 0.54;
    let currentDistance = 38;

    const targetLookAt = new THREE.Vector3(0, 1.0, 0);
    const currentLookAt = new THREE.Vector3(0, 1.0, 0);

    camera.position.set(24, 22, 28);
    camera.lookAt(currentLookAt);

    // 3. Renderer with soft shadow maps & high performance
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Balanced Natural or Moonlight Lighting
    const ambientLight = new THREE.AmbientLight(isNight ? 0x1e293b : 0xffffff, isNight ? 1.0 : 2.0);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(isNight ? 0x38bdf8 : 0xfffbf2, isNight ? 1.3 : 2.4);
    sunLight.position.set(28, 36, 24);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1.0;
    sunLight.shadow.camera.far = 90;
    sunLight.shadow.camera.left = -26;
    sunLight.shadow.camera.right = 26;
    sunLight.shadow.camera.top = 26;
    sunLight.shadow.camera.bottom = -26;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    const skyLight = new THREE.DirectionalLight(isNight ? 0x0284c7 : 0xd9ece6, isNight ? 0.7 : 0.9);
    skyLight.position.set(-24, 18, -24);
    scene.add(skyLight);

    // 5. Expansive Ground with Soft Grass & Paved Walkways
    const groundGeo = new THREE.PlaneGeometry(54, 54);
    const groundMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0x0a101f : 0xedf5f1,
      roughness: 0.9,
      metalness: 0.04,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Subtle Architectural Grid
    const grid = new THREE.GridHelper(54, 36, isNight ? 0x00f0ff : 0x075d5d, isNight ? 0x1e293b : 0xd0e2db);
    grid.position.y = 0.015;
    scene.add(grid);

    // Paved Promenade Walkways connecting buildings
    const walkwayMat = new THREE.MeshStandardMaterial({
      color: isNight ? 0x162035 : 0xdde8e3,
      roughness: 0.8,
    });

    // Main Avenue North-South & East-West
    const pathNS = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 46), walkwayMat);
    pathNS.rotation.x = -Math.PI / 2;
    pathNS.position.y = 0.02;
    scene.add(pathNS);

    const pathEW = new THREE.Mesh(new THREE.PlaneGeometry(46, 2.4), walkwayMat);
    pathEW.rotation.x = -Math.PI / 2;
    pathEW.position.y = 0.02;
    scene.add(pathEW);

    // Central Commons Plaza
    const plazaGeo = new THREE.CylinderGeometry(3.6, 3.8, 0.06, 24);
    const plazaMat = new THREE.MeshStandardMaterial({ color: 0xc8ded6, roughness: 0.7 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.y = 0.035;
    plaza.receiveShadow = true;
    scene.add(plaza);

    // Central Fountain Reflection Pool
    const poolGeo = new THREE.CylinderGeometry(1.6, 1.6, 0.08, 16);
    const poolMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.3 });
    const pool = new THREE.Mesh(poolGeo, poolMat);
    pool.position.y = 0.05;
    scene.add(pool);

    // 6. Landscaped Low-Poly Trees along Campus Walkways (Gives breathing room & scale)
    const treeGroup = new THREE.Group();
    const treePositions: [number, number][] = [
      [-6, -3], [-6, 3], [6, -3], [6, 3],
      [-4, -7], [4, -7], [-4, 7], [4, 7],
      [-8, -8], [8, -8], [-8, 8], [8, 8],
      [-14, -4], [-14, 4], [14, -3], [14, 3],
    ];

    const trunkMat = new THREE.MeshStandardMaterial({ color: isNight ? 0x483221 : 0x7c5a3d, roughness: 0.9 });
    const foliageMatA = new THREE.MeshStandardMaterial({ color: isNight ? 0x0f2b23 : 0x2d6a4f, roughness: 0.8 });
    const foliageMatB = new THREE.MeshStandardMaterial({ color: isNight ? 0x14372e : 0x40916c, roughness: 0.8 });

    treePositions.forEach(([tx, tz], idx) => {
      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);

      // Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.0, 8), trunkMat);
      trunk.position.y = 0.5;
      trunk.castShadow = true;
      tree.add(trunk);

      // Foliage Cone/Sphere
      const folMat = idx % 2 === 0 ? foliageMatA : foliageMatB;
      const folGeo = new THREE.ConeGeometry(0.75, 1.8, 7);
      const fol = new THREE.Mesh(folGeo, folMat);
      fol.position.y = 1.6;
      fol.castShadow = true;
      tree.add(fol);

      treeGroup.add(tree);
    });
    scene.add(treeGroup);

    // Ground Promenade Lanterns in Night Twin Mode
    if (isNight) {
      const lanternGeo = new THREE.SphereGeometry(0.16, 8, 8);
      const lanternMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      [-16, -8, 8, 16].forEach((pos) => {
        const l1 = new THREE.Mesh(lanternGeo, lanternMat);
        l1.position.set(pos, 0.22, 1.4);
        scene.add(l1);
        const l2 = new THREE.Mesh(lanternGeo, lanternMat);
        l2.position.set(pos, 0.22, -1.4);
        scene.add(l2);
        const l3 = new THREE.Mesh(lanternGeo, lanternMat);
        l3.position.set(1.4, 0.22, pos);
        scene.add(l3);
        const l4 = new THREE.Mesh(lanternGeo, lanternMat);
        l4.position.set(-1.4, 0.22, pos);
        scene.add(l4);
      });
    }

    // 7. Architectural Buildings (Generously Spaced & Proportionate)
    const buildingGroup = new THREE.Group();
    const buildingMeshes: THREE.Mesh[] = [];

    campusBuildings.forEach((b) => {
      let bHeight = 3.4;
      let bWidth = 3.6;
      let bDepth = 3.2;
      let wallColor = 0x1f4e43; // Clean campus deep teal

      if (b.type === 'hostel') {
        bHeight = 3.8;
        bWidth = 3.8;
        bDepth = 3.4;
        wallColor = 0x1b453b;
      } else if (b.type === 'academic') {
        bHeight = 4.4;
        bWidth = 4.2;
        bDepth = 3.6;
        wallColor = 0x23574c;
      } else if (b.type === 'library') {
        bHeight = 3.2;
        bWidth = 5.0;
        bDepth = 4.6;
        wallColor = 0x295b50;
      } else if (b.type === 'dining') {
        bHeight = 2.6;
        bWidth = 4.2;
        bDepth = 3.8;
        wallColor = 0x306458;
      } else if (b.type === 'hub') {
        bHeight = 2.8;
        bWidth = 4.6;
        bDepth = 3.4;
        wallColor = 0x174037;
      }

      // Main Building Block
      const bGeo = new THREE.BoxGeometry(bWidth, bHeight, bDepth);
      const bMat = new THREE.MeshStandardMaterial({
        color: isNight ? 0x0f2b25 : wallColor,
        emissive: isNight ? 0x051a16 : 0x000000,
        emissiveIntensity: isNight ? 0.4 : 0,
        metalness: 0.12,
        roughness: 0.6,
      });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.set(b.coordinates.x, bHeight / 2, b.coordinates.z);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;
      bMesh.userData = {
        buildingId: b.id,
        buildingName: b.name,
        baseY: bHeight / 2,
        targetY: bHeight / 2,
        currentY: bHeight / 2,
      };
      buildingGroup.add(bMesh);
      buildingMeshes.push(bMesh);

      // Architectural Rooftop
      const roofGeo = new THREE.BoxGeometry(bWidth * 0.92, 0.35, bDepth * 0.92);
      const roofMat = new THREE.MeshStandardMaterial({
        color: isNight ? 0x1e293b : 0xf4f9f6,
        roughness: 0.85,
        metalness: 0.08,
      });
      const roofMesh = new THREE.Mesh(roofGeo, roofMat);
      roofMesh.position.set(b.coordinates.x, bHeight + 0.18, b.coordinates.z);
      roofMesh.castShadow = true;
      buildingGroup.add(roofMesh);

      // Ribbon Window Strips
      const windowGeo = new THREE.BoxGeometry(bWidth + 0.04, 0.18, bDepth + 0.04);
      const windowMat = new THREE.MeshBasicMaterial({
        color: isNight ? 0xfef08a : 0xffffff,
        transparent: true,
        opacity: isNight ? 0.98 : 0.88,
      });
      for (let f = 1; f < b.floors.length; f++) {
        const win = new THREE.Mesh(windowGeo, windowMat);
        win.position.set(b.coordinates.x, (bHeight / b.floors.length) * f, b.coordinates.z);
        buildingGroup.add(win);
      }

      // Floating Architectural Billboard Label on Top
      const isSelected = selectedBuilding?.id === b.id;
      const labelSprite = createBuildingLabelSprite(b.code, b.name, isNight, isSelected);
      const labelY = bHeight + 0.95;
      labelSprite.position.set(b.coordinates.x, labelY, b.coordinates.z);
      labelSprite.userData = { buildingId: b.id, buildingName: b.name };
      buildingGroup.add(labelSprite);

      // Subtle architectural mounting post
      const postGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.65, 6);
      const postMat = new THREE.MeshStandardMaterial({
        color: isNight ? 0x38bdf8 : 0x718096,
        metalness: 0.6,
        roughness: 0.4,
      });
      const postMesh = new THREE.Mesh(postGeo, postMat);
      postMesh.position.set(b.coordinates.x, bHeight + 0.32, b.coordinates.z);
      buildingGroup.add(postMesh);
    });

    scene.add(buildingGroup);

    // 8. Glowing Incident Beacons (Only above affected buildings)
    const beaconGroup = new THREE.Group();
    const beaconRings: { mesh: THREE.Mesh; baseY: number; offset: number }[] = [];

    campusBuildings.forEach((b) => {
      const locKey = b.id === 'b-hostel-b' ? 'block-b'
        : b.id === 'b-hostel-c' ? 'block-c'
        : b.id === 'b-hostel-a' ? 'hostel-a'
        : b.id === 'b-library' ? 'library'
        : b.id === 'b-science' ? 'science'
        : b.id === 'b-dining' ? 'cafeteria' : '';

      const active = tickets.find((t) => t.status !== 'resolved' && (t.locationId.includes(locKey) || t.location.toLowerCase().includes(locKey)));
      if (active) {
        const catColor = categoryColors[active.category]?.hex ?? 0x0284c7;
        const bHeight = b.type === 'hostel' ? 3.8 : b.type === 'academic' ? 4.4 : 3.2;
        const beaconY = bHeight + 2.15;

        const bObj = new THREE.Group();
        bObj.position.set(b.coordinates.x, beaconY, b.coordinates.z);

        // Center Floating Diamond Crystal
        const crystalGeo = new THREE.OctahedronGeometry(0.42, 0);
        const crystalMat = new THREE.MeshStandardMaterial({
          color: catColor,
          emissive: catColor,
          emissiveIntensity: 0.8,
          roughness: 0.2,
        });
        const crystal = new THREE.Mesh(crystalGeo, crystalMat);
        crystal.userData = { isBeacon: true, buildingId: b.id, ticketId: active.id };
        bObj.add(crystal);

        // Pulsing Aura Ring
        const ringGeo = new THREE.RingGeometry(0.5, 0.76, 28);
        const ringMat = new THREE.MeshBasicMaterial({
          color: catColor,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        bObj.add(ringMesh);

        // Light Beam into roof
        const beamGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.4, 8);
        const beamMat = new THREE.MeshBasicMaterial({ color: catColor, transparent: true, opacity: 0.6 });
        const beam = new THREE.Mesh(beamGeo, beamMat);
        beam.position.y = -0.7;
        bObj.add(beam);

        beaconGroup.add(bObj);
        beaconRings.push({ mesh: ringMesh, baseY: beaconY, offset: Math.random() * 5 });
      }
    });

    scene.add(beaconGroup);

    // 9. 3D Technician Pins (Where technicians are stationed)
    const techGroup = new THREE.Group();
    const techRings: { mesh: THREE.Mesh; offset: number }[] = [];

    technicians.forEach((t, i) => {
      const bObj = campusBuildings.find((b) => b.id === t.buildingId);
      if (!bObj) return;

      const markerX = bObj.coordinates.x + 2.2;
      const markerZ = bObj.coordinates.z + 1.8;

      const techMarker = new THREE.Group();
      techMarker.position.set(markerX, 0, markerZ);

      // Radar Ripple Disc on Ground
      const radarGeo = new THREE.RingGeometry(0.35, 0.85, 24);
      const radarMat = new THREE.MeshBasicMaterial({
        color: 0x075d5d,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      });
      const radar = new THREE.Mesh(radarGeo, radarMat);
      radar.rotation.x = -Math.PI / 2;
      radar.position.y = 0.05;
      techMarker.add(radar);
      techRings.push({ mesh: radar, offset: i * 1.6 });

      // Technician Avatar Pin / Pedestal
      const pinPedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.2, 0.7, 12),
        new THREE.MeshStandardMaterial({ color: 0x075d5d, roughness: 0.3, metalness: 0.5 })
      );
      pinPedestal.position.y = 0.35;
      techMarker.add(pinPedestal);

      // Glowing Technician Sphere Head / Beacon
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0x00c49f, emissive: 0x00c49f, emissiveIntensity: 0.9, roughness: 0.2 })
      );
      head.position.y = 0.95;
      head.userData = { isTech: true, techId: t.id, buildingId: t.buildingId, techName: t.name };
      techMarker.add(head);

      techGroup.add(techMarker);
    });

    scene.add(techGroup);

    // 10. Live Technician Dispatch Route Spline
    let routeLine: THREE.Line | null = null;
    if (selectedBuilding) {
      const routeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.0, 0.08, -10.5), // Facilities Hub
        new THREE.Vector3(0.0, 0.08, 0.0),    // Central Plaza
        new THREE.Vector3(selectedBuilding.coordinates.x * 0.5, 0.08, selectedBuilding.coordinates.z * 0.5),
        new THREE.Vector3(selectedBuilding.coordinates.x, 0.08, selectedBuilding.coordinates.z),
      ]);
      const routePoints = routeCurve.getPoints(40);
      const routeGeo = new THREE.BufferGeometry().setFromPoints(routePoints);
      const routeMat = new THREE.LineDashedMaterial({
        color: isNight ? 0x00f0ff : 0x0284c7,
        dashSize: 0.5,
        gapSize: 0.25,
        linewidth: 3,
      });
      routeLine = new THREE.Line(routeGeo, routeMat);
      routeLine.computeLineDistances();
      routeLine.visible = routeActive;
      scene.add(routeLine);
    }

    // 11. Liquid-Smooth Damped Camera Controls & Fluid Drag
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const deltaX = e.clientX - prevMouseX;
        const deltaY = e.clientY - prevMouseY;
        targetAngle -= deltaX * 0.005;
        targetElevation = Math.max(0.18, Math.min(1.28, targetElevation + deltaY * 0.004));
        prevMouseX = e.clientX;
        prevMouseY = e.clientY;
      }

      // Smooth Hover Raycast
      const rect = container.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(buildingMeshes, false);

      if (intersects.length > 0) {
        container.style.cursor = 'pointer';
        const hitMesh = intersects[0].object as THREE.Mesh;
        const bName = hitMesh.userData.buildingName;
        setHoveredBuildingName(bName);

        buildingMeshes.forEach((m) => {
          if (m === hitMesh) {
            m.userData.targetY = m.userData.baseY + 0.35;
          } else {
            m.userData.targetY = m.userData.baseY;
          }
        });
      } else {
        container.style.cursor = isDragging ? 'grabbing' : 'grab';
        setHoveredBuildingName(null);
        buildingMeshes.forEach((m) => {
          m.userData.targetY = m.userData.baseY;
        });
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Smooth damped zoom
      targetDistance = Math.max(16, Math.min(52, targetDistance + e.deltaY * 0.025));
    };

    // Smooth Click Focus
    const onClick = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (const hit of intersects) {
        if (hit.object.userData?.buildingId) {
          const bId = hit.object.userData.buildingId;
          setSelectedBuildingId(bId);
          playSound('dispatch');
          const bTarget = campusBuildings.find((b) => b.id === bId);
          if (bTarget) {
            // Smoothly glide camera target towards selected building!
            targetLookAt.set(bTarget.coordinates.x * 0.6, 1.2, bTarget.coordinates.z * 0.6);
          }
          return;
        }
      }
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('wheel', onWheel, { passive: false });
    container.addEventListener('click', onClick);

    resetCameraRef.current = () => {
      targetAngle = 0.72;
      targetElevation = 0.54;
      targetDistance = 38;
      targetLookAt.set(0, 1.0, 0);
      setSelectedBuildingId(null);
    };

    // 12. 60fps Smooth Damped Animation Loop
    let animId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Fluid damped camera rotation & zoom
      currentAngle += (targetAngle - currentAngle) * 0.08;
      currentElevation += (targetElevation - currentElevation) * 0.08;
      currentDistance += (targetDistance - currentDistance) * 0.08;
      currentLookAt.lerp(targetLookAt, 0.06);

      const targetX = currentLookAt.x + Math.sin(currentAngle) * Math.cos(currentElevation) * currentDistance;
      const targetY = currentLookAt.y + Math.sin(currentElevation) * currentDistance;
      const targetZ = currentLookAt.z + Math.cos(currentAngle) * Math.cos(currentElevation) * currentDistance;

      camera.position.set(targetX, targetY, targetZ);
      camera.lookAt(currentLookAt);

      // Smooth Hover Lift on Buildings
      buildingMeshes.forEach((m) => {
        m.userData.currentY += (m.userData.targetY - m.userData.currentY) * 0.12;
        m.position.y = m.userData.currentY;
      });

      // Animate Incident Beacon Rings
      beaconRings.forEach(({ mesh, offset }) => {
        const pulse = (Math.sin(elapsedTime * 3.0 + offset) + 1) / 2;
        mesh.scale.set(1 + pulse * 0.55, 1 + pulse * 0.55, 1);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 - pulse * 0.5;
      });

      // Animate Technician Ground Radars
      techRings.forEach(({ mesh, offset }) => {
        const pulse = (Math.sin(elapsedTime * 2.6 + offset) + 1) / 2;
        mesh.scale.set(1 + pulse * 0.5, 1 + pulse * 0.5, 1);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.9 - pulse * 0.6;
      });

      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      const w = container.clientWidth || 900;
      const h = container.clientHeight || 560;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('wheel', onWheel);
      container.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [viewMode, selectedBuilding, tickets, technicians, routeActive, lightingMode, campusBuildings]);

  return (
    <div className="campus-twin-container free-layout">
      {/* Top Header Bar */}
      <div className="campus-header-card">
        <div className="campus-header-title">
          <div className="campus-title-pill">
            <span className="live-pulse-dot" />
            <h3>Virtual Campus Digital Twin & Spatial Telemetry</h3>
          </div>
          <p className="campus-subtitle">
            Uncluttered spatial view of 8 campus blocks. Locate active technicians, inspect incident hot-spots, and track dispatch paths in real-time.
          </p>
        </div>

        {/* Action Controls */}
        <div className="campus-controls-bar">
          <div className="view-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${viewMode === '3d' ? 'active' : ''}`}
              onClick={() => {
                playSound('click');
                setViewMode('3d');
              }}
            >
              <Symbol name="view_in_ar" />
              <span>3D Twin</span>
            </button>
            <button
              type="button"
              className={`mode-btn ${viewMode === '2d' ? 'active' : ''}`}
              onClick={() => {
                playSound('click');
                setViewMode('2d');
              }}
            >
              <Symbol name="grid_view" />
              <span>2D Grid</span>
            </button>
          </div>

          <button
            type="button"
            className={`button secondary sm route-toggle-btn ${routeActive ? 'active' : ''}`}
            onClick={() => {
              playSound('click');
              setRouteActive(!routeActive);
            }}
            title="Toggle live dispatch route visualization"
          >
            <Symbol name="alt_route" />
            <span>{routeActive ? 'Route: On' : 'Route: Off'}</span>
          </button>

          {viewMode === '3d' && (
            <button
              type="button"
              className={`button secondary sm night-toggle-btn ${lightingMode === 'night' ? 'active' : ''}`}
              onClick={() => {
                playSound('click');
                setLightingMode((prev) => (prev === 'day' ? 'night' : 'day'));
              }}
              title="Toggle Day / Night Twilight mode"
            >
              <Symbol name={lightingMode === 'night' ? 'dark_mode' : 'light_mode'} filled={lightingMode === 'night'} />
              <span>{lightingMode === 'night' ? 'Night Twin' : 'Daylight'}</span>
            </button>
          )}

          <button
            type="button"
            className={`button secondary sm audio-toggle-btn ${audioMutedState ? 'muted' : ''}`}
            onClick={() => {
              const next = !audioMutedState;
              setAudioMutedState(next);
              setAudioMuted(next);
              if (!next) playSound('click');
            }}
            title={audioMutedState ? 'Unmute campus audio feedback' : 'Mute campus audio feedback'}
          >
            <Symbol name={audioMutedState ? 'volume_off' : 'volume_up'} />
            <span>{audioMutedState ? 'Muted' : 'Audio'}</span>
          </button>

          {viewMode === '3d' && (
            <button
              type="button"
              className="button secondary sm reset-cam-btn"
              onClick={() => {
                playSound('click');
                resetCameraRef.current();
              }}
              title="Reset view to full campus overview"
            >
              <Symbol name="restart_alt" />
              <span>Overview</span>
            </button>
          )}

          {isAdmin && onOpenArchitect && (
            <button
              type="button"
              className="button primary sm architect-btn"
              onClick={() => {
                playSound('click');
                onOpenArchitect();
              }}
              title="Architect & customize campus buildings"
            >
              <Symbol name="domain_add" />
              <span>Design Campus</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="campus-filter-row">
        <div className="campus-filter-group">
          <span className="filter-label">Filter:</span>
          <div className="filter-pills">
            {['all', 'plumbing', 'electricity', 'cleanliness', 'internet'].map((cat) => (
              <button
                key={cat}
                type="button"
                className={`filter-pill ${categoryFilter === cat ? 'active' : ''}`}
                onClick={() => {
                  playSound('click');
                  setCategoryFilter(cat);
                }}
              >
                {cat === 'all' ? 'All Incidents' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="campus-filter-group">
          <span className="filter-label">On-Duty Techs:</span>
          <div className="tech-badge-list">
            {technicians.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tech-select-pill ${selectedBuilding?.id === t.buildingId ? 'highlighted' : ''}`}
                onClick={() => {
                  playSound('dispatch');
                  setSelectedBuildingId(t.buildingId);
                }}
              >
                <span className="tech-avatar-mini">{t.name.split(' ').map((p) => p[0]).join('')}</span>
                <span className="tech-name">{t.name}</span>
                <span className="tech-building-tag">({t.buildingName.split(' ')[0]})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Full-Bleed 3D Viewport with Floating Glassmorphic Telemetry Card */}
      <div className="campus-viewport-card free-canvas-wrap">
        {viewMode === '3d' ? (
          <div className="relative w-full h-[580px]">
            <div ref={mountRef} className="three-canvas-mount" />

            {/* Floating Top-Left HUD Badge */}
            <div className="canvas-hud-overlay-clean">
              <div className="hud-badge-floating">
                <Symbol name="explore" filled />
                <span>
                  {hoveredBuildingName
                    ? `Hovering: ${hoveredBuildingName} · Click to inspect`
                    : 'Smooth Orbit Drag • Scroll to Zoom • Click any building or technician'}
                </span>
              </div>

              {/* Floating Bottom-Left Legend */}
              <div className="hud-legend-floating">
                <span className="legend-chip plumbing"><span className="dot" /> Plumbing</span>
                <span className="legend-chip electricity"><span className="dot" /> Electrical</span>
                <span className="legend-chip cleanliness"><span className="dot" /> Sanitation</span>
                <span className="legend-chip internet"><span className="dot" /> Wi-Fi</span>
                <span className="legend-chip technician"><span className="dot tech-dot" /> Technician Pin</span>
              </div>
            </div>

            {/* Floating Glassmorphic Telemetry Card (Opens smoothly when building selected) */}
            {selectedBuilding && (
              <aside className="floating-telemetry-card">
                <div className="telemetry-card-head">
                  <div>
                    <span className="telemetry-eyebrow">Facility Telemetry</span>
                    <h4 className="telemetry-name">{selectedBuilding.name}</h4>
                    <span className="telemetry-code">{selectedBuilding.code} · {selectedBuilding.type.toUpperCase()}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-button close-drawer-btn"
                    aria-label="Close details"
                    onClick={() => setSelectedBuildingId(null)}
                  >
                    <Symbol name="close" />
                  </button>
                </div>

                {/* Technician Stationed At This Facility */}
                <div className="telemetry-box tech-box">
                  <div className="box-title-row">
                    <span className="box-badge">
                      <Symbol name="engineering" filled /> Technician Assigned
                    </span>
                    {selectedTech ? (
                      <span className={`status-pill ${selectedTech.status}`}>
                        ● {selectedTech.status === 'on_site' ? 'On-Site' : selectedTech.status === 'en_route' ? 'En Route' : 'Diagnostics'}
                      </span>
                    ) : (
                      <span className="status-pill available">Hub Standby</span>
                    )}
                  </div>

                  {selectedTech ? (
                    <div className="tech-mini-profile">
                      <div className="tech-avatar-round">
                        {selectedTech.name.split(' ').map((p) => p[0]).join('')}
                      </div>
                      <div className="tech-info">
                        <strong>{selectedTech.name}</strong>
                        <span>{selectedTech.role}</span>
                        <span className="tech-channel">{selectedTech.contact}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="no-tech-text">
                      No technician currently inside this block. Units dispatch from Facilities Hub.
                    </p>
                  )}
                </div>

                {/* Active Incidents in Building */}
                <div className="telemetry-box">
                  <div className="box-title-row">
                    <span className="box-badge">
                      <Symbol name="warning" filled /> Active Incidents ({buildingTickets.length})
                    </span>
                  </div>

                  {buildingTickets.length > 0 ? (
                    <div className="incident-cards-scroll">
                      {buildingTickets.map((t) => (
                        <div key={t.id} className={`incident-mini-card ${t.category}`}>
                          <div className="incident-card-top">
                            <span className="incident-id">{t.publicId}</span>
                            <span className={`cat-pill ${t.category}`}>{t.category}</span>
                          </div>
                          <strong className="incident-summary">{t.summary}</strong>
                          <p className="incident-loc">{t.location}</p>
                          <div className="incident-action-row">
                            <span className="incident-assignee">Assignee: {t.assignee ?? 'Unassigned'}</span>
                            {onOpenTicket && (
                              <button
                                type="button"
                                className="button primary sm inspect-btn"
                                onClick={() => onOpenTicket(t.id)}
                              >
                                View Ticket
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="building-clean-banner">
                      <Symbol name="verified" filled />
                      <span>Facility nominal. Zero open incidents reported in this zone.</span>
                    </div>
                  )}
                </div>

                {/* Facility Floors List */}
                <div className="telemetry-box floors-box">
                  <span className="box-badge"><Symbol name="layers" /> Monitored Floors:</span>
                  <div className="floor-tags">
                    {selectedBuilding.floors.map((f) => (
                      <span key={f} className="floor-tag">{f}</span>
                    ))}
                  </div>
                </div>
              </aside>
            )}
          </div>
        ) : (
          /* 2D Tactical Grid */
          <div className="campus-2d-grid">
            <svg className="campus-svg-layer" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="campus-grid-pattern-free" width="32" height="32" patternUnits="userSpaceOnUse">
                  <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#d5e5df" strokeWidth="0.8" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#campus-grid-pattern-free)" />

              {/* Connecting Walkways */}
              <line x1="18%" y1="74%" x2="50%" y2="50%" stroke="#075d5d" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.4" />
              <line x1="18%" y1="26%" x2="50%" y2="50%" stroke="#075d5d" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.4" />
              <line x1="10%" y1="50%" x2="50%" y2="50%" stroke="#075d5d" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.4" />
              <line x1="82%" y1="74%" x2="50%" y2="50%" stroke="#075d5d" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.4" />
              <line x1="82%" y1="26%" x2="50%" y2="50%" stroke="#075d5d" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.4" />
              <line x1="50%" y1="88%" x2="50%" y2="50%" stroke="#075d5d" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.4" />
              <line x1="50%" y1="12%" x2="50%" y2="50%" stroke="#075d5d" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.4" />
            </svg>

            {/* Central Plaza Badge */}
            <div className="campus-2d-plaza">
              <span>Central<br />Plaza</span>
            </div>

            {/* Building Nodes */}
            {campusBuildings.map((b) => {
              const isSelected = b.id === selectedBuilding?.id;
              const techHere = technicians.find((t) => t.buildingId === b.id);
              const locKey = b.id === 'b-hostel-b' ? 'block-b'
                : b.id === 'b-hostel-c' ? 'block-c'
                : b.id === 'b-hostel-a' ? 'hostel-a'
                : b.id === 'b-library' ? 'library'
                : b.id === 'b-science' ? 'science'
                : b.id === 'b-dining' ? 'cafeteria' : '';
              const openCount = tickets.filter((t) => t.status !== 'resolved' && (t.locationId.includes(locKey) || t.location.toLowerCase().includes(locKey))).length;

              return (
                <div
                  key={b.id}
                  className={`campus-node ${isSelected ? 'selected' : ''}`}
                  style={{ left: `${b.mapPosition.x}%`, top: `${b.mapPosition.y}%` }}
                  onClick={() => setSelectedBuildingId(b.id)}
                >
                  <div className="campus-node-inner">
                    <div className="node-code-row">
                      <span className="node-code">{b.code}</span>
                      {openCount > 0 && <span className="node-ticket-badge">{openCount}</span>}
                    </div>
                    <span className="node-name">{b.name}</span>
                    {techHere && (
                      <div className="node-tech-tag">
                        <Symbol name="engineering" filled />
                        <span>{techHere.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}