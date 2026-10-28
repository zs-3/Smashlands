import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BuiltArena, buildArena } from './arenas';
import { sound } from './audio';
import {
  BOT_NAMES,
  BotDifficulty,
  CELEBRATIONS,
  CelebrationId,
  GameModeId,
  HATS,
  HatId,
  KARTS,
  KartId,
  MAPS,
  MapId,
  PAINT_SWATCHES,
  PaintFinishId,
  PlayerLoadout,
  SKINS,
  SkinId,
  WEAPONS,
  WHEELS,
  WeaponId,
  WheelId,
} from './catalog';
import { BuiltKartRig, buildKartModel, buildQuestionCrateMesh } from './models';
import { ParticleAndCelebrationSystem } from './particles';
import { ProceduralTextureBank } from './textures';

export type EngineStage = 'lobby' | 'playing' | 'paused' | 'podium';
export type CameraPreset = 'standard' | 'close' | 'wide';

export interface KillFeedItem {
  id: number;
  killerName: string;
  victimName: string;
  weaponLabel: string;
  killerIsPlayer: boolean;
  victimIsPlayer: boolean;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  isPlayer: boolean;
  team: 'none' | 'red' | 'blue';
  smashes: number;
  deaths: number;
  score: number;
  hasCrown: boolean;
  kartId: KartId;
  skinId: SkinId;
}

export interface WorldLabelProjection {
  id: string;
  name: string;
  x: number;
  y: number;
  hpRatio: number;
  team: 'none' | 'red' | 'blue';
  hasCrown: boolean;
  visible: boolean;
}

export interface HudSnapshot {
  stage: EngineStage;
  timeRemaining: number;
  playerHp: number;
  playerMaxHp: number;
  speedKmh: number;
  driftCharge: number; // 0..1
  respawnTimer: number;
  weaponId: WeaponId | null;
  weaponAmmoOrTime: number;
  weaponMaxAmmoOrTime: number;
  rouletteSpinning: boolean;
  roulettePreviewId: WeaponId | null;
  smashes: number;
  streakCount: number;
  streakBanner: string | null;
  redTeamScore: number;
  blueTeamScore: number;
  crownHolderName: string | null;
  leaderboard: LeaderboardEntry[];
  killFeed: KillFeedItem[];
  worldLabels: WorldLabelProjection[];
}

export interface MatchConfig {
  mapId: MapId;
  mode: GameModeId;
  lobbySize: 8 | 12 | 16;
  durationSec: number;
  botDifficulty: BotDifficulty;
  loadout: PlayerLoadout;
}

interface KartActor {
  id: string;
  name: string;
  isPlayer: boolean;
  team: 'none' | 'red' | 'blue';
  kartId: KartId;
  paintColor: string;
  paintFinish: PaintFinishId;
  wheelId: WheelId;
  skinId: SkinId;
  hatId: HatId;
  celebrationId: CelebrationId;
  rig: BuiltKartRig;

  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  speed: number;
  steerAngle: number;
  grounded: boolean;
  drifting: boolean;
  driftTimer: number;

  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  spawnShieldTimer: number;
  starShieldTimer: number;
  turboFlameTimer: number;
  flameDropAccum: number;
  boostPadTimer: number;
  hitFlashTimer: number;

  weaponId: WeaponId | null;
  weaponValue: number;
  rouletteTimer: number;
  minigunCooldown: number;

  smashes: number;
  deaths: number;
  score: number;
  streak: number;
  hasCrown: boolean;
  crownScoreAccum: number;
  celebrationTimer: number;
  celebrationTickAccum: number;
  lastDamagedById: string | null;

  // Bot AI fields
  aiThinkTimer: number;
  aiTargetPos: THREE.Vector3;
  aiTargetEnemyId: string | null;
  aiStuckTimer: number;
  aiReverseTimer: number;
}

interface QuestionCrateState {
  pos: THREE.Vector3;
  mesh: THREE.Group;
  active: boolean;
  respawnTimer: number;
  phase: number;
}

interface ActiveProjectile {
  type: 'rocket' | 'bullet' | 'mine' | 'grenuke' | 'cannon' | 'flame_pool';
  ownerId: string;
  ownerTeam: 'none' | 'red' | 'blue';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  age: number;
  maxAge: number;
  targetActorId: string | null;
  bouncesLeft: number;
  mesh: THREE.Object3D;
  targetRing?: THREE.Mesh;
}

const WEAPON_KEYS: WeaponId[] = [
  'homing_rocket',
  'twin_minigun',
  'landmine',
  'lob_grenuke',
  'triple_cannon',
  'star_shield',
  'turbo_flame',
];

// Reusable module-scope math temporaries (Zero GC inside render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _camIdealPos = new THREE.Vector3();
const _camIdealLook = new THREE.Vector3();
const _projVec = new THREE.Vector3();

