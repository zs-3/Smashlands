import * as THREE from 'three';
import { MAPS, MapId } from './catalog';
import { ProceduralTextureBank } from './textures';

export interface ObstacleCollider {
  x: number;
  z: number;
  radius: number;
  height: number;
}

export interface RampVolume {
  cx: number;
  cz: number;
  halfW: number;
  halfL: number;
  yaw: number; // Direction ramp ascends toward (-Z local rotated by yaw)
  maxHeight: number;
  isFlatDeck?: boolean;
}

export interface BoostZone {
  x: number;
  z: number;
  radius: number;
  yaw: number;
}

export interface BuiltArena {
  mapId: MapId;
  group: THREE.Group;
  arenaRadius: number;
  traction: number;
  obstacles: ObstacleCollider[];
  ramps: RampVolume[];
  boostZones: BoostZone[];
  boxSpawns: THREE.Vector3[];
  kartSpawns: { x: number; z: number; yaw: number }[];
  sampleGround: (x: number, z: number) => {
    height: number;
    isHazard: boolean;
    isBoost: boolean;
  };
  updateAnimatedProps: (elapsed: number) => void;
}

export function buildArena(mapId: MapId, texBank: ProceduralTextureBank): BuiltArena {
  const def = MAPS.find((m) => m.id === mapId) || MAPS[0];
  const group = new THREE.Group();
  const obstacles: ObstacleCollider[] = [];
  const ramps: RampVolume[] = [];
  const boostZones: BoostZone[] = [];
  const animatedRefs: { ferrisWheel?: THREE.Object3D; seaPlane?: THREE.Mesh } = {};

  const R = def.arenaRadius;
  const groundTex = texBank.getArenaGroundTexture(mapId);

  // 1. Extended Natural Outdoor Perimeter Sea / Lava / Cloud Field (Zero indoor walls in empty void!)
  const seaColor =
    mapId === 'magma_foundry'
      ? '#ea580c'
      : mapId === 'skytop_park'
        ? '#312e81'
        : mapId === 'frostbite_bay'
          ? '#38bdf8'
          : mapId === 'canyon_bowl'
            ? '#7c2d12'
            : '#0284c7';

  const seaMat = new THREE.MeshStandardMaterial({
    color: seaColor,
    roughness: mapId === 'magma_foundry' ? 0.45 : 0.22,
    metalness: mapId === 'skytop_park' ? 0.1 : 0.35,
    emissive: mapId === 'magma_foundry' ? '#c2410c' : mapId === 'skytop_park' ? '#1e1b4b' : '#000000',
    emissiveIntensity: mapId === 'magma_foundry' ? 0.75 : 0.35,
  });
  const outerPlane = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), seaMat);
  outerPlane.rotation.x = -Math.PI / 2;
  outerPlane.position.y = -2.2;
  group.add(outerPlane);
  animatedRefs.seaPlane = outerPlane;

  // 2. Main Playable Arena Island / Deck Platform (Grounded cylinder with natural rock/cliff skirt)
  const cliffColor =
    mapId === 'smash_island'
      ? '#b45309'
      : mapId === 'magma_foundry'
        ? '#1c1917'
        : mapId === 'skytop_park'
          ? '#1e293b'
          : mapId === 'frostbite_bay'
            ? '#94a3b8'
            : mapId === 'canyon_bowl'
              ? '#9a3412'
              : '#78350f';

  const islandBase = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R + 6, 4.4, 48),
    new THREE.MeshStandardMaterial({ color: cliffColor, roughness: 0.88, metalness: 0.1 }),
  );
  islandBase.position.y = -2.2;
  islandBase.receiveShadow = true;
  group.add(islandBase);

  const deckTop = new THREE.Mesh(
    new THREE.CylinderGeometry(R - 0.2, R, 0.24, 48),
    new THREE.MeshStandardMaterial({
      map: groundTex,
      roughness: mapId === 'frostbite_bay' ? 0.24 : 0.78,
      metalness: mapId === 'skytop_park' ? 0.35 : 0.08,
    }),
  );
  deckTop.position.y = -0.12;
  deckTop.receiveShadow = true;
  group.add(deckTop);

  // Low natural perimeter curbs / rocks / bollards (with gaps so risky knock-offs can happen!)
  const rockCount = 28;
  const rockGeo =
    mapId === 'skytop_park' || mapId === 'carnival_pier'
      ? new THREE.BoxGeometry(5.2, 1.5, 1.4)
      : new THREE.DodecahedronGeometry(2.4, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color:
      mapId === 'skytop_park'
        ? '#a855f7'
        : mapId === 'carnival_pier'
          ? '#f43f5e'
          : mapId === 'frostbite_bay'
            ? '#e0f2fe'
            : cliffColor,
    roughness: 0.65,
    metalness: mapId === 'skytop_park' ? 0.6 : 0.15,
    emissive: mapId === 'skytop_park' ? '#7e22ce' : '#000000',
    emissiveIntensity: 0.35,
  });
  const perimeterInst = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
  perimeterInst.castShadow = true;
  perimeterInst.receiveShadow = true;
  const dummy = new THREE.Object3D();
  let instIdx = 0;
  for (let i = 0; i < rockCount; i++) {
    // Leave 4 dramatic knock-off openings around the compass points
    if (i % 7 === 0) {
      dummy.position.set(0, -50, 0);
      dummy.scale.setScalar(0.01);
      dummy.updateMatrix();
      perimeterInst.setMatrixAt(instIdx++, dummy.matrix);
      continue;
    }
    const a = (i / rockCount) * Math.PI * 2;
    const rx = Math.cos(a) * (R - 2.2);
    const rz = Math.sin(a) * (R - 2.2);
    dummy.position.set(rx, 0.75, rz);
    dummy.rotation.set(0, -a + Math.PI / 2, 0);
    const sc = 0.9 + (i % 3) * 0.14;
    dummy.scale.set(sc, sc * 0.85, sc);
    dummy.updateMatrix();
    perimeterInst.setMatrixAt(instIdx++, dummy.matrix);
    obstacles.push({ x: rx, z: rz, radius: 2.2, height: 2.2 });
  }
  perimeterInst.instanceMatrix.needsUpdate = true;
  perimeterInst.computeBoundingSphere();
  group.add(perimeterInst);

  // Helper to add a driveable 3D Stunt Ramp or Elevated Deck
  const rampMat = new THREE.MeshStandardMaterial({
    color: mapId === 'magma_foundry' ? '#57534e' : mapId === 'skytop_park' ? '#312e81' : '#cbd5e1',
    roughness: 0.55,
    metalness: 0.35,
  });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: def.accentHex,
    emissive: def.accentHex,
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });

  const addStuntRamp = (cx: number, cz: number, width: number, length: number, maxH: number, yaw: number) => {
    // Wedge geometry ascending along local -Z
    const shape = new THREE.Shape();
    shape.moveTo(-length / 2, 0);
    shape.lineTo(length / 2, 0);
    shape.lineTo(length / 2, maxH);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    geo.translate(0, 0, -width / 2);
    // In local space before rotation: X is [-length/2..+length/2] ascending toward +X; rotate -PI/2 around Y so +X becomes +Z or -Z:
    // Let's align so local -Z is the high lip!
    geo.rotateY(Math.PI / 2); // Now +X -> -Z (high end at z = -length/2!)
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, rampMat);
    mesh.position.set(cx, 0, cz);
    mesh.rotation.y = yaw;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Side rails highlight
    const lip = new THREE.Mesh(new THREE.BoxGeometry(width + 0.2, 0.18, 0.45), stripeMat);
    lip.position.set(0, maxH + 0.04, -length / 2 + 0.22);
    mesh.add(lip);

    ramps.push({
      cx,
      cz,
      halfW: width / 2,
      halfL: length / 2,
      yaw,
      maxHeight: maxH,
    });
  };

  const addElevatedDeck = (cx: number, cz: number, width: number, length: number, height: number, yaw = 0) => {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), rampMat);
    deck.position.set(cx, height / 2, cz);
    deck.rotation.y = yaw;
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    ramps.push({
      cx,
      cz,
      halfW: width / 2,
      halfL: length / 2,
      yaw,
      maxHeight: height,
      isFlatDeck: true,
    });
  };

  const addBoostPad = (x: number, z: number, yaw: number) => {
    const pad = new THREE.Mesh(
      new THREE.PlaneGeometry(5.2, 7.5),
      new THREE.MeshBasicMaterial({
        map: texBank.boostPadTex,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    );
    pad.rotation.x = -Math.PI / 2;
    pad.rotation.z = -yaw;
    pad.position.set(x, 0.06, z);
    group.add(pad);
    boostZones.push({ x, z, radius: 4.0, yaw });
  };

  const addPillarCluster = (x: number, z: number, radius: number, height: number, color: string) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.92, radius * 1.08, height, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2 }),
    );
    base.position.y = height / 2;
    base.castShadow = true;
    base.receiveShadow = true;
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 1.12, radius * 0.95, 0.55, 12),
      stripeMat,
    );
    cap.position.y = height + 0.25;
    g.add(base, cap);
    group.add(g);
    obstacles.push({ x, z, radius: radius + 0.35, height: height + 0.5 });
  };

  // 3. Map-Specific Architecture, Stunt Ramps, Hazards & Horizon Scenery
  let centralHazardRadius = 0;

  if (mapId === 'smash_island') {
    // Central Volcano Mound + 4 Stunt Ramps + Tropical Palm Groves!
    addElevatedDeck(0, 0, 14, 14, 2.6, 0);
    addStuntRamp(0, 12.5, 9, 11, 2.6, 0); // Northbound climb
    addStuntRamp(0, -12.5, 9, 11, 2.6, Math.PI); // Southbound climb
    addStuntRamp(12.5, 0, 9, 11, 2.6, Math.PI / 2);
    addStuntRamp(-12.5, 0, 9, 11, 2.6, -Math.PI / 2);

    addBoostPad(-28, 0, 0);
    addBoostPad(28, 0, Math.PI);
    addBoostPad(0, -32, Math.PI / 2);
    addBoostPad(0, 32, -Math.PI / 2);

    // 4 Tiki Totem Pillars + Palm Trees inside & outside island
    const palmTrunkGeo = new THREE.CylinderGeometry(0.32, 0.52, 6.2, 8);
    const palmLeafGeo = new THREE.ConeGeometry(2.8, 2.2, 7);
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#92400e', roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.65 });

    const palmCoords: [number, number, boolean][] = [
      [-22, -22, true],
      [22, -22, true],
      [-22, 22, true],
      [22, 22, true],
      [-38, 12, true],
      [38, -12, true],
      // Distant reef islets outside arena
      [-95, -80, false],
      [105, -75, false],
      [-110, 85, false],
      [98, 92, false],
    ];
    for (const [px, pz, solid] of palmCoords) {
      const palm = new THREE.Group();
      palm.position.set(px, solid ? 0 : -1.8, pz);
      if (!solid) {
        const islet = new THREE.Mesh(
          new THREE.ConeGeometry(14, 5, 12),
          new THREE.MeshStandardMaterial({ color: '#fcd34d', roughness: 0.9 }),
        );
        islet.position.y = 1.2;
        palm.add(islet);
      }
      const trunk = new THREE.Mesh(palmTrunkGeo, trunkMat);
      trunk.position.y = 3.1;
      trunk.castShadow = solid;
      const crown1 = new THREE.Mesh(palmLeafGeo, leafMat);
      crown1.position.y = 6.2;
      const crown2 = new THREE.Mesh(palmLeafGeo, leafMat);
      crown2.position.y = 7.1;
      crown2.scale.setScalar(0.75);
      palm.add(trunk, crown1, crown2);
      group.add(palm);
      if (solid) obstacles.push({ x: px, z: pz, radius: 1.25, height: 6 });
    }
  } else if (mapId === 'magma_foundry') {
    // Glowing Central Lava Caldera + Jump Ramps across it + Basalt Smelter Pillars!
    centralHazardRadius = 9.2;
    const lavaPool = new THREE.Mesh(
      new THREE.CylinderGeometry(centralHazardRadius, centralHazardRadius, 0.32, 32),
      new THREE.MeshStandardMaterial({
        color: '#f97316',
        emissive: '#ea580c',
        emissiveIntensity: 1.1,
        roughness: 0.3,
      }),
    );
    lavaPool.position.y = 0.02;
    group.add(lavaPool);

    // 4 Stunt Ramps launching right over the central lava pit!
    addStuntRamp(0, 16, 7.5, 9, 2.3, 0);
    addStuntRamp(0, -16, 7.5, 9, 2.3, Math.PI);
    addStuntRamp(16, 0, 7.5, 9, 2.3, Math.PI / 2);
    addStuntRamp(-16, 0, 7.5, 9, 2.3, -Math.PI / 2);

    addPillarCluster(-25, -24, 2.2, 6.5, '#292524');
    addPillarCluster(25, -24, 2.2, 6.5, '#292524');
    addPillarCluster(-25, 24, 2.2, 6.5, '#292524');
    addPillarCluster(25, 24, 2.2, 6.5, '#292524');

    addBoostPad(-36, 0, 0);
    addBoostPad(36, 0, Math.PI);

    // Distant volcanic spires rising out of the lava sea
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.3;
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(16 + (i % 3) * 6, 38 + (i % 4) * 10, 7),
        new THREE.MeshStandardMaterial({ color: '#1c1917', roughness: 0.9 }),
      );
      spire.position.set(Math.cos(a) * 135, 14, Math.sin(a) * 135);
      group.add(spire);
    }
  } else if (mapId === 'skytop_park') {
    // Elevated Neon Crossover Deck + 6 Turbo Boost Strips + Distant Skyline Spires!
    addElevatedDeck(0, 0, 16, 26, 2.8, 0);
    addStuntRamp(0, 18.5, 10, 11, 2.8, 0);
    addStuntRamp(0, -18.5, 10, 11, 2.8, Math.PI);

    addStuntRamp(-26, 0, 8, 10, 2.2, 0);
    addStuntRamp(26, 0, 8, 10, 2.2, Math.PI);

    addBoostPad(-40, -14, 0);
    addBoostPad(-40, 14, 0);
    addBoostPad(40, -14, Math.PI);
    addBoostPad(40, 14, Math.PI);

    addPillarCluster(-20, -28, 1.9, 5.5, '#312e81');
    addPillarCluster(20, -28, 1.9, 5.5, '#312e81');
    addPillarCluster(-20, 28, 1.9, 5.5, '#312e81');
    addPillarCluster(20, 28, 1.9, 5.5, '#312e81');

    // Distant futuristic skyscrapers piercing through the cloud layer
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const h = 45 + (i % 4) * 18;
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(14, h, 14),
        new THREE.MeshStandardMaterial({
          color: '#1e1b4b',
          emissive: i % 2 === 0 ? '#6366f1' : '#ec4899',
          emissiveIntensity: 0.22,
          roughness: 0.4,
        }),
      );
      tower.position.set(Math.cos(a) * 145, h / 2 - 22, Math.sin(a) * 145);
      group.add(tower);
    }
  } else if (mapId === 'frostbite_bay') {
    // Slippery Arctic Arena + Twin Glacier Ramps + Crystal Spires + Drifting Icebergs!
    addStuntRamp(-14, 6, 8.5, 11, 2.4, 0);
    addStuntRamp(14, -6, 8.5, 11, 2.4, Math.PI);

    const crystalPositions: [number, number][] = [
      [0, 0],
      [-26, -24],
      [26, -24],
      [-26, 24],
      [26, 24],
    ];
    for (const [cx, cz] of crystalPositions) {
      addPillarCluster(cx, cz, cx === 0 ? 2.8 : 2.0, cx === 0 ? 7.2 : 5.0, '#7dd3fc');
    }

    addBoostPad(0, -36, Math.PI / 2);
    addBoostPad(0, 36, -Math.PI / 2);

    // Distant icebergs in the arctic bay
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const berg = new THREE.Mesh(
        new THREE.DodecahedronGeometry(14 + (i % 3) * 5, 0),
        new THREE.MeshStandardMaterial({ color: '#f0f9ff', roughness: 0.45 }),
      );
      berg.position.set(Math.cos(a) * 120, 1, Math.sin(a) * 120);
      group.add(berg);
    }
  } else if (mapId === 'canyon_bowl') {
    // Redstone Desert Derby with 4 inward-launching stunt ramps & sandstone mesas!
    addStuntRamp(0, 22, 9, 10, 2.3, 0);
    addStuntRamp(0, -22, 9, 10, 2.3, Math.PI);
    addStuntRamp(22, 0, 9, 10, 2.3, Math.PI / 2);
    addStuntRamp(-22, 0, 9, 10, 2.3, -Math.PI / 2);

    addPillarCluster(-18, -18, 2.3, 5.8, '#9a3412');
    addPillarCluster(18, -18, 2.3, 5.8, '#9a3412');
    addPillarCluster(-18, 18, 2.3, 5.8, '#9a3412');
    addPillarCluster(18, 18, 2.3, 5.8, '#9a3412');

    addBoostPad(-38, 0, 0);
    addBoostPad(38, 0, Math.PI);

    // Distant towering Redstone Mesas
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.2;
      const mesa = new THREE.Mesh(
        new THREE.CylinderGeometry(16, 24, 34, 8),
        new THREE.MeshStandardMaterial({ color: '#9a3412', roughness: 0.92 }),
      );
      mesa.position.set(Math.cos(a) * 140, 14, Math.sin(a) * 140);
      group.add(mesa);
    }
  } else {
    // carnival_pier: Festive Boardwalk Pier + Giant Rotating Ferris Wheel Landmark!
    addElevatedDeck(0, 0, 14, 14, 2.2, Math.PI / 4);
    addStuntRamp(0, 16, 8.5, 10, 2.2, 0);
    addStuntRamp(0, -16, 8.5, 10, 2.2, Math.PI);

    addPillarCluster(-24, -18, 2.0, 4.2, '#ec4899');
    addPillarCluster(24, -18, 2.0, 4.2, '#facc15');
    addPillarCluster(-24, 18, 2.0, 4.2, '#06b6d4');
    addPillarCluster(24, 18, 2.0, 4.2, '#a855f7');

    addBoostPad(-36, 0, 0);
    addBoostPad(36, 0, Math.PI);

    // Giant Rotating Ferris Wheel Landmark outside the north boardwalk edge!
    const ferrisBase = new THREE.Group();
    ferrisBase.position.set(0, -1, -102);
    const legMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4, metalness: 0.6 });
    const wheelRingMat = new THREE.MeshStandardMaterial({
      color: '#ec4899',
      emissive: '#f43f5e',
      emissiveIntensity: 0.45,
      roughness: 0.3,
    });
    for (const zOff of [-3, 3]) {
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 34, 8), legMat);
      legL.position.set(-9, 15, zOff);
      legL.rotation.z = -0.26;
      const legR = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 34, 8), legMat);
      legR.position.set(9, 15, zOff);
      legR.rotation.z = 0.26;
      ferrisBase.add(legL, legR);
    }
    const wheelSpinner = new THREE.Group();
    wheelSpinner.position.set(0, 30, 0);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(22, 0.85, 10, 32), wheelRingMat);
    wheelSpinner.add(rim);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 44, 6), legMat);
      spoke.rotation.z = a;
      const cab = new THREE.Mesh(
        new THREE.BoxGeometry(3.4, 3.4, 3.4),
        new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? '#facc15' : '#38bdf8', roughness: 0.4 }),
      );
      cab.position.set(Math.cos(a) * 22, Math.sin(a) * 22, 0);
      wheelSpinner.add(spoke, cab);
    }
    ferrisBase.add(wheelSpinner);
    group.add(ferrisBase);
    animatedRefs.ferrisWheel = wheelSpinner;
  }

  // 4. Strategic '?' Mystery Weapon Box Spawns (14 crates distributed across high & low lanes!)
  const boxSpawns: THREE.Vector3[] = [];
  const ring1 = 8;
  for (let i = 0; i < ring1; i++) {
    const a = (i / ring1) * Math.PI * 2 + 0.39;
    const dist = 34;
    const bx = Math.cos(a) * dist;
    const bz = Math.sin(a) * dist;
    boxSpawns.push(new THREE.Vector3(bx, 0, bz));
  }
  const innerCandidates: [number, number][] = [
    [0, 0],
    [-14, 0],
    [14, 0],
    [0, -15],
    [0, 15],
    [-26, -26],
  ];
  for (const [ix, iz] of innerCandidates) {
    // Skip if inside central lava pool or overlapping a solid pillar
    if (centralHazardRadius > 0 && Math.hypot(ix, iz) < centralHazardRadius + 2) continue;
    if (obstacles.some((o) => Math.hypot(o.x - ix, o.z - iz) < o.radius + 2.2)) continue;
    boxSpawns.push(new THREE.Vector3(ix, 0, iz));
  }

  // 5. 16 Balanced Kart Spawn Slots around the arena ring facing inward
  const kartSpawns: { x: number; z: number; yaw: number }[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const spawnR = R - 13;
    const sx = Math.cos(a) * spawnR;
    const sz = Math.sin(a) * spawnR;
    // Kart forward is -Z, so yaw facing center (0,0) from (sx, sz):
    const yaw = Math.atan2(sx, sz);
    kartSpawns.push({ x: sx, z: sz, yaw });
  }

  const sampleGround = (x: number, z: number) => {
    const distFromCenter = Math.hypot(x, z);
    if (distFromCenter > R + 0.5) {
      return { height: -2.2, isHazard: true, isBoost: false };
    }
    if (centralHazardRadius > 0 && distFromCenter < centralHazardRadius - 0.4) {
      return { height: 0.0, isHazard: true, isBoost: false };
    }

    let h = 0;
    for (const r of ramps) {
      const dx = x - r.cx;
      const dz = z - r.cz;
      const cos = Math.cos(-r.yaw);
      const sin = Math.sin(-r.yaw);
      const lx = dx * cos - dz * sin;
      const lz = dx * sin + dz * cos;
      if (Math.abs(lx) <= r.halfW && Math.abs(lz) <= r.halfL) {
        if (r.isFlatDeck) {
          h = Math.max(h, r.maxHeight);
        } else {
          // Ascends from +halfL (0) to -halfL (maxHeight)
          const t = THREE.MathUtils.clamp((r.halfL - lz) / (r.halfL * 2), 0, 1);
          h = Math.max(h, t * r.maxHeight);
        }
      }
    }

    let isBoost = false;
    for (const b of boostZones) {
      if (Math.hypot(x - b.x, z - b.z) < b.radius) {
        isBoost = true;
        break;
      }
    }

    return { height: h, isHazard: false, isBoost };
  };

  // Elevate any box spawn sitting on an elevated deck/ramp
  for (const bs of boxSpawns) {
    bs.y = sampleGround(bs.x, bs.z).height;
  }

  const updateAnimatedProps = (elapsed: number) => {
    if (animatedRefs.ferrisWheel) {
      animatedRefs.ferrisWheel.rotation.z = elapsed * 0.28;
    }
  };

  return {
    mapId,
    group,
    arenaRadius: R,
    traction: def.traction,
    obstacles,
    ramps,
    boostZones,
    boxSpawns,
    kartSpawns,
    sampleGround,
    updateAnimatedProps,
  };
}
