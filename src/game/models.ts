import * as THREE from 'three';
import {
  HatId,
  KARTS,
  KartId,
  PAINT_FINISHES,
  PaintFinishId,
  SKINS,
  SkinId,
  WHEELS,
  WheelId,
} from './catalog';

export interface BuiltKartRig {
  root: THREE.Group;
  bodyTiltGroup: THREE.Group;
  driverHeadGroup: THREE.Group;
  frontLeftPivot: THREE.Group;
  frontRightPivot: THREE.Group;
  wheelSpinMeshes: THREE.Object3D[];
  exhaustTips: THREE.Vector3[]; // Local offsets relative to bodyTiltGroup
  shieldDome: THREE.Mesh;
  crownMesh: THREE.Group;
  teamRing: THREE.Mesh;
  hitFlashMaterials: { mat: THREE.MeshStandardMaterial; origEmissive: THREE.Color; origIntensity: number }[];
  propellerSpinner?: THREE.Object3D;
}

export interface BuildKartOptions {
  kartId: KartId;
  paintColor: string;
  paintFinish: PaintFinishId;
  wheelId: WheelId;
  skinId: SkinId;
  hatId: HatId;
  contactShadowTex: THREE.Texture;
  isSoftwareGl: boolean;
  team?: 'none' | 'red' | 'blue';
}

function makeExtrudedHull(
  points: [number, number][],
  width: number,
  bevel = 0.08,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) {
    shape.lineTo(points[i][0], points[i][1]);
  }
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: width,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  // Extrude is along +Z, profile is X (length: -Z to +Z) -> rotate so X is width and Z is length
  geo.translate(0, 0, -width / 2);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