export class TurboSmashEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private isSoftwareGl: boolean;
  private texBank: ProceduralTextureBank;
  private particles: ParticleAndCelebrationSystem;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  private arena: BuiltArena | null = null;
  private lobbyStageGroup: THREE.Group | null = null;
  private lobbyKartRig: BuiltKartRig | null = null;
  private lobbyCelebTimer = 0;
  private lobbyCelebAccum = 0;
  private lobbyTurntableYaw = 0.45;
  private isDraggingTurntable = false;
  private lastPointerX = 0;

  private podiumGroup: THREE.Group | null = null;
  private podiumRigs: { rig: BuiltKartRig; celebId: CelebrationId; pos: THREE.Vector3; yaw: number }[] = [];
  private podiumCelebAccum = 0;

  private stage: EngineStage = 'lobby';
  private cameraPreset: CameraPreset = 'standard';
  private currentConfig: MatchConfig;
  private actors: KartActor[] = [];
  private crates: QuestionCrateState[] = [];
  private projectiles: ActiveProjectile[] = [];
  private projectileGroup = new THREE.Group();

  private timeRemaining = 180;
  private redTeamScore = 0;
  private blueTeamScore = 0;
  private killFeed: KillFeedItem[] = [];
  private nextFeedId = 1;
  private streakBanner: string | null = null;
  private streakBannerTimer = 0;

  private hitstopTimer = 0;
  private shakeIntensity = 0;
  private camCurrentPos = new THREE.Vector3(0, 10, 20);
  private camCurrentLook = new THREE.Vector3(0, 2, 0);

  // Input state: continuous held vs edge-triggered justPressed
  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>();
  private virtualInput = { forward: 0, steer: 0, drift: false, firePressed: false };

  private frameId = 0;
  private lastTimestamp = 0;
  private hudEmitAccum = 0;
  private onHudUpdate: (snap: HudSnapshot) => void;
  private onMatchFinish: (results: {
    leaderboard: LeaderboardEntry[];
    playerRank: number;
    coinsEarned: number;
    xpEarned: number;
    redTeamScore: number;
    blueTeamScore: number;
  }) => void;

  constructor(
    container: HTMLElement,
    initialConfig: MatchConfig,
    onHudUpdate: (snap: HudSnapshot) => void,
    onMatchFinish: (results: {
      leaderboard: LeaderboardEntry[];
      playerRank: number;
      coinsEarned: number;
      xpEarned: number;
      redTeamScore: number;
      blueTeamScore: number;
    }) => void,
  ) {
    this.container = container;
    this.currentConfig = initialConfig;
    this.onHudUpdate = onHudUpdate;
    this.onMatchFinish = onMatchFinish;

    // 1. Mandatory Software-WebGL Detection from GPU Renderer String
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      62,
      (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight),
      0.2,
      650,
    );

    // 2. Mandatory Studio Environment Reflection (RoomEnvironment PMREM)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Balanced 3-Point Outdoor/Arena Studio Lighting Rig
    this.hemiLight = new THREE.HemisphereLight('#7dd3fc', '#d97706', 0.85);
    this.hemiLight.position.set(0, 60, 0);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight('#fff7ed', 1.85);
    this.sunLight.position.set(45, 78, 38);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    const d = 72;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 210;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight('#38bdf8', 0.55);
    this.rimLight.position.set(-40, 32, -45);
    this.scene.add(this.rimLight);

    this.texBank = new ProceduralTextureBank(this.renderer);
    this.particles = new ParticleAndCelebrationSystem();
    this.scene.add(this.particles.group);
    this.scene.add(this.projectileGroup);

    this.bindEvents();
    this.loadArenaEnvironment(initialConfig.mapId);
    this.setupLobbyShowcase(initialConfig.loadout);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.lastTimestamp = performance.now();
    this.scheduleNextFrame();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
  }

  private handleResize = (): void => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Ignore typing inside player name input
    if (
      document.activeElement &&
      (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
    ) {
      return;
    }
    const code = e.code;
    if (!this.heldKeys.has(code)) {
      this.justPressedKeys.add(code);
    }
    this.heldKeys.add(code);
    sound.unlock();
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.heldKeys.delete(e.code);
  };

  private handleWindowBlur = (): void => {
    this.heldKeys.clear();
    this.justPressedKeys.clear();
    this.virtualInput = { forward: 0, steer: 0, drift: false, firePressed: false };
  };

  private handlePointerDown = (e: PointerEvent): void => {
    sound.unlock();
    if (this.stage === 'lobby') {
      this.isDraggingTurntable = true;
      this.lastPointerX = e.clientX;
    } else if (this.stage === 'playing' && e.button === 0) {
      this.justPressedKeys.add('Space');
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.isDraggingTurntable && this.stage === 'lobby') {
      const dx = e.clientX - this.lastPointerX;
      this.lastPointerX = e.clientX;
      this.lobbyTurntableYaw += dx * 0.012;
    }
  };

  private handlePointerUp = (): void => {
    this.isDraggingTurntable = false;
  };

  public setVirtualInput(next: Partial<typeof this.virtualInput>): void {
    Object.assign(this.virtualInput, next);
    if (next.firePressed) {
      this.justPressedKeys.add('Space');
      this.virtualInput.firePressed = false;
    }
  }

  public setCameraPreset(preset: CameraPreset): void {
    this.cameraPreset = preset;
  }

  public getCameraPreset(): CameraPreset {
    return this.cameraPreset;
  }

  private loadArenaEnvironment(mapId: MapId): void {
    if (this.arena && this.arena.mapId === mapId) return;
    if (this.arena) {
      this.scene.remove(this.arena.group);
    }
    const def = MAPS.find((m) => m.id === mapId) || MAPS[0];
    this.scene.background = new THREE.Color(def.skyColor);
    this.scene.fog = new THREE.FogExp2(def.fogColor, def.fogDensity);
    this.sunLight.color.set(def.sunColor);
    this.hemiLight.color.set(def.hemiSky);
    this.hemiLight.groundColor.set(def.hemiGround);

    this.arena = buildArena(mapId, this.texBank);
    this.scene.add(this.arena.group);
  }

  public updateLobbyPreview(mapId: MapId, loadout: PlayerLoadout): void {
    this.currentConfig.mapId = mapId;
    this.currentConfig.loadout = loadout;
    this.loadArenaEnvironment(mapId);
    if (this.stage === 'lobby') {
      this.setupLobbyShowcase(loadout);
    }
  }

  public triggerLobbyCelebrationPreview(): void {
    this.lobbyCelebTimer = 2.6;
    sound.playCelebrationPop();
  }

  private clearLobbyAndPodium(): void {
    if (this.lobbyStageGroup) {
      this.scene.remove(this.lobbyStageGroup);
      this.lobbyStageGroup = null;
      this.lobbyKartRig = null;
    }
    if (this.podiumGroup) {
      this.scene.remove(this.podiumGroup);
      this.podiumGroup = null;
      this.podiumRigs = [];
    }
  }

  private clearMatchObjects(): void {
    for (const a of this.actors) {
      this.scene.remove(a.rig.root);
    }
    this.actors = [];
    for (const c of this.crates) {
      this.scene.remove(c.mesh);
    }
    this.crates = [];
    for (const p of this.projectiles) {
      this.projectileGroup.remove(p.mesh);
      if (p.targetRing) this.projectileGroup.remove(p.targetRing);
    }
    this.projectiles = [];
    this.particles.clearAll();
  }

  public enterLobby(loadout: PlayerLoadout, mapId: MapId): void {
    sound.stopEngineHum();
    this.clearMatchObjects();
    this.clearLobbyAndPodium();
    this.stage = 'lobby';
    this.loadArenaEnvironment(mapId);
    this.setupLobbyShowcase(loadout);
    this.emitHudSnapshot();
  }

  private setupLobbyShowcase(loadout: PlayerLoadout): void {
    if (this.lobbyStageGroup) {
      this.scene.remove(this.lobbyStageGroup);
    }
    const g = new THREE.Group();
    const baseY = this.arena ? this.arena.sampleGround(0, 26).height : 0;
    g.position.set(0, baseY, 26);

    // Sleek Garage Turntable Disc inside the live 3D Arena
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.8, 0.36, 36),
      new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.3, metalness: 0.75 }),
    );
    disc.position.y = 0.18;
    disc.receiveShadow = true;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(3.55, 0.08, 8, 36),
      new THREE.MeshStandardMaterial({
        color: loadout.paintColor,
        emissive: loadout.paintColor,
        emissiveIntensity: 0.65,
        roughness: 0.2,
      }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.36;
    g.add(disc, rim);

    const rig = buildKartModel({
      kartId: loadout.kartId,
      paintColor: loadout.paintColor,
      paintFinish: loadout.paintFinish,
      wheelId: loadout.wheelId,
      skinId: loadout.skinId,
      hatId: loadout.hatId,
      contactShadowTex: this.texBank.contactShadowTex,
      isSoftwareGl: this.isSoftwareGl,
    });
    rig.root.position.set(0, 0.36, 0);
    rig.root.rotation.y = this.lobbyTurntableYaw;
    g.add(rig.root);

    this.scene.add(g);
    this.lobbyStageGroup = g;
    this.lobbyKartRig = rig;
  }

  public startMatch(config: MatchConfig): void {
    this.currentConfig = config;
    this.clearLobbyAndPodium();
    this.clearMatchObjects();
    this.loadArenaEnvironment(config.mapId);

    this.stage = 'playing';
    this.timeRemaining = config.durationSec;
    this.redTeamScore = 0;
    this.blueTeamScore = 0;
    this.killFeed = [];
    this.streakBanner = null;
    this.streakBannerTimer = 0;
    this.hitstopTimer = 0;
    this.shakeIntensity = 0;

    const arena = this.arena!;
    // Spawn '?' Mystery Weapon Boxes
    for (let i = 0; i < arena.boxSpawns.length; i++) {
      const sp = arena.boxSpawns[i];
      const mesh = buildQuestionCrateMesh(this.texBank.questionBoxTex);
      mesh.position.copy(sp);
      this.scene.add(mesh);
      this.crates.push({
        pos: sp.clone(),
        mesh,
        active: true,
        respawnTimer: 0,
        phase: i * 0.7,
      });
    }

    // Spawn Player + Smart Combat Bots (8, 12, or 16 karts)
    const count = config.lobbySize;
    for (let i = 0; i < count; i++) {
      const isPlayer = i === 0;
      const team: 'none' | 'red' | 'blue' =
        config.mode === 'teams' ? (i % 2 === 0 ? 'red' : 'blue') : 'none';

      const kartId: KartId = isPlayer
        ? config.loadout.kartId
        : KARTS[(i * 3 + 1) % KARTS.length].id;
      const skinId: SkinId = isPlayer
        ? config.loadout.skinId
        : SKINS[(i * 5 + 2) % SKINS.length].id;
      const hatId: HatId = isPlayer
        ? config.loadout.hatId
        : HATS[(i * 2 + 1) % HATS.length].id;
      const celebrationId: CelebrationId = isPlayer
        ? config.loadout.celebrationId
        : CELEBRATIONS[i % CELEBRATIONS.length].id;
      const wheelId: WheelId = isPlayer
        ? config.loadout.wheelId
        : WHEELS[i % 4].id;
      const paintFinish: PaintFinishId = isPlayer ? config.loadout.paintFinish : 'gloss';
      const paintColor =
        config.mode === 'teams'
          ? team === 'red'
            ? isPlayer
              ? '#ef4444'
              : '#dc2626'
            : isPlayer
              ? '#3b82f6'
              : '#2563eb'
          : isPlayer
            ? config.loadout.paintColor
            : PAINT_SWATCHES[(i * 3) % PAINT_SWATCHES.length].hex;

      const spawn = arena.kartSpawns[i % arena.kartSpawns.length];
      const groundH = arena.sampleGround(spawn.x, spawn.z).height;

      const rig = buildKartModel({
        kartId,
        paintColor,
        paintFinish,
        wheelId,
        skinId,
        hatId,
        contactShadowTex: this.texBank.contactShadowTex,
        isSoftwareGl: this.isSoftwareGl,
        team,
      });
      rig.root.position.set(spawn.x, groundH, spawn.z);
      rig.root.rotation.y = spawn.yaw;
      this.scene.add(rig.root);

      const kartDef = KARTS.find((k) => k.id === kartId) || KARTS[0];
      const maxHp = 94 + kartDef.armorStat * 2; // Subtle armor perk (104..114 HP)

      const hasInitialCrown = config.mode === 'crown' && i === 1;
      rig.crownMesh.visible = hasInitialCrown;

      this.actors.push({
        id: isPlayer ? 'player' : `bot_${i}`,
        name: isPlayer ? config.loadout.playerName.trim() || 'You' : BOT_NAMES[(i - 1) % BOT_NAMES.length],
        isPlayer,
        team,
        kartId,
        paintColor,
        paintFinish,
        wheelId,
        skinId,
        hatId,
        celebrationId,
        rig,
        pos: new THREE.Vector3(spawn.x, groundH, spawn.z),
        vel: new THREE.Vector3(),
        yaw: spawn.yaw,
        speed: 0,
        steerAngle: 0,
        grounded: true,
        drifting: false,
        driftTimer: 0,
        hp: maxHp,
        maxHp,
        alive: true,
        respawnTimer: 0,
        spawnShieldTimer: 2.0,
        starShieldTimer: 0,
        turboFlameTimer: 0,
        flameDropAccum: 0,
        boostPadTimer: 0,
        hitFlashTimer: 0,
        weaponId: null,
        weaponValue: 0,
        rouletteTimer: 0,
        minigunCooldown: 0,
        smashes: 0,
        deaths: 0,
        score: 0,
        streak: 0,
        hasCrown: hasInitialCrown,
        crownScoreAccum: 0,
        celebrationTimer: 0,
        celebrationTickAccum: 0,
        lastDamagedById: null,
        aiThinkTimer: Math.random() * 0.3,
        aiTargetPos: new THREE.Vector3(0, 0, 0),
        aiTargetEnemyId: null,
        aiStuckTimer: 0,
        aiReverseTimer: 0,
      });
    }

    // Snap chase camera behind player initially
    const p = this.actors[0];
    this.camCurrentPos.set(
      p.pos.x + Math.sin(p.yaw) * 11,
      p.pos.y + 5.8,
      p.pos.z + Math.cos(p.yaw) * 11,
    );
    this.camCurrentLook.set(p.pos.x, p.pos.y + 1.4, p.pos.z);

    sound.startEngineHum();
    this.emitHudSnapshot();
  }

  public setPaused(paused: boolean): void {
    if (this.stage === 'playing' && paused) {
      this.stage = 'paused';
      sound.updateEngineHum(0, false, true);
      this.emitHudSnapshot();
    } else if (this.stage === 'paused' && !paused) {
      this.stage = 'playing';
      this.emitHudSnapshot();
    }
  }

  public triggerPlayerManualCelebration(): void {
    const p = this.actors[0];
    if (p && p.alive && this.stage === 'playing') {
      p.celebrationTimer = Math.max(p.celebrationTimer, 2.2);
      sound.playCelebrationPop();
    } else if (this.stage === 'lobby') {
      this.triggerLobbyCelebrationPreview();
    }
  }

  private enterPodiumStage(): void {
    sound.stopEngineHum();
    sound.playSmashFanfare();
    this.stage = 'podium';

    const sorted = this.getSortedLeaderboard();
    const playerIdx = sorted.findIndex((e) => e.isPlayer);
    const playerRank = playerIdx >= 0 ? playerIdx + 1 : sorted.length;
    const playerEntry = sorted.find((e) => e.isPlayer);
    const playerSmashes = playerEntry ? playerEntry.smashes : 0;

    const rankBonus = playerRank === 1 ? 180 : playerRank === 2 ? 120 : playerRank === 3 ? 85 : 45;
    const coinsEarned = rankBonus + playerSmashes * 25;
    const xpEarned = 100 + playerSmashes * 35 + (playerRank <= 3 ? 90 : 30);

    // Grab top 3 actor blueprints before clearing match objects
    const top3Actors = sorted.slice(0, 3).map((entry) => this.actors.find((a) => a.id === entry.id)!);

    this.clearMatchObjects();
    this.clearLobbyAndPodium();

    // Build Championship 3D Podium in center of Arena
    const pg = new THREE.Group();
    const centerGround = this.arena ? this.arena.sampleGround(0, 22).height : 0;
    pg.position.set(0, centerGround, 22);

    const podiumSpecs = [
      { rank: 1, x: 0, h: 2.3, color: '#eab308', yaw: 0 },
      { rank: 2, x: -4.8, h: 1.65, color: '#cbd5e1', yaw: 0.22 },
      { rank: 3, x: 4.8, h: 1.2, color: '#d97706', yaw: -0.22 },
    ];

    this.podiumRigs = [];
    podiumSpecs.forEach((spec, idx) => {
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(2.15, 2.35, spec.h, 24),
        new THREE.MeshStandardMaterial({ color: spec.color, metalness: 0.65, roughness: 0.28 }),
      );
      pedestal.position.set(spec.x, spec.h / 2, 0);
      pedestal.castShadow = true;
      pedestal.receiveShadow = true;
      pg.add(pedestal);

      const actor = top3Actors[idx];
      if (actor) {
        const rig = buildKartModel({
          kartId: actor.kartId,
          paintColor: actor.paintColor,
          paintFinish: actor.paintFinish,
          wheelId: actor.wheelId,
          skinId: actor.skinId,
          hatId: actor.hatId,
          contactShadowTex: this.texBank.contactShadowTex,
          isSoftwareGl: this.isSoftwareGl,
          team: actor.team,
        });
        rig.root.position.set(spec.x, spec.h, 0);
        rig.root.rotation.y = Math.PI + spec.yaw; // Face toward +Z camera!
        if (idx === 0) rig.crownMesh.visible = true;
        pg.add(rig.root);

        this.podiumRigs.push({
          rig,
          celebId: actor.celebrationId,
          pos: new THREE.Vector3(spec.x, centerGround + spec.h, 22),
          yaw: Math.PI + spec.yaw,
        });
      }
    });

    this.scene.add(pg);
    this.podiumGroup = pg;

    this.onMatchFinish({
      leaderboard: sorted,
      playerRank,
      coinsEarned,
      xpEarned,
      redTeamScore: this.redTeamScore,
      blueTeamScore: this.blueTeamScore,
    });
    this.emitHudSnapshot();
  }

  private scheduleNextFrame(): void {
    if (this.isSoftwareGl) {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(this.tick, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  }

  private tick = (): void => {
    const now = performance.now();
    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);
    const elapsed = now / 1000;

    // Global shortcut checks
    if (this.justPressedKeys.has('Escape')) {
      if (this.stage === 'playing') this.setPaused(true);
      else if (this.stage === 'paused') this.setPaused(false);
    }
    if (this.justPressedKeys.has('KeyC')) {
      this.triggerPlayerManualCelebration();
    }

    if (this.arena) {
      this.arena.updateAnimatedProps(elapsed);
    }

    if (this.stage === 'lobby') {
      this.updateLobby(dt, elapsed);
    } else if (this.stage === 'playing') {
      if (this.hitstopTimer > 0) {
        this.hitstopTimer -= dt;
      } else {
        this.updatePlaying(dt, elapsed);
      }
      this.updateChaseCamera(dt);
    } else if (this.stage === 'podium') {
      this.updatePodium(dt, elapsed);
    }

    this.justPressedKeys.clear();
    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  };

  private updateLobby(dt: number, elapsed: number): void {
    if (!this.isDraggingTurntable) {
      this.lobbyTurntableYaw += dt * 0.45;
    }
    if (this.lobbyKartRig && this.lobbyStageGroup) {
      this.lobbyKartRig.root.rotation.y = this.lobbyTurntableYaw;
      this.lobbyKartRig.driverHeadGroup.rotation.y = Math.sin(elapsed * 1.8) * 0.22;
      if (this.lobbyKartRig.propellerSpinner) {
        this.lobbyKartRig.propellerSpinner.rotation.y += dt * 14;
      }
      for (const w of this.lobbyKartRig.wheelSpinMeshes) {
        w.rotation.x -= dt * 2.2;
      }

      if (this.lobbyCelebTimer > 0) {
        this.lobbyCelebTimer -= dt;
        this.lobbyCelebAccum += dt;
        if (this.lobbyCelebAccum >= 0.08) {
          this.lobbyCelebAccum = 0;
          _v1.copy(this.lobbyStageGroup.position);
          _v1.y += 0.36;
          this.particles.emitCelebrationStep(
            this.currentConfig.loadout.celebrationId,
            _v1,
            this.lobbyTurntableYaw,
            this.lobbyKartRig.exhaustTips,
          );
        }
      }
    }

    this.particles.update(dt);

    // Smooth showcase camera framing the kart at upper-center while leaving room for bottom dock
    const baseY = this.lobbyStageGroup ? this.lobbyStageGroup.position.y : 0;
    _camIdealPos.set(Math.sin(elapsed * 0.16) * 1.2, baseY + 3.15, 26 + 7.2);
    _camIdealLook.set(0, baseY + 0.85, 26);
    this.camera.position.lerp(_camIdealPos, 1 - Math.exp(-6 * dt));
    this.camera.lookAt(_camIdealLook);
    if (this.camera.fov !== 52) {
      this.camera.fov = 52;
      this.camera.updateProjectionMatrix();
    }
  }

  private updatePodium(dt: number, elapsed: number): void {
    this.podiumCelebAccum += dt;
    if (this.podiumCelebAccum >= 0.1) {
      this.podiumCelebAccum = 0;
      for (const pr of this.podiumRigs) {
        this.particles.emitCelebrationStep(pr.celebId, pr.pos, pr.yaw, pr.rig.exhaustTips);
      }
    }
    for (const pr of this.podiumRigs) {
      pr.rig.driverHeadGroup.rotation.y = Math.sin(elapsed * 3.5) * 0.28;
      pr.rig.bodyTiltGroup.position.y = Math.abs(Math.sin(elapsed * 5.0)) * 0.08;
      if (pr.rig.propellerSpinner) pr.rig.propellerSpinner.rotation.y += dt * 16;
    }
    this.particles.update(dt);

    const baseY = this.podiumGroup ? this.podiumGroup.position.y : 0;
    _camIdealPos.set(Math.sin(elapsed * 0.35) * 3.2, baseY + 4.8, 22 + 11.5);
    _camIdealLook.set(0, baseY + 1.8, 22);
    this.camera.position.lerp(_camIdealPos, 1 - Math.exp(-5 * dt));
    this.camera.lookAt(_camIdealLook);
  }

  private updatePlaying(dt: number, elapsed: number): void {
    this.timeRemaining -= dt;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.enterPodiumStage();
      return;
    }

    if (this.streakBannerTimer > 0) {
      this.streakBannerTimer -= dt;
      if (this.streakBannerTimer <= 0) this.streakBanner = null;
    }

    // 1. Update Mystery '?' Crates
    for (const c of this.crates) {
      if (!c.active) {
        c.respawnTimer -= dt;
        if (c.respawnTimer <= 0) {
          c.active = true;
          c.mesh.visible = true;
        }
        continue;
      }
      const boxChild = c.mesh.children[0];
      if (boxChild) {
        boxChild.rotation.y = elapsed * 2.1 + c.phase;
        boxChild.rotation.x = 0.35 + Math.sin(elapsed * 2.6 + c.phase) * 0.2;
        boxChild.position.y = 1.45 + Math.sin(elapsed * 3.2 + c.phase) * 0.25;
      }
    }

    // 2. Update All Kart Actors (Player + Smart Bots)
    for (const actor of this.actors) {
      this.updateActor(actor, dt, elapsed);
    }

    // 3. Kart-to-Kart Bumper Collisions & Star Invincibility Ram Smashes
    for (let i = 0; i < this.actors.length; i++) {
      const a = this.actors[i];
      if (!a.alive) continue;
      for (let j = i + 1; j < this.actors.length; j++) {
        const b = this.actors[j];
        if (!b.alive) continue;
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const dist = Math.hypot(dx, dz);
        const minDist = 2.55;
        if (dist < minDist && dist > 0.001 && Math.abs(a.pos.y - b.pos.y) < 1.8) {
          const nx = dx / dist;
          const nz = dz / dist;
          const overlap = (minDist - dist) * 0.5;
          a.pos.x -= nx * overlap;
          a.pos.z -= nz * overlap;
          b.pos.x += nx * overlap;
          b.pos.z += nz * overlap;

          // Star Invincibility instant ram Smash!
          const sameTeam = a.team !== 'none' && a.team === b.team;
          if (!sameTeam) {
            if (a.starShieldTimer > 0 && b.starShieldTimer <= 0 && b.spawnShieldTimer <= 0) {
              this.applyDamage(b, 999, a, 'Star Ram');
            } else if (b.starShieldTimer > 0 && a.starShieldTimer <= 0 && a.spawnShieldTimer <= 0) {
              this.applyDamage(a, 999, b, 'Star Ram');
            }
          }

          // Elastic bump impulse
          a.vel.x -= nx * 7;
          a.vel.z -= nz * 7;
          b.vel.x += nx * 7;
          b.vel.z += nz * 7;
        }
      }
    }

    // 4. Update Active Projectiles, Mines, Grenukes & Flame Pools
    this.updateProjectiles(dt, elapsed);

    // 5. Update Particles & Celebrations
    this.particles.update(dt);

    // 6. Update Player Engine Hum & Periodic HUD Snapshot
    const player = this.actors[0];
    if (player) {
      sound.updateEngineHum(
        player.alive ? player.speed / 30 : 0,
        player.turboFlameTimer > 0 || player.boostPadTimer > 0,
        false,
      );
    }

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.065) {
      this.hudEmitAccum = 0;
      this.emitHudSnapshot();
    }
  }

  private updateActor(actor: KartActor, dt: number, elapsed: number): void {
    const arena = this.arena!;

    if (!actor.alive) {
      actor.respawnTimer -= dt;
      if (actor.respawnTimer <= 0) {
        this.respawnActor(actor);
      }
      return;
    }

    if (actor.spawnShieldTimer > 0) actor.spawnShieldTimer -= dt;
    if (actor.starShieldTimer > 0) actor.starShieldTimer -= dt;
    if (actor.boostPadTimer > 0) actor.boostPadTimer -= dt;
    if (actor.minigunCooldown > 0) actor.minigunCooldown -= dt;

    // Hit flash reset
    if (actor.hitFlashTimer > 0) {
      actor.hitFlashTimer -= dt;
      if (actor.hitFlashTimer <= 0) {
        for (const h of actor.rig.hitFlashMaterials) {
          h.mat.emissive.copy(h.origEmissive);
          h.mat.emissiveIntensity = h.origIntensity;
        }
      }
    }

    // Crown Rush passive points
    if (this.currentConfig.mode === 'crown' && actor.hasCrown) {
      actor.crownScoreAccum += dt;
      if (actor.crownScoreAccum >= 1.0) {
        actor.crownScoreAccum -= 1.0;
        actor.score += 2;
      }
    }

    // Mystery '?' Roulette Spin Completion
    if (actor.rouletteTimer > 0) {
      actor.rouletteTimer -= dt;
      if (actor.rouletteTimer <= 0) {
        const picked = this.rollSmartWeapon(actor);
        actor.weaponId = picked;
        const wDef = WEAPONS[picked];
        actor.weaponValue = wDef.ammoOrDuration;
        if (actor.isPlayer) sound.playWeaponReady();
      }
    }

    // Gather Throttle, Steer, Drift & Fire Commands
    let throttle = 0;
    let steer = 0;
    let wantDrift = false;
    let wantFire = false;

    if (actor.isPlayer) {
      const fwd =
        (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp') ? 1 : 0) -
        (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown') ? 1 : 0);
      const str =
        (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft') ? 1 : 0) -
        (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight') ? 1 : 0);
      throttle = fwd !== 0 ? fwd : this.virtualInput.forward;
      steer = str !== 0 ? str : this.virtualInput.steer;
      wantDrift =
        this.heldKeys.has('ShiftLeft') ||
        this.heldKeys.has('ShiftRight') ||
        this.virtualInput.drift;
      wantFire =
        this.justPressedKeys.has('Space') ||
        this.justPressedKeys.has('KeyE') ||
        this.heldKeys.has('Space') && actor.weaponId === 'twin_minigun';
    } else {
      const aiCmd = this.computeBotInputs(actor, dt);
      throttle = aiCmd.throttle;
      steer = aiCmd.steer;
      wantDrift = aiCmd.drift;
      wantFire = aiCmd.fire;
    }

    // Active Duration Weapons (Minigun & Turbo Flame)
    if (actor.weaponId === 'twin_minigun' && wantFire) {
      actor.weaponValue -= dt;
      if (actor.minigunCooldown <= 0) {
        actor.minigunCooldown = 0.095;
        this.fireMinigunPair(actor);
      }
      if (actor.weaponValue <= 0) {
        actor.weaponId = null;
        actor.weaponValue = 0;
      }
    } else if (wantFire && actor.weaponId && actor.rouletteTimer <= 0) {
      this.activateWeapon(actor);
    }

    if (actor.turboFlameTimer > 0) {
      actor.turboFlameTimer -= dt;
      actor.flameDropAccum += dt;
      if (actor.flameDropAccum >= 0.14) {
        actor.flameDropAccum = 0;
        this.spawnFlamePool(actor);
      }
    }

    // Arcade Kart Kinematics
    const kartDef = KARTS.find((k) => k.id === actor.kartId) || KARTS[0];
    let topSpeed = 29.5 + (kartDef.speedStat - 8) * 0.75;
    if (actor.starShieldTimer > 0) topSpeed *= 1.24;
    if (actor.turboFlameTimer > 0) topSpeed *= 1.36;
    if (actor.boostPadTimer > 0) topSpeed *= 1.32;

    const accel = 36 * arena.traction;
    const reverseMax = -13;

    if (actor.turboFlameTimer > 0 || actor.boostPadTimer > 0) {
      actor.speed = THREE.MathUtils.damp(actor.speed, topSpeed, 7, dt);
    } else if (throttle > 0) {
      actor.speed = Math.min(topSpeed, actor.speed + accel * throttle * dt);
    } else if (throttle < 0) {
      actor.speed = Math.max(reverseMax, actor.speed + accel * 0.85 * throttle * dt);
    } else {
      actor.speed = THREE.MathUtils.damp(actor.speed, 0, 3.2 * arena.traction, dt);
    }

    // Drift & Mini-Turbo Charge
    const canDrift = wantDrift && actor.grounded && Math.abs(actor.speed) > 12 && Math.abs(steer) > 0.15;
    if (canDrift) {
      actor.drifting = true;
      actor.driftTimer = Math.min(1.6, actor.driftTimer + dt);
      if (Math.random() < 0.45) {
        const sparkCol = actor.driftTimer > 0.9 ? '#facc15' : '#38bdf8';
        this.particles.spawnCube(
          actor.pos.x + (Math.random() - 0.5) * 1.2,
          actor.pos.y + 0.25,
          actor.pos.z + (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 4,
          2.5,
          (Math.random() - 0.5) * 4,
          sparkCol,
          0.25,
          0.65,
          -12,
        );
      }
    } else {
      if (actor.drifting && actor.driftTimer >= 0.75) {
        actor.boostPadTimer = Math.max(actor.boostPadTimer, 0.9);
        if (actor.isPlayer) sound.playBoost();
      }
      actor.drifting = false;
      actor.driftTimer = 0;
    }

    const turnRate = (2.45 + (kartDef.handlingStat - 8) * 0.08) * (actor.drifting ? 1.32 : 1.0);
    const speedFactor = Math.min(1, Math.abs(actor.speed) / 8) * (actor.speed >= -0.2 ? 1 : -1);
    actor.yaw += steer * turnRate * speedFactor * dt;
    actor.steerAngle = THREE.MathUtils.damp(actor.steerAngle, steer * 0.45, 12, dt);

    // Forward direction in Three.js (-Z when yaw=0 -> x: -sin(yaw), z: -cos(yaw))
    const fwdX = -Math.sin(actor.yaw);
    const fwdZ = -Math.cos(actor.yaw);

    // Blend traction velocity with knockback impulses
    const grip = (actor.drifting ? 4.2 : 9.5) * arena.traction;
    actor.vel.x = THREE.MathUtils.damp(actor.vel.x, fwdX * actor.speed, grip, dt);
    actor.vel.z = THREE.MathUtils.damp(actor.vel.z, fwdZ * actor.speed, grip, dt);

    const prevGround = arena.sampleGround(actor.pos.x, actor.pos.z).height;
    actor.pos.x += actor.vel.x * dt;
    actor.pos.z += actor.vel.z * dt;

    // Obstacle Pillar/Rock Collisions
    for (const obs of arena.obstacles) {
      if (actor.pos.y > obs.height) continue;
      const dx = actor.pos.x - obs.x;
      const dz = actor.pos.z - obs.z;
      const dist = Math.hypot(dx, dz);
      const minD = obs.radius + 1.25;
      if (dist < minD && dist > 0.0001) {
        const nx = dx / dist;
        const nz = dz / dist;
        actor.pos.x = obs.x + nx * minD;
        actor.pos.z = obs.z + nz * minD;
        actor.speed *= 0.68;
      }
    }

    // Vertical Ramp Launch, Gravity & Hazard Check
    const groundSample = arena.sampleGround(actor.pos.x, actor.pos.z);
    if (groundSample.isBoost && actor.grounded) {
      if (actor.boostPadTimer <= 0.1 && actor.isPlayer) sound.playBoost();
      actor.boostPadTimer = 1.1;
    }

    // Detect launching off a ramp lip!
    if (actor.grounded && prevGround - groundSample.height > 0.65 && Math.abs(actor.speed) > 14) {
      actor.grounded = false;
      actor.vel.y = Math.min(13.5, Math.abs(actor.speed) * 0.34);
    }

    if (!actor.grounded || actor.pos.y > groundSample.height + 0.08) {
      actor.grounded = false;
      actor.vel.y -= 28 * dt;
      actor.pos.y += actor.vel.y * dt;
      if (actor.pos.y <= groundSample.height) {
        actor.pos.y = groundSample.height;
        actor.vel.y = 0;
        actor.grounded = true;
      }
    } else {
      actor.pos.y = groundSample.height;
      actor.vel.y = 0;
    }

    // Arena Hazard (Molten Lava / Deep Ocean / Sky Drop-Off)
    if (groundSample.isHazard && actor.pos.y <= groundSample.height + 0.35) {
      const killer = actor.lastDamagedById
        ? this.actors.find((a) => a.id === actor.lastDamagedById) || null
        : null;
      const mapDef = MAPS.find((m) => m.id === arena.mapId);
      this.applyDamage(actor, 999, killer, mapDef ? mapDef.hazardLabel : 'Hazard');
      return;
    }

    // Check '?' Mystery Box Pickup
    if (!actor.weaponId && actor.rouletteTimer <= 0) {
      for (const c of this.crates) {
        if (!c.active) continue;
        if (
          Math.hypot(actor.pos.x - c.pos.x, actor.pos.z - c.pos.z) < 2.35 &&
          Math.abs(actor.pos.y - c.pos.y) < 2.2
        ) {
          c.active = false;
          c.mesh.visible = false;
          c.respawnTimer = 6.0;
          actor.rouletteTimer = 0.52;
          this.particles.emitCrateShatter(c.pos.x, c.pos.y, c.pos.z);
          if (actor.isPlayer) sound.playBoxPickup();
          break;
        }
      }
    }

    // Active Kill-Streak or Manual Celebration VFX from Exhaust Pipes!
    if (actor.celebrationTimer > 0) {
      actor.celebrationTimer -= dt;
      actor.celebrationTickAccum += dt;
      if (actor.celebrationTickAccum >= 0.085) {
        actor.celebrationTickAccum = 0;
        this.particles.emitCelebrationStep(
          actor.celebrationId,
          actor.pos,
          actor.yaw,
          actor.rig.exhaustTips,
        );
      }
    }

    // Sync 3D Rig Transforms, Wheel Spin, Steering & Body Roll
    const rig = actor.rig;
    rig.root.position.copy(actor.pos);
    rig.root.rotation.y = actor.yaw;

    rig.frontLeftPivot.rotation.y = actor.steerAngle;
    rig.frontRightPivot.rotation.y = actor.steerAngle;
    for (const w of rig.wheelSpinMeshes) {
      w.rotation.x -= actor.speed * dt * 1.35;
    }

    // Dynamic body roll on turns & pitch on acceleration/jumps
    const targetRoll = -steer * Math.min(1, Math.abs(actor.speed) / 22) * (actor.drifting ? 0.16 : 0.09);
    const targetPitch = actor.grounded ? -throttle * 0.035 : THREE.MathUtils.clamp(actor.vel.y * 0.03, -0.25, 0.28);
    rig.bodyTiltGroup.rotation.z = THREE.MathUtils.damp(rig.bodyTiltGroup.rotation.z, targetRoll, 10, dt);
    rig.bodyTiltGroup.rotation.x = THREE.MathUtils.damp(rig.bodyTiltGroup.rotation.x, targetPitch, 10, dt);
    rig.driverHeadGroup.rotation.y = actor.steerAngle * 0.85;
    if (rig.propellerSpinner) {
      rig.propellerSpinner.rotation.y += dt * (6 + Math.abs(actor.speed) * 0.7);
    }

    // Shield dome & Crown visibility
    const shieldOn = actor.starShieldTimer > 0 || actor.spawnShieldTimer > 0;
    rig.shieldDome.visible = shieldOn;
    if (shieldOn) {
      rig.shieldDome.rotation.y = elapsed * 3.2;
      const sMat = rig.shieldDome.material as THREE.MeshStandardMaterial;
      sMat.color.set(actor.starShieldTimer > 0 ? '#facc15' : '#38bdf8');
      sMat.emissive.set(actor.starShieldTimer > 0 ? '#f59e0b' : '#0284c7');
    }
    rig.crownMesh.visible = actor.hasCrown;
    if (actor.hasCrown) {
      rig.crownMesh.rotation.y = elapsed * 2.4;
      rig.crownMesh.position.y = 2.75 + Math.sin(elapsed * 4) * 0.12;
    }
  }

  private rollSmartWeapon(actor: KartActor): WeaponId {
    // Give trailing players slightly higher odds of Star Shield or Homing Rocket
    const r = Math.random();
    if (actor.hp < 50 && r < 0.25) return 'star_shield';
    return WEAPON_KEYS[Math.floor(Math.random() * WEAPON_KEYS.length)];
  }

  private computeBotInputs(
    bot: KartActor,
    dt: number,
  ): { throttle: number; steer: number; drift: boolean; fire: boolean } {
    const arena = this.arena!;
    bot.aiThinkTimer -= dt;

    if (bot.aiReverseTimer > 0) {
      bot.aiReverseTimer -= dt;
      return { throttle: -0.9, steer: 0.8, drift: false, fire: false };
    }

    if (Math.abs(bot.speed) < 2.2) {
      bot.aiStuckTimer += dt;
      if (bot.aiStuckTimer > 1.1) {
        bot.aiStuckTimer = 0;
        bot.aiReverseTimer = 0.65;
      }
    } else {
      bot.aiStuckTimer = 0;
    }

    // Re-evaluate tactical target periodically
    if (bot.aiThinkTimer <= 0) {
      const skillReaction =
        this.currentConfig.botDifficulty === 'chaos'
          ? 0.16
          : this.currentConfig.botDifficulty === 'skilled'
            ? 0.26
            : 0.42;
      bot.aiThinkTimer = skillReaction + Math.random() * 0.15;

      // Priority 1: If unarmed, steer toward nearest active '?' Mystery Crate!
      let pickedCrate: QuestionCrateState | null = null;
      if (!bot.weaponId && bot.rouletteTimer <= 0) {
        let bestD = Infinity;
        for (const c of this.crates) {
          if (!c.active) continue;
          const d = bot.pos.distanceTo(c.pos);
          if (d < bestD) {
            bestD = d;
            pickedCrate = c;
          }
        }
      }

      // Priority 2: Find priority enemy (Crown Carrier in Crown Rush, or closest valid rival)
      let bestEnemy: KartActor | null = null;
      let bestEnemyDist = Infinity;
      for (const other of this.actors) {
        if (other.id === bot.id || !other.alive) continue;
        if (bot.team !== 'none' && other.team === bot.team) continue;
        let d = bot.pos.distanceTo(other.pos);
        if (this.currentConfig.mode === 'crown' && other.hasCrown) {
          d *= 0.45; // Strongly prioritize Crown Carrier!
        }
        if (d < bestEnemyDist) {
          bestEnemyDist = d;
          bestEnemy = other;
        }
      }

      bot.aiTargetEnemyId = bestEnemy ? bestEnemy.id : null;
      if (pickedCrate && (!bestEnemy || bot.starShieldTimer <= 0)) {
        bot.aiTargetPos.copy(pickedCrate.pos);
      } else if (bestEnemy) {
        bot.aiTargetPos.copy(bestEnemy.pos);
      } else {
        bot.aiTargetPos.set(0, 0, 0);
      }
    }

    // Keep bots safely away from outer drop-off / central lava
    const distCenter = Math.hypot(bot.pos.x, bot.pos.z);
    if (distCenter > arena.arenaRadius - 10) {
      bot.aiTargetPos.set(0, 0, 0);
    } else if (arena.mapId === 'magma_foundry' && distCenter < 13) {
      bot.aiTargetPos.set(bot.pos.x * 2.2, 0, bot.pos.z * 2.2);
    }

    const dx = bot.aiTargetPos.x - bot.pos.x;
    const dz = bot.aiTargetPos.z - bot.pos.z;
    const desiredYaw = Math.atan2(-dx, -dz);
    let angleDiff = desiredYaw - bot.yaw;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const steer = THREE.MathUtils.clamp(angleDiff * 2.2, -1, 1);
    const drift = Math.abs(angleDiff) > 0.85 && bot.speed > 18;

    // Weapon firing intelligence
    let fire = false;
    if (bot.weaponId && bot.rouletteTimer <= 0) {
      const enemy = bot.aiTargetEnemyId ? this.actors.find((a) => a.id === bot.aiTargetEnemyId) : null;
      if (bot.weaponId === 'star_shield' || bot.weaponId === 'turbo_flame') {
        fire = true;
      } else if (bot.weaponId === 'landmine') {
        fire = Math.random() < 0.08;
      } else if (enemy && enemy.alive) {
        const dEnemy = bot.pos.distanceTo(enemy.pos);
        const aligned = Math.abs(angleDiff) < (bot.weaponId === 'homing_rocket' ? 0.55 : 0.34);
        if (dEnemy < 46 && aligned) {
          fire = true;
        }
      }
    }

    return { throttle: 1, steer, drift, fire };
  }

  private activateWeapon(actor: KartActor): void {
    const w = actor.weaponId;
    if (!w) return;

    const fwdX = -Math.sin(actor.yaw);
    const fwdZ = -Math.cos(actor.yaw);

    if (w === 'homing_rocket') {
      // Find best enemy in forward cone
      let bestTargetId: string | null = null;
      let bestScore = Infinity;
      for (const other of this.actors) {
        if (other.id === actor.id || !other.alive) continue;
        if (actor.team !== 'none' && other.team === actor.team) continue;
        const dx = other.pos.x - actor.pos.x;
        const dz = other.pos.z - actor.pos.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 62 || dist < 1) continue;
        const dot = (dx * fwdX + dz * fwdZ) / dist;
        if (dot > 0.35 && dist < bestScore) {
          bestScore = dist;
          bestTargetId = other.id;
        }
      }

      const rocketGroup = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.22, 1.35, 10),
        new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#dc2626', emissiveIntensity: 0.45, roughness: 0.3 }),
      );
      body.rotation.x = Math.PI / 2;
      const nose = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.45, 10),
        new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 }),
      );
      nose.rotation.x = -Math.PI / 2;
      nose.position.z = -0.88;
      rocketGroup.add(body, nose);

      const sx = actor.pos.x + fwdX * 2.4;
      const sy = actor.pos.y + 0.85;
      const sz = actor.pos.z + fwdZ * 2.4;
      rocketGroup.position.set(sx, sy, sz);
      rocketGroup.rotation.y = actor.yaw;
      this.projectileGroup.add(rocketGroup);

      this.projectiles.push({
        type: 'rocket',
        ownerId: actor.id,
        ownerTeam: actor.team,
        pos: new THREE.Vector3(sx, sy, sz),
        vel: new THREE.Vector3(fwdX * 48, 0, fwdZ * 48),
        yaw: actor.yaw,
        age: 0,
        maxAge: 3.4,
        targetActorId: bestTargetId,
        bouncesLeft: 0,
        mesh: rocketGroup,
      });

      if (actor.isPlayer) sound.playRocketFire();
      actor.weaponId = null;
      actor.weaponValue = 0;
    } else if (w === 'landmine') {
      const mx = actor.pos.x - fwdX * 2.5;
      const mz = actor.pos.z - fwdZ * 2.5;
      const my = this.arena!.sampleGround(mx, mz).height;

      const mineGroup = new THREE.Group();
      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 0.82, 0.28, 14),
        new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.7, roughness: 0.35 }),
      );
      base.position.y = 0.14;
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.26, 10, 8),
        new THREE.MeshStandardMaterial({ color: '#f43f5e', emissive: '#ef4444', emissiveIntensity: 1.0 }),
      );
      beacon.position.y = 0.32;
      mineGroup.add(base, beacon);
      mineGroup.position.set(mx, my, mz);
      this.projectileGroup.add(mineGroup);

      this.projectiles.push({
        type: 'mine',
        ownerId: actor.id,
        ownerTeam: actor.team,
        pos: new THREE.Vector3(mx, my, mz),
        vel: new THREE.Vector3(),
        yaw: 0,
        age: 0,
        maxAge: 18.0,
        targetActorId: null,
        bouncesLeft: 0,
        mesh: mineGroup,
      });

      if (actor.isPlayer) sound.playMineDrop();
      actor.weaponValue -= 1;
      if (actor.weaponValue <= 0) actor.weaponId = null;
    } else if (w === 'lob_grenuke') {
      const bomb = new THREE.Mesh(
        new THREE.SphereGeometry(0.52, 14, 12),
        new THREE.MeshStandardMaterial({
          color: '#a855f7',
          emissive: '#9333ea',
          emissiveIntensity: 0.65,
          roughness: 0.25,
        }),
      );
      const sx = actor.pos.x + fwdX * 1.8;
      const sy = actor.pos.y + 1.5;
      const sz = actor.pos.z + fwdZ * 1.8;
      bomb.position.set(sx, sy, sz);
      this.projectileGroup.add(bomb);

      // Pulsing danger telegraph ring at predicted landing spot!
      const flightTime = 1.15;
      const throwSpeed = 28 + Math.max(0, actor.speed * 0.45);
      const landX = sx + fwdX * throwSpeed * flightTime;
      const landZ = sz + fwdZ * throwSpeed * flightTime;
      const landY = this.arena!.sampleGround(landX, landZ).height;

      const targetRing = new THREE.Mesh(
        new THREE.RingGeometry(4.8, 5.5, 28),
        new THREE.MeshBasicMaterial({
          color: '#ef4444',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        }),
      );
      targetRing.rotation.x = -Math.PI / 2;
      targetRing.position.set(landX, landY + 0.08, landZ);
      this.projectileGroup.add(targetRing);

      this.projectiles.push({
        type: 'grenuke',
        ownerId: actor.id,
        ownerTeam: actor.team,
        pos: new THREE.Vector3(sx, sy, sz),
        vel: new THREE.Vector3(fwdX * throwSpeed, 16.5, fwdZ * throwSpeed),
        yaw: actor.yaw,
        age: 0,
        maxAge: 2.5,
        targetActorId: null,
        bouncesLeft: 0,
        mesh: bomb,
        targetRing,
      });

      if (actor.isPlayer) sound.playRocketFire();
      actor.weaponId = null;
      actor.weaponValue = 0;
    } else if (w === 'triple_cannon') {
      for (const spread of [-0.18, 0, 0.18]) {
        const ang = actor.yaw + spread;
        const dx = -Math.sin(ang);
        const dz = -Math.cos(ang);
        const ball = new THREE.Mesh(
          new THREE.SphereGeometry(0.42, 12, 10),
          new THREE.MeshStandardMaterial({ color: '#1e293b', metalness: 0.85, roughness: 0.25 }),
        );
        const sx = actor.pos.x + dx * 2.3;
        const sy = actor.pos.y + 0.65;
        const sz = actor.pos.z + dz * 2.3;
        ball.position.set(sx, sy, sz);
        this.projectileGroup.add(ball);

        this.projectiles.push({
          type: 'cannon',
          ownerId: actor.id,
          ownerTeam: actor.team,
          pos: new THREE.Vector3(sx, sy, sz),
          vel: new THREE.Vector3(dx * 44, 0, dz * 44),
          yaw: ang,
          age: 0,
          maxAge: 2.6,
          targetActorId: null,
          bouncesLeft: 2,
          mesh: ball,
        });
      }
      if (actor.isPlayer) sound.playCannonShot();
      actor.weaponId = null;
      actor.weaponValue = 0;
    } else if (w === 'star_shield') {
      actor.starShieldTimer = WEAPONS.star_shield.ammoOrDuration;
      if (actor.isPlayer) sound.playStarShield();
      actor.weaponId = null;
      actor.weaponValue = 0;
    } else if (w === 'turbo_flame') {
      actor.turboFlameTimer = WEAPONS.turbo_flame.ammoOrDuration;
      if (actor.isPlayer) sound.playBoost();
      actor.weaponId = null;
      actor.weaponValue = 0;
    }
  }

  private fireMinigunPair(actor: KartActor): void {
    const fwdX = -Math.sin(actor.yaw);
    const fwdZ = -Math.cos(actor.yaw);
    const rightX = Math.cos(actor.yaw);
    const rightZ = -Math.sin(actor.yaw);

    for (const side of [-0.55, 0.55]) {
      const tracer = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.12, 1.1),
        new THREE.MeshBasicMaterial({ color: '#fde047' }),
      );
      const sx = actor.pos.x + fwdX * 2.1 + rightX * side;
      const sy = actor.pos.y + 0.78;
      const sz = actor.pos.z + fwdZ * 2.1 + rightZ * side;
      tracer.position.set(sx, sy, sz);
      tracer.rotation.y = actor.yaw;
      this.projectileGroup.add(tracer);

      this.projectiles.push({
        type: 'bullet',
        ownerId: actor.id,
        ownerTeam: actor.team,
        pos: new THREE.Vector3(sx, sy, sz),
        vel: new THREE.Vector3(fwdX * 72, 0, fwdZ * 72),
        yaw: actor.yaw,
        age: 0,
        maxAge: 0.9,
        targetActorId: null,
        bouncesLeft: 0,
        mesh: tracer,
      });
    }
    if (actor.isPlayer) sound.playMinigunShot();
  }

  private spawnFlamePool(actor: KartActor): void {
    const fwdX = -Math.sin(actor.yaw);
    const fwdZ = -Math.cos(actor.yaw);
    const fx = actor.pos.x - fwdX * 1.9;
    const fz = actor.pos.z - fwdZ * 1.9;
    const fy = this.arena!.sampleGround(fx, fz).height;

    const pool = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.25, 0.16, 12),
      new THREE.MeshBasicMaterial({ color: '#f97316' }),
    );
    pool.position.set(fx, fy + 0.08, fz);
    this.projectileGroup.add(pool);

    this.projectiles.push({
      type: 'flame_pool',
      ownerId: actor.id,
      ownerTeam: actor.team,
      pos: new THREE.Vector3(fx, fy, fz),
      vel: new THREE.Vector3(),
      yaw: 0,
      age: 0,
      maxAge: 2.4,
      targetActorId: null,
      bouncesLeft: 0,
      mesh: pool,
    });
  }

  private updateProjectiles(dt: number, elapsed: number): void {
    const arena = this.arena!;

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;
      let remove = p.age >= p.maxAge;

      if (p.type === 'rocket') {
        // Homing guidance toward locked target
        if (p.targetActorId) {
          const tgt = this.actors.find((a) => a.id === p.targetActorId);
          if (tgt && tgt.alive) {
            _v1.set(tgt.pos.x - p.pos.x, 0, tgt.pos.z - p.pos.z).normalize();
            _v2.set(p.vel.x, 0, p.vel.z).normalize();
            _v2.lerp(_v1, 1 - Math.exp(-5.2 * dt)).normalize();
            p.vel.x = _v2.x * 48;
            p.vel.z = _v2.z * 48;
            p.yaw = Math.atan2(-_v2.x, -_v2.z);
          }
        }
        p.pos.x += p.vel.x * dt;
        p.pos.z += p.vel.z * dt;
        const gh = arena.sampleGround(p.pos.x, p.pos.z).height;
        p.pos.y = THREE.MathUtils.damp(p.pos.y, gh + 0.85, 10, dt);
        p.mesh.position.copy(p.pos);
        p.mesh.rotation.y = p.yaw;

        if (Math.random() < 0.7) {
          this.particles.spawnCube(p.pos.x, p.pos.y, p.pos.z, 0, 1.5, 0, '#e2e8f0', 0.3, 0.7, 2);
        }

        // Obstacle impact
        if (arena.obstacles.some((o) => Math.hypot(p.pos.x - o.x, p.pos.z - o.z) < o.radius + 0.5 && p.pos.y < o.height)) {
          this.detonateSplash(p.pos, 6.2, 68, p.ownerId, p.ownerTeam, 'Homing Missile', false);
          remove = true;
        } else {
          const hit = this.findHitActor(p.pos, 2.0, p.ownerId, p.ownerTeam);
          if (hit) {
            this.detonateSplash(p.pos, 6.5, 76, p.ownerId, p.ownerTeam, 'Homing Missile', false);
            remove = true;
          }
        }
      } else if (p.type === 'bullet') {
        p.pos.x += p.vel.x * dt;
        p.pos.z += p.vel.z * dt;
        p.mesh.position.copy(p.pos);
        if (arena.obstacles.some((o) => Math.hypot(p.pos.x - o.x, p.pos.z - o.z) < o.radius + 0.3 && p.pos.y < o.height)) {
          remove = true;
        } else {
          const hit = this.findHitActor(p.pos, 1.65, p.ownerId, p.ownerTeam);
          if (hit) {
            const owner = this.actors.find((a) => a.id === p.ownerId) || null;
            this.applyDamage(hit, 15, owner, 'Twin Minigun');
            this.particles.spawnCube(p.pos.x, p.pos.y, p.pos.z, 0, 4, 0, '#fde047', 0.25, 0.8, -10);
            remove = true;
          }
        }
      } else if (p.type === 'mine') {
        p.mesh.rotation.y = elapsed * 2;
        if (p.age > 0.45) {
          const hit = this.findHitActor(p.pos, 2.5, p.age < 1.2 ? p.ownerId : '', p.ownerTeam);
          if (hit) {
            this.detonateSplash(p.pos, 6.8, 82, p.ownerId, p.ownerTeam, 'Landmine', false);
            remove = true;
          }
        }
      } else if (p.type === 'grenuke') {
        p.vel.y -= 28 * dt;
        p.pos.addScaledVector(p.vel, dt);
        p.mesh.position.copy(p.pos);
        if (p.targetRing) {
          const pulse = 0.92 + Math.sin(elapsed * 16) * 0.1;
          p.targetRing.scale.setScalar(pulse);
        }
        const gh = arena.sampleGround(p.pos.x, p.pos.z).height;
        if (p.pos.y <= gh + 0.35) {
          p.pos.y = gh + 0.35;
          this.detonateSplash(p.pos, 10.5, 96, p.ownerId, p.ownerTeam, 'Lob-Grenuke', true);
          remove = true;
        }
      } else if (p.type === 'cannon') {
        p.pos.x += p.vel.x * dt;
        p.pos.z += p.vel.z * dt;
        p.pos.y = arena.sampleGround(p.pos.x, p.pos.z).height + 0.55;
        p.mesh.position.copy(p.pos);

        for (const o of arena.obstacles) {
          const dx = p.pos.x - o.x;
          const dz = p.pos.z - o.z;
          const dist = Math.hypot(dx, dz);
          if (dist < o.radius + 0.5) {
            if (p.bouncesLeft > 0) {
              p.bouncesLeft--;
              const nx = dx / dist;
              const nz = dz / dist;
              const dot = p.vel.x * nx + p.vel.z * nz;
              p.vel.x -= 2 * dot * nx;
              p.vel.z -= 2 * dot * nz;
              p.pos.x = o.x + nx * (o.radius + 0.6);
              p.pos.z = o.z + nz * (o.radius + 0.6);
            } else {
              remove = true;
            }
            break;
          }
        }

        const hit = this.findHitActor(p.pos, 1.85, p.ownerId, p.ownerTeam);
        if (hit) {
          const owner = this.actors.find((a) => a.id === p.ownerId) || null;
          this.applyDamage(hit, 54, owner, 'Cannonball');
          this.particles.emitExplosion(p.pos.x, p.pos.y, p.pos.z, false);
          remove = true;
        }
      } else if (p.type === 'flame_pool') {
        const s = Math.max(0.2, 1 - p.age / p.maxAge);
        p.mesh.scale.set(s, 1, s);
        if (p.age > 0.2) {
          const hit = this.findHitActor(p.pos, 1.9, p.ownerId, p.ownerTeam);
          if (hit) {
            const owner = this.actors.find((a) => a.id === p.ownerId) || null;
            this.applyDamage(hit, 34, owner, 'Flame Trail');
            remove = true;
          }
        }
      }

      if (remove) {
        this.projectileGroup.remove(p.mesh);
        if (p.targetRing) this.projectileGroup.remove(p.targetRing);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private findHitActor(
    pos: THREE.Vector3,
    radius: number,
    ignoreOwnerId: string,
    ownerTeam: 'none' | 'red' | 'blue',
  ): KartActor | null {
    for (const a of this.actors) {
      if (!a.alive || a.id === ignoreOwnerId) continue;
      if (ownerTeam !== 'none' && a.team === ownerTeam) continue;
      if (Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z) < radius + 1.15 && Math.abs(a.pos.y - pos.y) < 2.4) {
        return a;
      }
    }
    return null;
  }

  private detonateSplash(
    center: THREE.Vector3,
    radius: number,
    maxDamage: number,
    ownerId: string,
    ownerTeam: 'none' | 'red' | 'blue',
    weaponLabel: string,
    heavy: boolean,
  ): void {
    this.particles.emitExplosion(center.x, center.y, center.z, heavy);
    const player = this.actors[0];
    const distToPlayer = player ? player.pos.distanceTo(center) : 999;
    if (distToPlayer < 45) {
      sound.playExplosion(heavy);
      this.shakeIntensity = Math.max(this.shakeIntensity, heavy ? 0.85 : 0.45);
    }

    const owner = this.actors.find((a) => a.id === ownerId) || null;
    for (const a of this.actors) {
      if (!a.alive) continue;
      if (ownerTeam !== 'none' && a.team === ownerTeam && a.id !== ownerId) continue;
      const d = a.pos.distanceTo(center);
      if (d < radius) {
        const falloff = 1 - (d / radius) * 0.55;
        const dmg = a.id === ownerId ? maxDamage * 0.35 : maxDamage * falloff;
        // Knockback impulse away from blast
        const nx = (a.pos.x - center.x) / Math.max(0.5, d);
        const nz = (a.pos.z - center.z) / Math.max(0.5, d);
        a.vel.x += nx * (heavy ? 24 : 15);
        a.vel.z += nz * (heavy ? 24 : 15);
        this.applyDamage(a, dmg, a.id === ownerId ? null : owner, weaponLabel);
      }
    }
  }

  private applyDamage(
    victim: KartActor,
    amount: number,
    attacker: KartActor | null,
    weaponLabel: string,
  ): void {
    if (!victim.alive) return;
    if (amount < 500 && (victim.starShieldTimer > 0 || victim.spawnShieldTimer > 0)) {
      return;
    }

    if (attacker && attacker.id !== victim.id) {
      victim.lastDamagedById = attacker.id;
    }

    victim.hp -= amount;
    victim.hitFlashTimer = 0.095;
    for (const h of victim.rig.hitFlashMaterials) {
      h.mat.emissive.set('#ffffff');
      h.mat.emissiveIntensity = 0.9;
    }

    if (victim.isPlayer && victim.hp > 0) {
      sound.playHit();
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.35);
    }

    if (victim.hp <= 0) {
      victim.hp = 0;
      victim.alive = false;
      victim.respawnTimer = 2.6;
      victim.deaths += 1;
      victim.streak = 0;
      victim.weaponId = null;
      victim.rig.root.visible = false;

      this.particles.emitExplosion(victim.pos.x, victim.pos.y + 0.5, victim.pos.z, true);

      // Crown transfer in Crown Rush!
      if (this.currentConfig.mode === 'crown' && victim.hasCrown) {
        victim.hasCrown = false;
        victim.rig.crownMesh.visible = false;
        const newHolder =
          attacker && attacker.alive
            ? attacker
            : this.actors.find((a) => a.alive && a.id !== victim.id) || victim;
        newHolder.hasCrown = true;
        newHolder.rig.crownMesh.visible = true;
      }

      if (attacker && attacker.id !== victim.id) {
        attacker.smashes += 1;
        attacker.score += 10;
        attacker.streak += 1;

        if (this.currentConfig.mode === 'teams') {
          if (attacker.team === 'red') this.redTeamScore += 1;
          else if (attacker.team === 'blue') this.blueTeamScore += 1;
        }

        // Trigger Kart Kill-Streak Celebration from Exhaust Pipes!
        if (attacker.streak >= 2 || attacker.isPlayer) {
          attacker.celebrationTimer = 2.6;
        }

        if (attacker.isPlayer) {
          this.hitstopTimer = 0.045; // Crisp 45ms impact hitstop!
          this.shakeIntensity = Math.max(this.shakeIntensity, 0.65);
          sound.playSmashFanfare();
          this.streakBanner =
            attacker.streak >= 5
              ? 'SMASHOSAURUS STREAK!'
              : attacker.streak === 4
                ? 'MEGA SMASH!'
                : attacker.streak === 3
                  ? 'MULTI SMASH!'
                  : attacker.streak === 2
                    ? 'DOUBLE SMASH!'
                    : `SMASHED ${victim.name.toUpperCase()}!`;
          this.streakBannerTimer = 2.3;
        }
      } else if (victim.isPlayer) {
        sound.playExplosion(true);
      }

      this.killFeed.unshift({
        id: this.nextFeedId++,
        killerName: attacker ? attacker.name : 'Arena',
        victimName: victim.name,
        weaponLabel,
        killerIsPlayer: Boolean(attacker?.isPlayer),
        victimIsPlayer: victim.isPlayer,
      });
      if (this.killFeed.length > 4) this.killFeed.pop();
    }
  }

  private respawnActor(actor: KartActor): void {
    const arena = this.arena!;
    const slot = arena.kartSpawns[Math.floor(Math.random() * arena.kartSpawns.length)];
    const gh = arena.sampleGround(slot.x, slot.z).height;
    actor.pos.set(slot.x, gh, slot.z);
    actor.vel.set(0, 0, 0);
    actor.yaw = slot.yaw;
    actor.speed = 0;
    actor.hp = actor.maxHp;
    actor.alive = true;
    actor.spawnShieldTimer = 2.4;
    actor.lastDamagedById = null;
    actor.rig.root.visible = true;
    actor.rig.root.position.copy(actor.pos);
    actor.rig.root.rotation.y = actor.yaw;
  }

  private updateChaseCamera(dt: number): void {
    const p = this.actors[0];
    if (!p) return;

    const dist = this.cameraPreset === 'close' ? 8.8 : this.cameraPreset === 'wide' ? 14.5 : 11.4;
    const height = this.cameraPreset === 'close' ? 4.4 : this.cameraPreset === 'wide' ? 7.4 : 5.6;

    const behindX = Math.sin(p.yaw) * dist;
    const behindZ = Math.cos(p.yaw) * dist;

    _camIdealPos.set(p.pos.x + behindX, Math.max(2.2, p.pos.y + height), p.pos.z + behindZ);
    _camIdealLook.set(
      p.pos.x - Math.sin(p.yaw) * 3.5,
      p.pos.y + 1.4,
      p.pos.z - Math.cos(p.yaw) * 3.5,
    );

    this.camCurrentPos.lerp(_camIdealPos, 1 - Math.exp(-8.5 * dt));
    this.camCurrentLook.lerp(_camIdealLook, 1 - Math.exp(-12 * dt));

    this.camera.position.copy(this.camCurrentPos);
    if (this.shakeIntensity > 0.005) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity = THREE.MathUtils.damp(this.shakeIntensity, 0, 8, dt);
    } else {
      this.shakeIntensity = 0;
    }
    this.camera.lookAt(this.camCurrentLook);

    // Dynamic speed FOV cue
    const boostAdd = p.turboFlameTimer > 0 || p.boostPadTimer > 0 ? 9 : 0;
    const targetFov = 62 + Math.min(8, Math.abs(p.speed) * 0.22) + boostAdd;
    if (Math.abs(this.camera.fov - targetFov) > 0.1) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private getSortedLeaderboard(): LeaderboardEntry[] {
    return this.actors
      .map((a) => ({
        id: a.id,
        name: a.name,
        isPlayer: a.isPlayer,
        team: a.team,
        smashes: a.smashes,
        deaths: a.deaths,
        score: this.currentConfig.mode === 'crown' ? a.score : a.smashes,
        hasCrown: a.hasCrown,
        kartId: a.kartId,
        skinId: a.skinId,
      }))
      .sort((a, b) => b.score - a.score || b.smashes - a.smashes || a.deaths - b.deaths);
  }

  private emitHudSnapshot(): void {
    const p = this.actors[0];
    const leaderboard = this.stage === 'lobby' ? [] : this.getSortedLeaderboard();
    const crownHolder = this.actors.find((a) => a.hasCrown);

    // Project nearby rival health/name tags cleanly onto 2D screen space
    const worldLabels: WorldLabelProjection[] = [];
    if (this.stage === 'playing' && p) {
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      for (const a of this.actors) {
        if (a.isPlayer || !a.alive) continue;
        const d = a.pos.distanceTo(p.pos);
        if (d > 44 && !a.hasCrown) continue;
        _projVec.set(a.pos.x, a.pos.y + 2.85, a.pos.z);
        _projVec.project(this.camera);
        if (_projVec.z > 1) continue;
        const sx = (_projVec.x * 0.5 + 0.5) * w;
        const sy = (-_projVec.y * 0.5 + 0.5) * h;
        if (sx < 40 || sx > w - 40 || sy < 40 || sy > h - 60) continue;
        worldLabels.push({
          id: a.id,
          name: a.name,
          x: sx,
          y: sy,
          hpRatio: Math.max(0, a.hp / a.maxHp),
          team: a.team,
          hasCrown: a.hasCrown,
          visible: true,
        });
      }
    }

    const wDef = p?.weaponId ? WEAPONS[p.weaponId] : null;
    const roulettePreviewId =
      p && p.rouletteTimer > 0
        ? WEAPON_KEYS[Math.floor(p.rouletteTimer * 26) % WEAPON_KEYS.length]
        : null;

    this.onHudUpdate({
      stage: this.stage,
      timeRemaining: Math.ceil(this.timeRemaining),
      playerHp: p ? Math.ceil(p.hp) : 100,
      playerMaxHp: p ? p.maxHp : 100,
      speedKmh: p ? Math.round(Math.abs(p.speed) * 4.2) : 0,
      driftCharge: p ? Math.min(1, p.driftTimer / 0.75) : 0,
      respawnTimer: p && !p.alive ? Number(p.respawnTimer.toFixed(1)) : 0,
      weaponId: p ? p.weaponId : null,
      weaponAmmoOrTime: p ? p.weaponValue : 0,
      weaponMaxAmmoOrTime: wDef ? wDef.ammoOrDuration : 1,
      rouletteSpinning: Boolean(p && p.rouletteTimer > 0),
      roulettePreviewId,
      smashes: p ? p.smashes : 0,
      streakCount: p ? p.streak : 0,
      streakBanner: this.streakBanner,
      redTeamScore: this.redTeamScore,
      blueTeamScore: this.blueTeamScore,
      crownHolderName: crownHolder ? crownHolder.name : null,
      leaderboard,
      killFeed: [...this.killFeed],
      worldLabels,
    });
  }

  public dispose(): void {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    sound.stopEngineHum();
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    this.texBank.dispose();
    this.particles.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
