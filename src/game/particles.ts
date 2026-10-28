import * as THREE from 'three';
import { CELEBRATIONS, CelebrationId } from './catalog';

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  scale: number;
  scaleGrow: number;
  age: number;
  maxAge: number;
  rotSpeed: number;
  shape: 'cube' | 'ring';
}

const MAX_CUBE_PARTICLES = 520;
const MAX_RING_PARTICLES = 90;

const _dummy = new THREE.Object3D();
const _color = new THREE.Color();

export class ParticleAndCelebrationSystem {
  public readonly group = new THREE.Group();
  private cubeInst: THREE.InstancedMesh;
  private ringInst: THREE.InstancedMesh;
  private cubes: ParticleSlot[] = [];
  private rings: ParticleSlot[] = [];
  private cubeCursor = 0;
  private ringCursor = 0;

  constructor() {
    const cubeGeo = new THREE.BoxGeometry(0.32, 0.32, 0.32);
    const cubeMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.cubeInst = new THREE.InstancedMesh(cubeGeo, cubeMat, MAX_CUBE_PARTICLES);
    this.cubeInst.frustumCulled = false;
    this.cubeInst.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_CUBE_PARTICLES * 3),
      3,
    );

    const ringGeo = new THREE.TorusGeometry(0.9, 0.08, 6, 20);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.ringInst = new THREE.InstancedMesh(ringGeo, ringMat, MAX_RING_PARTICLES);
    this.ringInst.frustumCulled = false;
    this.ringInst.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_RING_PARTICLES * 3),
      3,
    );

    _dummy.position.set(0, -999, 0);
    _dummy.scale.setScalar(0.001);
    _dummy.updateMatrix();

    for (let i = 0; i < MAX_CUBE_PARTICLES; i++) {
      this.cubes.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        gravity: 0,
        scale: 1,
        scaleGrow: 0,
        age: 0,
        maxAge: 1,
        rotSpeed: 0,
        shape: 'cube',
      });
      this.cubeInst.setMatrixAt(i, _dummy.matrix);
      this.cubeInst.setColorAt(i, _color.set('#ffffff'));
    }

    for (let i = 0; i < MAX_RING_PARTICLES; i++) {
      this.rings.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        gravity: 0,
        scale: 1,
        scaleGrow: 0,
        age: 0,
        maxAge: 1,
        rotSpeed: 0,
        shape: 'ring',
      });
      this.ringInst.setMatrixAt(i, _dummy.matrix);
      this.ringInst.setColorAt(i, _color.set('#ffffff'));
    }

    this.group.add(this.cubeInst, this.ringInst);
  }

  public spawnCube(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    hex: string,
    maxAge = 0.65,
    scale = 1.0,
    gravity = -14,
    scaleGrow = -0.7,
    rotSpeed = 5,
  ): void {
    const idx = this.cubeCursor;
    this.cubeCursor = (this.cubeCursor + 1) % MAX_CUBE_PARTICLES;
    const p = this.cubes[idx];
    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.gravity = gravity;
    p.scale = scale;
    p.scaleGrow = scaleGrow;
    p.age = 0;
    p.maxAge = maxAge;
    p.rotSpeed = rotSpeed;
    this.cubeInst.setColorAt(idx, _color.set(hex));
    if (this.cubeInst.instanceColor) this.cubeInst.instanceColor.needsUpdate = true;
  }

  public spawnRing(
    x: number,
    y: number,
    z: number,
    vy: number,
    hex: string,
    maxAge = 0.65,
    startScale = 0.5,
    scaleGrow = 4.5,
  ): void {
    const idx = this.ringCursor;
    this.ringCursor = (this.ringCursor + 1) % MAX_RING_PARTICLES;
    const p = this.rings[idx];
    p.active = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = 0;
    p.vy = vy;
    p.vz = 0;
    p.gravity = 0;
    p.scale = startScale;
    p.scaleGrow = scaleGrow;
    p.age = 0;
    p.maxAge = maxAge;
    p.rotSpeed = 2;
    this.ringInst.setColorAt(idx, _color.set(hex));
    if (this.ringInst.instanceColor) this.ringInst.instanceColor.needsUpdate = true;
  }

  public emitExplosion(x: number, y: number, z: number, heavy = false): void {
    const count = heavy ? 34 : 20;
    const palette = ['#f97316', '#ef4444', '#facc15', '#fef08a', '#475569'];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (heavy ? 14 : 9) * (0.4 + Math.random() * 0.9);
      const vy = (heavy ? 13 : 8) * (0.35 + Math.random() * 0.85);
      const col = palette[i % palette.length];
      this.spawnCube(
        x,
        y + 0.5,
        z,
        Math.cos(a) * spd,
        vy,
        Math.sin(a) * spd,
        col,
        heavy ? 0.85 : 0.6,
        heavy ? 1.8 : 1.3,
        -22,
        -1.1,
      );
    }
    this.spawnRing(x, y + 0.35, z, 0.5, heavy ? '#f97316' : '#facc15', 0.48, 0.8, heavy ? 11 : 7);
  }

  public emitCrateShatter(x: number, y: number, z: number): void {
    const rainbow = ['#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#a855f7'];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const spd = 5 + Math.random() * 6;
      this.spawnCube(
        x,
        y + 1.2,
        z,
        Math.cos(a) * spd,
        4 + Math.random() * 7,
        Math.sin(a) * spd,
        rainbow[i % rainbow.length],
        0.65,
        1.1,
        -18,
      );
    }
    this.spawnRing(x, y + 1.0, z, 1.2, '#38bdf8', 0.45, 0.6, 5.2);
  }

  /**
   * Emits a continuous burst tick of a kart's equipped Kill-Streak / Victory Celebration
   * shooting directly out of its exhaust pipe tips & erupting upward!
   */
  public emitCelebrationStep(
    celebId: CelebrationId,
    kartWorldPos: THREE.Vector3,
    kartYaw: number,
    exhaustTips: THREE.Vector3[],
  ): void {
    const def = CELEBRATIONS.find((c) => c.id === celebId) || CELEBRATIONS[0];
    const sinY = Math.sin(kartYaw);
    const cosY = Math.cos(kartYaw);

    // Emit from each exhaust pipe tip
    for (let i = 0; i < exhaustTips.length; i++) {
      const tip = exhaustTips[i];
      const wx = kartWorldPos.x + tip.x * cosY + tip.z * sinY;
      const wy = kartWorldPos.y + tip.y;
      const wz = kartWorldPos.z - tip.x * sinY + tip.z * cosY;

      // Backward + high upward fountain direction from exhausts
      const backX = sinY * (3.5 + Math.random() * 2.5) + (Math.random() - 0.5) * 4.5;
      const backZ = cosY * (3.5 + Math.random() * 2.5) + (Math.random() - 0.5) * 4.5;

      if (celebId === 'quad_fireworks' || celebId === 'confetti_pop') {
        const colors =
          celebId === 'confetti_pop'
            ? ['#ec4899', '#38bdf8', '#facc15', '#4ade80', '#a855f7']
            : ['#f43f5e', '#facc15', '#22d3ee', '#fb923c'];
        const col = colors[Math.floor(Math.random() * colors.length)];
        this.spawnCube(wx, wy, wz, backX, 11 + Math.random() * 7, backZ, col, 0.85, 1.15, -16, -0.5, 9);
      } else if (celebId === 'gold_geyser') {
        const col = Math.random() > 0.32 ? '#facc15' : '#10b981';
        this.spawnCube(wx, wy, wz, backX * 0.8, 13 + Math.random() * 6, backZ * 0.8, col, 0.9, 1.35, -22, -0.3, 12);
      } else if (celebId === 'matrix_pillars') {
        const rx = kartWorldPos.x + (Math.random() - 0.5) * 3.4;
        const rz = kartWorldPos.z + (Math.random() - 0.5) * 3.4;
        this.spawnCube(rx, kartWorldPos.y + 0.4, rz, 0, 12 + Math.random() * 5, 0, i % 2 === 0 ? '#22c55e' : '#86efac', 0.65, 1.25, 0, -0.8, 3);
      } else if (celebId === 'dragon_flames') {
        const col = Math.random() > 0.4 ? '#f97316' : '#ef4444';
        this.spawnCube(wx, wy, wz, backX * 1.2, 8 + Math.random() * 5, backZ * 1.2, col, 0.55, 1.6, 4, -1.4, 6);
      } else if (celebId === 'tesla_overload') {
        const a = Math.random() * Math.PI * 2;
        this.spawnCube(
          kartWorldPos.x + Math.cos(a) * 1.6,
          kartWorldPos.y + 1.0 + Math.random() * 1.6,
          kartWorldPos.z + Math.sin(a) * 1.6,
          Math.cos(a) * 6,
          6 + Math.random() * 5,
          Math.sin(a) * 6,
          Math.random() > 0.5 ? '#22d3ee' : '#818cf8',
          0.45,
          1.0,
          -4,
        );
      } else if (celebId === 'solar_nova') {
        const a = Math.random() * Math.PI * 2;
        this.spawnCube(
          wx,
          wy + 0.5,
          wz,
          Math.cos(a) * 7,
          9 + Math.random() * 5,
          Math.sin(a) * 7,
          Math.random() > 0.4 ? '#f59e0b' : '#fef08a',
          0.7,
          1.35,
          -10,
        );
      } else {
        // frost_shatter
        this.spawnCube(wx, wy, wz, backX, 10 + Math.random() * 6, backZ, Math.random() > 0.4 ? '#38bdf8' : '#f0f9ff', 0.8, 1.25, -14, -0.6, 8);
      }
    }

    // Rising celebratory shockwave halo ring around the kart
    if (Math.random() < 0.38) {
      this.spawnRing(
        kartWorldPos.x,
        kartWorldPos.y + 0.6,
        kartWorldPos.z,
        5.5,
        def.primaryColor,
        0.65,
        0.9,
        3.6,
      );
    }
  }

  public clearAll(): void {
    _dummy.position.set(0, -999, 0);
    _dummy.scale.setScalar(0.001);
    _dummy.updateMatrix();
    for (let i = 0; i < MAX_CUBE_PARTICLES; i++) {
      this.cubes[i].active = false;
      this.cubeInst.setMatrixAt(i, _dummy.matrix);
    }
    for (let i = 0; i < MAX_RING_PARTICLES; i++) {
      this.rings[i].active = false;
      this.ringInst.setMatrixAt(i, _dummy.matrix);
    }
    this.cubeInst.instanceMatrix.needsUpdate = true;
    this.ringInst.instanceMatrix.needsUpdate = true;
  }

  public update(dt: number): void {
    let cubeDirty = false;
    for (let i = 0; i < MAX_CUBE_PARTICLES; i++) {
      const p = this.cubes[i];
      if (!p.active) continue;
      cubeDirty = true;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        _dummy.position.set(0, -999, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.cubeInst.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.08 && p.vy < 0) {
        p.y = 0.08;
        p.vy *= -0.38;
      }
      const lifeRatio = 1 - p.age / p.maxAge;
      const sc = Math.max(0.05, (p.scale + p.scaleGrow * p.age) * lifeRatio);
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(p.age * p.rotSpeed, p.age * p.rotSpeed * 0.7, 0);
      _dummy.scale.setScalar(sc);
      _dummy.updateMatrix();
      this.cubeInst.setMatrixAt(i, _dummy.matrix);
    }
    if (cubeDirty) this.cubeInst.instanceMatrix.needsUpdate = true;

    let ringDirty = false;
    for (let i = 0; i < MAX_RING_PARTICLES; i++) {
      const p = this.rings[i];
      if (!p.active) continue;
      ringDirty = true;
      p.age += dt;
      if (p.age >= p.maxAge) {
        p.active = false;
        _dummy.position.set(0, -999, 0);
        _dummy.scale.setScalar(0.001);
        _dummy.updateMatrix();
        this.ringInst.setMatrixAt(i, _dummy.matrix);
        continue;
      }
      p.y += p.vy * dt;
      const sc = Math.max(0.1, p.scale + p.scaleGrow * p.age);
      _dummy.position.set(p.x, p.y, p.z);
      _dummy.rotation.set(0, p.age * p.rotSpeed, 0);
      _dummy.scale.set(sc, 1, sc);
      _dummy.updateMatrix();
      this.ringInst.setMatrixAt(i, _dummy.matrix);
    }
    if (ringDirty) this.ringInst.instanceMatrix.needsUpdate = true;
  }

  public dispose(): void {
    this.cubeInst.geometry.dispose();
    (this.cubeInst.material as THREE.Material).dispose();
    this.ringInst.geometry.dispose();
    (this.ringInst.material as THREE.Material).dispose();
  }
}