export function buildDriverAndHat(
  skinId: SkinId,
  hatId: HatId,
  flashList: { mat: THREE.MeshStandardMaterial; origEmissive: THREE.Color; origIntensity: number }[],
): { driverRoot: THREE.Group; headGroup: THREE.Group; propellerSpinner?: THREE.Object3D } {
  const skin = SKINS.find((s) => s.id === skinId) || SKINS[0];
  const driverRoot = new THREE.Group();

  const suitMat = new THREE.MeshStandardMaterial({
    color: skin.secondaryColor,
    roughness: 0.55,
    metalness: 0.15,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: skin.primaryColor,
    roughness: skinId === 'king_midas' || skinId === 'toaster_bot' || skinId === 'sir_knight' ? 0.2 : 0.45,
    metalness: skinId === 'king_midas' || skinId === 'toaster_bot' || skinId === 'sir_knight' || skinId === 'mecha_unit' ? 0.85 : 0.1,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: skin.visorColor,
    roughness: 0.15,
    metalness: 0.65,
    emissive:
      skinId === 'mecha_unit' || skinId === 'cyber_cat' || skinId === 'inferno_imp' || skinId === 'shadow_ninja'
        ? skin.visorColor
        : '#000000',
    emissiveIntensity: 0.55,
  });

  flashList.push(
    { mat: suitMat, origEmissive: suitMat.emissive.clone(), origIntensity: suitMat.emissiveIntensity },
    { mat: headMat, origEmissive: headMat.emissive.clone(), origIntensity: headMat.emissiveIntensity },
  );

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.42), suitMat);
  torso.position.set(0, 0.28, 0);
  torso.castShadow = true;
  driverRoot.add(torso);

  // Arms reaching forward to steering wheel
  const armGeo = new THREE.CylinderGeometry(0.09, 0.08, 0.48, 8);
  armGeo.rotateX(Math.PI / 2.4);
  const leftArm = new THREE.Mesh(armGeo, suitMat);
  leftArm.position.set(-0.32, 0.38, -0.22);
  const rightArm = new THREE.Mesh(armGeo, suitMat);
  rightArm.position.set(0.32, 0.38, -0.22);
  driverRoot.add(leftArm, rightArm);

  // Articulated Head Group
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.78, 0.02);
  driverRoot.add(headGroup);

  if (skinId === 'toaster_bot') {
    // Brushed chrome toaster head + 2 popped toast slices!
    const toaster = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.54, 0.52), headMat);
    toaster.castShadow = true;
    headGroup.add(toaster);

    const toastMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.85 });
    const crumbMat = new THREE.MeshStandardMaterial({ color: '#fde68a', roughness: 0.9 });
    for (const zOff of [-0.1, 0.1]) {
      const crust = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.34, 0.09), toastMat);
      crust.position.set(0, 0.34, zOff);
      const inner = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.28, 0.1), crumbMat);
      inner.position.set(0, 0.34, zOff);
      headGroup.add(crust, inner);
    }
    const eyes = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.05), visorMat);
    eyes.position.set(0, 0.04, -0.27);
    headGroup.add(eyes);
  } else {
    // Stylized rounded/chunky head
    const mainHead = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 14), headMat);
    mainHead.scale.set(1.04, 0.98, 1.02);
    mainHead.castShadow = true;
    headGroup.add(mainHead);

    // Visor or Eyes facing -Z (forward)
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.18), visorMat);
    visor.position.set(0, 0.03, -0.28);
    headGroup.add(visor);

    // Skin-specific secondary features
    if (skinId === 'shiba_doge' || skinId === 'cyber_cat') {
      const earGeo = new THREE.ConeGeometry(0.13, 0.28, 4);
      const earL = new THREE.Mesh(earGeo, headMat);
      earL.position.set(-0.22, 0.36, 0);
      earL.rotation.z = 0.2;
      const earR = new THREE.Mesh(earGeo, headMat);
      earR.position.set(0.22, 0.36, 0);
      earR.rotation.z = -0.2;
      const snout = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.22), suitMat);
      snout.position.set(0, -0.09, -0.34);
      headGroup.add(earL, earR, snout);
    } else if (skinId === 'panda_bam') {
      const earMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.7 });
      const earGeo = new THREE.SphereGeometry(0.13, 10, 10);
      const earL = new THREE.Mesh(earGeo, earMat);
      earL.position.set(-0.26, 0.3, 0.02);
      const earR = new THREE.Mesh(earGeo, earMat);
      earR.position.set(0.26, 0.3, 0.02);
      headGroup.add(earL, earR);
    } else if (skinId === 'zorgon_alien') {
      const stalkGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.26, 6);
      for (const s of [-1, 1]) {
        const stalk = new THREE.Mesh(stalkGeo, headMat);
        stalk.position.set(s * 0.18, 0.4, 0);
        stalk.rotation.z = -s * 0.28;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), suitMat);
        bulb.position.set(s * 0.24, 0.52, 0);
        headGroup.add(stalk, bulb);
      }
    } else if (skinId === 'rexy_dino') {
      const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.34), headMat);
      jaw.position.set(0, -0.05, -0.34);
      headGroup.add(jaw);
      for (let i = 0; i < 3; i++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 5), suitMat);
        spike.position.set(0, 0.34 - i * 0.14, 0.16 + i * 0.12);
        spike.rotation.x = 0.6;
        headGroup.add(spike);
      }
    } else if (skinId === 'unicorn_spark') {
      const hornMat = new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.8, roughness: 0.2 });
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 8), hornMat);
      horn.position.set(0, 0.44, -0.18);
      horn.rotation.x = -0.45;
      const mane = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.38, 0.28), suitMat);
      mane.position.set(0, 0.26, 0.24);
      headGroup.add(horn, mane);
    } else if (skinId === 'inferno_imp' || skinId === 'frost_yeti') {
      const hornMat = new THREE.MeshStandardMaterial({ color: skin.secondaryColor, roughness: 0.3 });
      for (const s of [-1, 1]) {
        const h = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 7), hornMat);
        h.position.set(s * 0.26, 0.36, -0.04);
        h.rotation.z = -s * 0.45;
        headGroup.add(h);
      }
    } else if (skinId === 'ducksworth') {
      const bill = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.28), suitMat);
      bill.position.set(0, -0.08, -0.38);
      headGroup.add(bill);
    } else if (skinId === 'shadow_ninja') {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.37, 0.37, 0.1, 14), suitMat);
      band.position.set(0, 0.12, 0);
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.34), suitMat);
      tail.position.set(0.12, 0.1, 0.42);
      tail.rotation.x = -0.3;
      headGroup.add(band, tail);
    } else if (skinId === 'sir_knight') {
      const plume = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.28, 0.44), suitMat);
      plume.position.set(0, 0.4, 0.06);
      headGroup.add(plume);
    }
  }

  // Optional Hat Topper
  let propellerSpinner: THREE.Object3D | undefined;
  if (hatId !== 'none') {
    const hatGroup = new THREE.Group();
    hatGroup.position.set(0, 0.36, 0);
    headGroup.add(hatGroup);

    if (hatId === 'royal_crown') {
      const gold = new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.9, roughness: 0.18 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.25, 0.16, 8), gold);
      hatGroup.add(base);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 4), gold);
        tip.position.set(Math.cos(a) * 0.22, 0.15, Math.sin(a) * 0.22);
        hatGroup.add(tip);
      }
    } else if (hatId === 'viking_horns') {
      const bronze = new THREE.MeshStandardMaterial({ color: '#b45309', metalness: 0.7, roughness: 0.35 });
      const ivory = new THREE.MeshStandardMaterial({ color: '#fef3c7', roughness: 0.4 });
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.29, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), bronze);
      cap.position.y = -0.04;
      hatGroup.add(cap);
      for (const s of [-1, 1]) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.34, 8), ivory);
        horn.position.set(s * 0.34, 0.12, 0);
        horn.rotation.z = -s * 0.85;
        hatGroup.add(horn);
      }
    } else if (hatId === 'wizard_hat' || hatId === 'party_cone') {
      const col = hatId === 'wizard_hat' ? '#4f46e5' : '#ec4899';
      const mat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 });
      if (hatId === 'wizard_hat') {
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 16), mat);
        hatGroup.add(brim);
      }
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.54, 12), mat);
      cone.position.y = 0.26;
      hatGroup.add(cone);
    } else if (hatId === 'propeller_cap') {
      const capMat = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.5 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
      dome.position.y = -0.05;
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.16, 6),
        new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.8, roughness: 0.2 }),
      );
      pin.position.y = 0.22;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.03, 0.08),
        new THREE.MeshStandardMaterial({ color: '#22d3ee', roughness: 0.3 }),
      );
      blade.position.y = 0.29;
      propellerSpinner = blade;
      hatGroup.add(dome, pin, blade);
    } else if (hatId === 'golden_halo') {
      const halo = new THREE.Mesh(
        new THREE.TorusGeometry(0.28, 0.045, 8, 24),
        new THREE.MeshStandardMaterial({
          color: '#fde047',
          emissive: '#facc15',
          emissiveIntensity: 0.8,
          roughness: 0.2,
        }),
      );
      halo.rotation.x = Math.PI / 2;
      halo.position.y = 0.22;
      hatGroup.add(halo);
    } else if (hatId === 'cowboy_hat') {
      const leather = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.75 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.05, 16), leather);
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.24, 12), leather);
      crown.position.y = 0.12;
      hatGroup.add(brim, crown);
    } else if (hatId === 'samurai_crest') {
      const armor = new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.7, roughness: 0.3 });
      const gold = new THREE.MeshStandardMaterial({ color: '#facc15', metalness: 0.9, roughness: 0.2 });
      const helm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.2, 10), armor);
      const crest = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 12, Math.PI), gold);
      crest.position.set(0, 0.16, -0.22);
      hatGroup.add(helm, crest);
    } else if (hatId === 'top_hat') {
      const silk = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.35 });
      const ribbon = new THREE.MeshStandardMaterial({ color: '#ef4444', roughness: 0.5 });
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 16), silk);
      const tall = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.42, 16), silk);
      tall.position.y = 0.21;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.265, 0.26, 0.07, 16), ribbon);
      band.position.y = 0.06;
      hatGroup.add(brim, tall, band);
    }
  }

  return { driverRoot, headGroup, propellerSpinner };
}

