import * as THREE from 'three';
import { MapId } from './catalog';

export class ProceduralTextureBank {
  private textures: THREE.Texture[] = [];
  private maxAniso: number;

  public readonly questionBoxTex: THREE.CanvasTexture;
  public readonly contactShadowTex: THREE.CanvasTexture;
  public readonly boostPadTex: THREE.CanvasTexture;
  public readonly checkerTex: THREE.CanvasTexture;
  private groundCache = new Map<MapId, THREE.CanvasTexture>();

  constructor(renderer: THREE.WebGLRenderer) {
    this.maxAniso = renderer.capabilities.getMaxAnisotropy() || 1;
    this.questionBoxTex = this.makeQuestionBoxTexture();
    this.contactShadowTex = this.makeContactShadowTexture();
    this.boostPadTex = this.makeBoostPadTexture();
    this.checkerTex = this.makeCheckerTexture();
  }

  private register<T extends THREE.Texture>(tex: T, isColor = true): T {
    if (isColor) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.anisotropy = this.maxAniso;
    tex.needsUpdate = true;
    this.textures.push(tex);
    return tex;
  }

  private makeQuestionBoxTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, '#f43f5e');
    grad.addColorStop(0.25, '#f59e0b');
    grad.addColorStop(0.5, '#10b981');
    grad.addColorStop(0.75, '#06b6d4');
    grad.addColorStop(1, '#a855f7');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // Beveled inner frame
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 14;
    ctx.strokeRect(14, 14, 228, 228);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(30, 30, 196, 196);

    // Corner rivets
    ctx.fillStyle = '#ffffff';
    const rivets = [
      [34, 34],
      [222, 34],
      [34, 222],
      [222, 222],
    ];
    for (const [rx, ry] of rivets) {
      ctx.beginPath();
      ctx.arc(rx, ry, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bold '?' symbol
    ctx.font = '900 156px "Outfit", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(9, 13, 22, 0.55)';
    ctx.fillText('?', 134, 142);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('?', 128, 136);

    return this.register(new THREE.CanvasTexture(c), true);
  }

  private makeContactShadowTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    g.addColorStop(0, 'rgba(0, 0, 0, 0.68)');
    g.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return this.register(new THREE.CanvasTexture(c), true);
  }

  private makeBoostPadTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 256);

    // Glowing cyan/amber chevrons
    for (let i = 0; i < 3; i++) {
      const y = 48 + i * 74;
      ctx.beginPath();
      ctx.moveTo(28, y + 40);
      ctx.lineTo(128, y);
      ctx.lineTo(228, y + 40);
      ctx.lineTo(228, y + 18);
      ctx.lineTo(128, y - 22);
      ctx.lineTo(28, y + 18);
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? '#22d3ee' : '#facc15';
      ctx.fill();
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 246, 246);

    return this.register(new THREE.CanvasTexture(c), true);
  }

  private makeCheckerTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    const sq = 32;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 8; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#f8fafc' : '#0f172a';
        ctx.fillRect(x * sq, y * sq, sq, sq);
      }
    }
    const tex = this.register(new THREE.CanvasTexture(c), true);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  public getArenaGroundTexture(mapId: MapId): THREE.CanvasTexture {
    const cached = this.groundCache.get(mapId);
    if (cached) return cached;

    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d')!;

    if (mapId === 'smash_island') {
      ctx.fillStyle = '#e6c280';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 2400; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,248,220,0.22)' : 'rgba(180,130,60,0.18)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 4, 4);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, 496, 496);
    } else if (mapId === 'magma_foundry') {
      ctx.fillStyle = '#241f21';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 1600; i++) {
        ctx.fillStyle = i % 5 === 0 ? 'rgba(249,115,22,0.18)' : 'rgba(15,15,18,0.45)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 6, 6);
      }
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.22)';
      ctx.lineWidth = 3;
      for (let g = 0; g < 512; g += 128) {
        ctx.strokeRect(g, 0, 128, 512);
        ctx.strokeRect(0, g, 512, 128);
      }
    } else if (mapId === 'skytop_park') {
      ctx.fillStyle = '#141830';
      ctx.fillRect(0, 0, 512, 512);
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.35)';
      ctx.lineWidth = 3;
      for (let g = 0; g <= 512; g += 64) {
        ctx.beginPath();
        ctx.moveTo(g, 0);
        ctx.lineTo(g, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, g);
        ctx.lineTo(512, g);
        ctx.stroke();
      }
    } else if (mapId === 'frostbite_bay') {
      ctx.fillStyle = '#d8f0fa';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 1200; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(56,189,248,0.15)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 8, 8);
      }
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(40, 20);
      ctx.lineTo(240, 290);
      ctx.lineTo(480, 460);
      ctx.stroke();
    } else if (mapId === 'canyon_bowl') {
      ctx.fillStyle = '#c26a3d';
      ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 2200; i++) {
        ctx.fillStyle = i % 2 === 0 ? 'rgba(154,52,18,0.22)' : 'rgba(254,215,170,0.16)';
        ctx.fillRect(Math.random() * 512, Math.random() * 512, 5, 5);
      }
    } else {
      // carnival_pier wooden boardwalk planks
      ctx.fillStyle = '#9a5b32';
      ctx.fillRect(0, 0, 512, 512);
      for (let y = 0; y < 512; y += 32) {
        ctx.fillStyle = (y / 32) % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.09)';
        ctx.fillRect(0, y, 512, 30);
        ctx.fillStyle = 'rgba(40,20,8,0.45)';
        ctx.fillRect(0, y + 30, 512, 2);
      }
    }

    const tex = this.register(new THREE.CanvasTexture(c), true);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(16, 16);
    this.groundCache.set(mapId, tex);
    return tex;
  }

  public dispose(): void {
    for (const t of this.textures) {
      t.dispose();
    }
    this.textures = [];
    this.groundCache.clear();
  }
}