export function buildKartModel(opts: BuildKartOptions): BuiltKartRig {
  const kartDef = KARTS.find((k) => k.id === opts.kartId) || KARTS[0];
  const finishDef = PAINT_FINISHES.find((f) => f.id === opts.paintFinish) || PAINT_FINISHES[0];
  const wheelDef = WHEELS.find((w) => w.id === opts.wheelId) || WHEELS[0];

  const root = new THREE.Group();
  const bodyTiltGroup = new THREE.Group();
  root.add(bodyTiltGroup);

  const hitFlashMaterials: { mat: THREE.MeshStandardMaterial; origEmissive: THREE.Color; origIntensity: number }[] = [];

  // Grounded radial contact shadow (prevents floating appearance)
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 4.4),
    new THREE.MeshBasicMaterial({
      map: opts.contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.58,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.03;
  root.add(shadowPlane);

  // Team Ring indicator (only visible in Team mode)
  const teamRing = new THREE.Mesh(
    new THREE.RingGeometry(1.45, 1.68, 28),
    new THREE.MeshBasicMaterial({
      color: opts.team === 'red' ? '#ef4444' : '#3b82f6',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  teamRing.rotation.x = -Math.PI / 2;
  teamRing.position.y = 0.05;
  teamRing.visible = opts.team === 'red' || opts.team === 'blue';
  root.add(teamRing);

  // Primary Chassis Paint Material (Physical clearcoat on GPU, Standard-compatible cost on software GL)
  const paintColorObj = new THREE.Color(opts.paintColor);
  const bodyMat = opts.isSoftwareGl
    ? new THREE.MeshStandardMaterial({
        color: paintColorObj,
        roughness: finishDef.roughness,
        metalness: finishDef.metalness,
        emissive: paintColorObj.clone(),
        emissiveIntensity: finishDef.emissiveBoost,
      })
    : new THREE.MeshPhysicalMaterial({
        color: paintColorObj,
        roughness: finishDef.roughness,
        metalness: finishDef.metalness,
        clearcoat: finishDef.clearcoat,
        clearcoatRoughness: 0.12,
        emissive: paintColorObj.clone(),
        emissiveIntensity: finishDef.emissiveBoost,
      });

  const trimMat = new THREE.MeshStandardMaterial({
    color: kartDef.trimColor,
    roughness: 0.35,
    metalness: 0.65,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#1e293b',
    roughness: 0.52,
    metalness: 0.72,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    roughness: 0.16,
    metalness: 0.92,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#fef9c3',
    emissive: '#fef08a',
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#ef4444',
    emissiveIntensity: 0.8,
    roughness: 0.25,
  });

  hitFlashMaterials.push(
    { mat: bodyMat, origEmissive: bodyMat.emissive.clone(), origIntensity: bodyMat.emissiveIntensity },
    { mat: trimMat, origEmissive: trimMat.emissive.clone(), origIntensity: trimMat.emissiveIntensity },
  );

  // Primary Silhouette Hull (ExtrudeGeometry tailored by Kart Archetype; -Z is front, +Z is rear)
  const arch = kartDef.archetype;
  let hullProfile: [number, number][];
  let hullWidth = 1.46;
  let rideHeight = arch === 'monster' ? 0.58 : arch === 'hover' ? 0.48 : 0.38;

  if (arch === 'supercar' || arch === 'cyber' || arch === 'jet') {
    hullProfile = [
      [-1.85, 0.12],
      [-0.8, 0.46],
      [0.85, 0.52],
      [1.75, 0.62],
      [1.75, 0.14],
    ];
    hullWidth = 1.56;
  } else if (arch === 'tank' || arch === 'monster' || arch === 'plow' || arch === 'forged') {
    hullProfile = [
      [-1.75, 0.16],
      [-1.4, 0.68],
      [1.55, 0.72],
      [1.72, 0.16],
    ];
    hullWidth = 1.64;
  } else if (arch === 'formula') {
    hullProfile = [
      [-2.05, 0.12],
      [-0.5, 0.38],
      [0.9, 0.48],
      [1.65, 0.42],
      [1.65, 0.12],
    ];
    hullWidth = 1.05;
  } else {
    hullProfile = [
      [-1.7, 0.14],
      [-1.05, 0.48],
      [0.95, 0.52],
      [1.62, 0.6],
      [1.62, 0.14],
    ];
    hullWidth = 1.44;
  }

  // Note: ExtrudeGeometry rotated Y(PI/2) puts profile X along -Z..+Z: let's build hull cleanly
  const hullGeo = makeExtrudedHull(hullProfile, hullWidth, arch === 'voxel' ? 0.01 : 0.08);
  const hullMesh = new THREE.Mesh(hullGeo, bodyMat);
  hullMesh.position.y = rideHeight;
  hullMesh.castShadow = true;
  hullMesh.receiveShadow = true;
  bodyTiltGroup.add(hullMesh);

  // Cockpit Seat Tub & Steering Assembly
  const cockpitTub = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.34, 1.05), darkMetalMat);
  cockpitTub.position.set(0, rideHeight + 0.42, 0.12);
  bodyTiltGroup.add(cockpitTub);

  const steerColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.48, 8), darkMetalMat);
  steerColumn.position.set(0, rideHeight + 0.66, -0.36);
  steerColumn.rotation.x = -0.55;
  const steerWheel = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.032, 8, 16), darkMetalMat);
  steerWheel.position.set(0, rideHeight + 0.78, -0.24);
  steerWheel.rotation.x = -0.55;
  bodyTiltGroup.add(steerColumn, steerWheel);

  // Archetype-Specific Secondary Silhouettes (Spoilers, Rollbars, Superchargers, Fins, Bullbars)
  if (arch === 'supercar' || arch === 'cyber' || arch === 'formula' || arch === 'rally') {
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.22), darkMetalMat);
    strutL.position.set(-0.52, rideHeight + 0.78, 1.48);
    const strutR = strutL.clone();
    strutR.position.x = 0.52;
    const wing = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.09, 0.44), trimMat);
    wing.position.set(0, rideHeight + 0.98, 1.54);
    wing.rotation.x = 0.14;
    wing.castShadow = true;
    bodyTiltGroup.add(strutL, strutR, wing);
  }

  if (arch === 'formula') {
    const frontWing = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.07, 0.36), trimMat);
    frontWing.position.set(0, rideHeight + 0.14, -1.95);
    bodyTiltGroup.add(frontWing);
  }

  if (arch === 'buggy' || arch === 'dune') {
    const rollBar = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.06, 8, 16, Math.PI), chromeMat);
    rollBar.position.set(0, rideHeight + 0.62, 0.58);
    bodyTiltGroup.add(rollBar);
    if (arch === 'dune') {
      const spare = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.22, 14), darkMetalMat);
      spare.rotation.x = Math.PI / 2 - 0.35;
      spare.position.set(0, rideHeight + 0.65, 1.72);
      bodyTiltGroup.add(spare);
    }
  }

  if (arch === 'hotrod') {
    const blower = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.36, 0.56), chromeMat);
    blower.position.set(0, rideHeight + 0.68, -0.95);
    const scoop = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.44, 12), trimMat);
    scoop.rotation.x = Math.PI / 2;
    scoop.position.set(0, rideHeight + 0.9, -0.98);
    bodyTiltGroup.add(blower, scoop);
  }

  if (arch === 'shark') {
    const finShape = new THREE.Shape();
    finShape.moveTo(0, 0);
    finShape.lineTo(0.85, 0);
    finShape.lineTo(0.65, 0.72);
    finShape.closePath();
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02 });
    finGeo.translate(-0.4, 0, -0.05);
    finGeo.rotateY(Math.PI / 2);
    const fin = new THREE.Mesh(finGeo, trimMat);
    fin.position.set(0, rideHeight + 0.56, 1.15);
    bodyTiltGroup.add(fin);
  }

  if (arch === 'tank' || arch === 'plow' || arch === 'monster') {
    const bullBar = new THREE.Mesh(
      new THREE.BoxGeometry(1.86, arch === 'plow' ? 0.46 : 0.24, 0.26),
      arch === 'plow' ? chromeMat : trimMat,
    );
    bullBar.position.set(0, rideHeight + 0.24, -1.82);
    if (arch === 'plow') bullBar.rotation.x = 0.28;
    bodyTiltGroup.add(bullBar);
  }

  if (arch === 'jet') {
    const wingGeo = new THREE.BoxGeometry(2.5, 0.08, 0.85);
    const deltaWing = new THREE.Mesh(wingGeo, trimMat);
    deltaWing.position.set(0, rideHeight + 0.34, 0.45);
    bodyTiltGroup.add(deltaWing);
  }

  if (arch === 'royal') {
    const fenderL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 2.9), trimMat);
    fenderL.position.set(-0.84, rideHeight + 0.36, 0);
    const fenderR = fenderL.clone();
    fenderR.position.x = 0.84;
    bodyTiltGroup.add(fenderL, fenderR);
  }

  // Accent Headlights & Taillights
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.08, 12), headlightMat);
    hl.rotation.x = Math.PI / 2;
    hl.position.set(s * 0.48, rideHeight + 0.34, -1.78);
    bodyTiltGroup.add(hl);
  }
  const tailStrip = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.11, 0.08), taillightMat);
  tailStrip.position.set(0, rideHeight + 0.42, 1.72);
  bodyTiltGroup.add(tailStrip);

  // Exhaust Pipes (2 or 4) — used as anchor points for afterburner & Celebration effects!
  const exhaustTips: THREE.Vector3[] = [];
  const pipeOffsets = kartDef.exhaustCount === 4 ? [-0.58, -0.32, 0.32, 0.58] : [-0.44, 0.44];
  for (const xOff of pipeOffsets) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.52, 10), chromeMat);
    pipe.rotation.x = Math.PI / 2 - 0.36;
    pipe.position.set(xOff, rideHeight + 0.44, 1.78);
    bodyTiltGroup.add(pipe);
    exhaustTips.push(new THREE.Vector3(xOff, rideHeight + 0.54, 1.98));
  }

  // 4 Articulated Wheels (or Hover Thruster Pods for 'hover')
  const frontLeftPivot = new THREE.Group();
  const frontRightPivot = new THREE.Group();
  const wheelSpinMeshes: THREE.Object3D[] = [];

  const wheelRadius = (arch === 'monster' ? 0.56 : 0.42) * wheelDef.scale;
  const wheelWidth = arch === 'monster' ? 0.44 : 0.32;
  const trackHalfW = arch === 'formula' ? 0.96 : 0.92;

  const tireMat = new THREE.MeshStandardMaterial({
    color: wheelDef.tireColor,
    roughness: 0.82,
    metalness: 0.1,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: wheelDef.rimColor,
    roughness: 0.22,
    metalness: 0.85,
    emissive: wheelDef.id === 'neon_slicks' || wheelDef.id === 'plasma_turbines' ? wheelDef.rimColor : '#000000',
    emissiveIntensity: 0.45,
  });

  const makeWheelAssembly = (): THREE.Group => {
    const g = new THREE.Group();
    if (arch === 'hover') {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.2, 16), darkMetalMat);
      const glow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.22, 16),
        new THREE.MeshStandardMaterial({
          color: '#22d3ee',
          emissive: '#06b6d4',
          emissiveIntensity: 0.9,
          roughness: 0.2,
        }),
      );
      g.add(pod, glow);
    } else {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 18), tireMat);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      const rim = new THREE.Mesh(
        new THREE.CylinderGeometry(wheelRadius * 0.62, wheelRadius * 0.62, wheelWidth + 0.03, 12),
        rimMat,
      );
      rim.rotation.z = Math.PI / 2;
      const spoke = new THREE.Mesh(
        new THREE.BoxGeometry(wheelWidth + 0.05, wheelRadius * 1.05, 0.08),
        darkMetalMat,
      );
      g.add(tire, rim, spoke);
    }
    return g;
  };

  const wY = arch === 'hover' ? 0.28 : wheelRadius;
  frontLeftPivot.position.set(-trackHalfW, wY, -1.18);
  frontRightPivot.position.set(trackHalfW, wY, -1.18);
  const flSpin = makeWheelAssembly();
  const frSpin = makeWheelAssembly();
  frontLeftPivot.add(flSpin);
  frontRightPivot.add(frSpin);

  const rlSpin = makeWheelAssembly();
  rlSpin.position.set(-trackHalfW, wY, 1.18);
  const rrSpin = makeWheelAssembly();
  rrSpin.position.set(trackHalfW, wY, 1.18);

  root.add(frontLeftPivot, frontRightPivot, rlSpin, rrSpin);
  if (arch !== 'hover') {
    wheelSpinMeshes.push(flSpin, frSpin, rlSpin, rrSpin);
  }

  // Driver + Hat inside Cockpit
  const { driverRoot, headGroup, propellerSpinner } = buildDriverAndHat(
    opts.skinId,
    opts.hatId,
    hitFlashMaterials,
  );
  driverRoot.position.set(0, rideHeight + 0.42, 0.16);
  bodyTiltGroup.add(driverRoot);

  // Star Invincibility / Spawn Shield Dome
  const shieldDome = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.15, 1),
    new THREE.MeshStandardMaterial({
      color: '#facc15',
      emissive: '#f59e0b',
      emissiveIntensity: 0.7,
      wireframe: true,
      transparent: true,
      opacity: 0.75,
    }),
  );
  shieldDome.position.set(0, 1.1, 0);
  shieldDome.visible = false;
  root.add(shieldDome);

  // Floating Golden Crown (for Crown Rush carrier!)
  const crownMesh = new THREE.Group();
  const crownGoldMat = new THREE.MeshStandardMaterial({
    color: '#facc15',
    emissive: '#eab308',
    emissiveIntensity: 0.45,
    metalness: 0.9,
    roughness: 0.15,
  });
  const cBand = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.46, 0.3, 8), crownGoldMat);
  crownMesh.add(cBand);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 4), crownGoldMat);
    spike.position.set(Math.cos(a) * 0.44, 0.28, Math.sin(a) * 0.44);
    crownMesh.add(spike);
  }
  crownMesh.position.set(0, 2.75, 0);
  crownMesh.visible = false;
  root.add(crownMesh);

  return {
    root,
    bodyTiltGroup,
    driverHeadGroup: headGroup,
    frontLeftPivot,
    frontRightPivot,
    wheelSpinMeshes,
    exhaustTips,
    shieldDome,
    crownMesh,
    teamRing,
    hitFlashMaterials,
    propellerSpinner,
  };
}

export function buildQuestionCrateMesh(questionTex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1.55, 1.55, 1.55),
    new THREE.MeshStandardMaterial({
      map: questionTex,
      roughness: 0.25,
      metalness: 0.15,
      emissive: '#ffffff',
      emissiveMap: questionTex,
      emissiveIntensity: 0.28,
    }),
  );
  box.rotation.set(0.35, 0.45, 0.22);
  box.position.y = 1.45;
  box.castShadow = true;
  group.add(box);

  // Ground glow halo so players can spot crates easily
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.25, 24),
    new THREE.MeshBasicMaterial({
      color: '#38bdf8',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);

  return group;
}
