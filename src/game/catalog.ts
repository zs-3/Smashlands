export type MapId =
  | 'smash_island'
  | 'magma_foundry'
  | 'skytop_park'
  | 'frostbite_bay'
  | 'canyon_bowl'
  | 'carnival_pier';

export type KartId =
  | 'classic_buggy'
  | 'nitro_viper'
  | 'iron_goliath'
  | 'hyper_hover'
  | 'monster_crusher'
  | 'hotrod_inferno'
  | 'cyber_interceptor'
  | 'dune_raider'
  | 'royal_chariot'
  | 'shark_bite'
  | 'pixel_roadster'
  | 'stealth_phantom'
  | 'bumble_rally'
  | 'glacier_sled'
  | 'magma_drifter'
  | 'omega_formula';

export type SkinId =
  | 'rookie_blaze'
  | 'shadow_ninja'
  | 'shiba_doge'
  | 'mecha_unit'
  | 'sir_knight'
  | 'astro_nova'
  | 'zorgon_alien'
  | 'rexy_dino'
  | 'captain_skull'
  | 'cyber_cat'
  | 'pharaoh_tut'
  | 'frost_yeti'
  | 'toaster_bot'
  | 'unicorn_spark'
  | 'inferno_imp'
  | 'panda_bam'
  | 'ducksworth'
  | 'king_midas';

export type HatId =
  | 'none'
  | 'royal_crown'
  | 'viking_horns'
  | 'wizard_hat'
  | 'propeller_cap'
  | 'golden_halo'
  | 'cowboy_hat'
  | 'samurai_crest'
  | 'top_hat'
  | 'party_cone';

export type CelebrationId =
  | 'quad_fireworks'
  | 'tesla_overload'
  | 'gold_geyser'
  | 'matrix_pillars'
  | 'dragon_flames'
  | 'confetti_pop'
  | 'solar_nova'
  | 'frost_shatter';

export type PaintFinishId = 'gloss' | 'matte' | 'metallic' | 'chrome' | 'gold_leaf' | 'neon_edge';

export type WheelId =
  | 'classic_rubber'
  | 'neon_slicks'
  | 'monster_knobby'
  | 'gold_spokes'
  | 'armored_rollers'
  | 'plasma_turbines';

export type WeaponId =
  | 'homing_rocket'
  | 'twin_minigun'
  | 'landmine'
  | 'lob_grenuke'
  | 'triple_cannon'
  | 'star_shield'
  | 'turbo_flame';

export type GameModeId = 'ffa' | 'teams' | 'crown';
export type BotDifficulty = 'casual' | 'skilled' | 'chaos';

export interface ArenaMapDef {
  id: MapId;
  name: string;
  subtitle: string;
  skyColor: string;
  fogColor: string;
  fogDensity: number;
  sunColor: string;
  hemiSky: string;
  hemiGround: string;
  accentHex: string;
  arenaRadius: number;
  traction: number;
  hazardLabel: string;
}

export interface KartDef {
  id: KartId;
  name: string;
  archetype:
    | 'buggy'
    | 'supercar'
    | 'tank'
    | 'hover'
    | 'monster'
    | 'hotrod'
    | 'cyber'
    | 'dune'
    | 'royal'
    | 'shark'
    | 'voxel'
    | 'jet'
    | 'rally'
    | 'plow'
    | 'forged'
    | 'formula';
  tagline: string;
  defaultColor: string;
  trimColor: string;
  speedStat: number; // 1-10 visual stat, subtle 5% feel difference
  handlingStat: number;
  armorStat: number;
  exhaustCount: 2 | 4;
}

export interface SkinDef {
  id: SkinId;
  name: string;
  category: string;
  primaryColor: string;
  secondaryColor: string;
  visorColor: string;
}

export interface HatDef {
  id: HatId;
  name: string;
  accentColor: string;
}

export interface CelebrationDef {
  id: CelebrationId;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface PaintFinishDef {
  id: PaintFinishId;
  name: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  emissiveBoost: number;
  prizeOnly?: boolean;
}

export interface WheelDef {
  id: WheelId;
  name: string;
  rimColor: string;
  tireColor: string;
  scale: number;
  prizeOnly?: boolean;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  ammoOrDuration: number;
  isDuration?: boolean;
  color: string;
  shortHint: string;
}

export interface PlayerLoadout {
  playerName: string;
  kartId: KartId;
  paintColor: string;
  paintFinish: PaintFinishId;
  wheelId: WheelId;
  skinId: SkinId;
  hatId: HatId;
  celebrationId: CelebrationId;
}

export const PAINT_SWATCHES: { name: string; hex: string }[] = [
  { name: 'Crimson Nitro', hex: '#ef4444' },
  { name: 'Blaze Orange', hex: '#f97316' },
  { name: 'Solar Amber', hex: '#f59e0b' },
  { name: 'Volt Lime', hex: '#84cc16' },
  { name: 'Emerald Drift', hex: '#10b981' },
  { name: 'Turbo Teal', hex: '#14b8a6' },
  { name: 'Electric Cyan', hex: '#06b6d4' },
  { name: 'Cobalt Racer', hex: '#3b82f6' },
  { name: 'Indigo Storm', hex: '#6366f1' },
  { name: 'Royal Violet', hex: '#8b5cf6' },
  { name: 'Hyper Magenta', hex: '#d946ef' },
  { name: 'Coral Strike', hex: '#f43f5e' },
  { name: 'Arctic White', hex: '#f1f5f9' },
  { name: 'Titanium Silver', hex: '#94a3b8' },
  { name: 'Obsidian Carbon', hex: '#1e293b' },
  { name: 'Championship Gold', hex: '#eab308' },
];

export const PAINT_FINISHES: PaintFinishDef[] = [
  { id: 'gloss', name: 'Showroom Gloss', roughness: 0.22, metalness: 0.25, clearcoat: 1.0, emissiveBoost: 0 },
  { id: 'matte', name: 'Tactical Matte', roughness: 0.72, metalness: 0.1, clearcoat: 0.0, emissiveBoost: 0 },
  { id: 'metallic', name: 'Anodized Metal', roughness: 0.25, metalness: 0.82, clearcoat: 0.6, emissiveBoost: 0 },
  { id: 'chrome', name: 'Mirror Chrome', roughness: 0.1, metalness: 0.96, clearcoat: 1.0, emissiveBoost: 0.04, prizeOnly: true },
  { id: 'gold_leaf', name: '24K Gold Alloy', roughness: 0.16, metalness: 0.94, clearcoat: 0.9, emissiveBoost: 0.06, prizeOnly: true },
  { id: 'neon_edge', name: 'Overdrive Glow', roughness: 0.3, metalness: 0.5, clearcoat: 0.8, emissiveBoost: 0.32, prizeOnly: true },
];

export const WHEELS: WheelDef[] = [
  { id: 'classic_rubber', name: 'Street Radial', rimColor: '#e2e8f0', tireColor: '#1e293b', scale: 1.0 },
  { id: 'neon_slicks', name: 'Cyan Drift Slicks', rimColor: '#06b6d4', tireColor: '#0f172a', scale: 1.02 },
  { id: 'monster_knobby', name: 'Off-Road Claws', rimColor: '#f59e0b', tireColor: '#1c1917', scale: 1.22 },
  { id: 'gold_spokes', name: 'Royal Gold Rims', rimColor: '#facc15', tireColor: '#1e293b', scale: 1.04 },
  { id: 'armored_rollers', name: 'Steel Combat Hubs', rimColor: '#64748b', tireColor: '#090d16', scale: 1.1, prizeOnly: true },
  { id: 'plasma_turbines', name: 'Plasma Discs', rimColor: '#ec4899', tireColor: '#0f172a', scale: 1.06, prizeOnly: true },
];

export const MAPS: ArenaMapDef[] = [
  {
    id: 'smash_island',
    name: 'Smash Tropical Island',
    subtitle: 'Lagoon beaches · Volcano jump · Palm groves',
    skyColor: '#38bdf8',
    fogColor: '#7dd3fc',
    fogDensity: 0.0052,
    sunColor: '#fff7ed',
    hemiSky: '#7dd3fc',
    hemiGround: '#d97706',
    accentHex: '#06b6d4',
    arenaRadius: 68,
    traction: 1.0,
    hazardLabel: 'Deep Ocean',
  },
  {
    id: 'magma_foundry',
    name: 'Magma Foundry',
    subtitle: 'Molten caldera · Steel bridges · Basalt ramps',
    skyColor: '#27120b',
    fogColor: '#451a03',
    fogDensity: 0.0065,
    sunColor: '#fdba74',
    hemiSky: '#fb923c',
    hemiGround: '#1c1917',
    accentHex: '#f97316',
    arenaRadius: 66,
    traction: 1.0,
    hazardLabel: 'Molten Lava',
  },
  {
    id: 'skytop_park',
    name: 'Skytop Neon Park',
    subtitle: 'Cloud-sea speedway · Twin crossover · Boost strips',
    skyColor: '#1e1b4b',
    fogColor: '#312e81',
    fogDensity: 0.0055,
    sunColor: '#f0abfc',
    hemiSky: '#818cf8',
    hemiGround: '#0f172a',
    accentHex: '#a855f7',
    arenaRadius: 70,
    traction: 1.04,
    hazardLabel: 'Sky Drop-Off',
  },
  {
    id: 'frostbite_bay',
    name: 'Frostbite Glacier',
    subtitle: 'Frozen ice rink · Glacial ramps · Drift bay',
    skyColor: '#bae6fd',
    fogColor: '#e0f2fe',
    fogDensity: 0.0054,
    sunColor: '#ffffff',
    hemiSky: '#bae6fd',
    hemiGround: '#64748b',
    accentHex: '#38bdf8',
    arenaRadius: 68,
    traction: 0.78,
    hazardLabel: 'Freezing Sea',
  },
  {
    id: 'canyon_bowl',
    name: 'Canyon Derby Bowl',
    subtitle: 'Redstone mesas · Sunken stunt bowl · Dust jumps',
    skyColor: '#fed7aa',
    fogColor: '#fdba74',
    fogDensity: 0.0058,
    sunColor: '#ffedd5',
    hemiSky: '#fdba74',
    hemiGround: '#7c2d12',
    accentHex: '#ea580c',
    arenaRadius: 68,
    traction: 0.96,
    hazardLabel: 'Canyon Gorge',
  },
  {
    id: 'carnival_pier',
    name: 'Boardwalk Pier',
    subtitle: 'Harbor timber deck · Stunt ramps · Bumper ring',
    skyColor: '#60a5fa',
    fogColor: '#93c5fd',
    fogDensity: 0.005,
    sunColor: '#fef08a',
    hemiSky: '#93c5fd',
    hemiGround: '#92400e',
    accentHex: '#ec4899',
    arenaRadius: 66,
    traction: 1.02,
    hazardLabel: 'Harbor Water',
  },
];

export const KARTS: KartDef[] = [
  {
    id: 'classic_buggy',
    name: 'Turbo Buggy',
    archetype: 'buggy',
    tagline: 'Balanced tubular arena classic',
    defaultColor: '#ef4444',
    trimColor: '#f8fafc',
    speedStat: 8,
    handlingStat: 8,
    armorStat: 8,
    exhaustCount: 2,
  },
  {
    id: 'nitro_viper',
    name: 'Nitro Viper',
    archetype: 'supercar',
    tagline: 'Low-slung wedge with high GT wing',
    defaultColor: '#3b82f6',
    trimColor: '#06b6d4',
    speedStat: 9,
    handlingStat: 8,
    armorStat: 7,
    exhaustCount: 4,
  },
  {
    id: 'iron_goliath',
    name: 'Iron Goliath',
    archetype: 'tank',
    tagline: 'Armored hull with heavy steel bullbar',
    defaultColor: '#475569',
    trimColor: '#f59e0b',
    speedStat: 7,
    handlingStat: 7,
    armorStat: 10,
    exhaustCount: 4,
  },
  {
    id: 'hyper_hover',
    name: 'Hyper Hover-X',
    archetype: 'hover',
    tagline: 'Anti-gravity thruster pods & plasma skirt',
    defaultColor: '#06b6d4',
    trimColor: '#f0abfc',
    speedStat: 9,
    handlingStat: 9,
    armorStat: 6,
    exhaustCount: 4,
  },
  {
    id: 'monster_crusher',
    name: 'Monster Crusher',
    archetype: 'monster',
    tagline: 'Lifted pickup frame & roof lightbar',
    defaultColor: '#10b981',
    trimColor: '#facc15',
    speedStat: 7,
    handlingStat: 7,
    armorStat: 10,
    exhaustCount: 4,
  },
  {
    id: 'hotrod_inferno',
    name: 'Hotrod V8',
    archetype: 'hotrod',
    tagline: 'Exposed chrome supercharger & side pipes',
    defaultColor: '#f97316',
    trimColor: '#fde047',
    speedStat: 9,
    handlingStat: 7,
    armorStat: 8,
    exhaustCount: 4,
  },
  {
    id: 'cyber_interceptor',
    name: 'Cyber Interceptor',
    archetype: 'cyber',
    tagline: 'Angular synth-racer with twin tailfins',
    defaultColor: '#8b5cf6',
    trimColor: '#22d3ee',
    speedStat: 9,
    handlingStat: 8,
    armorStat: 7,
    exhaustCount: 4,
  },
  {
    id: 'dune_raider',
    name: 'Dune Sandstorm',
    archetype: 'dune',
    tagline: 'Roll-cage desert rail with rear spare',
    defaultColor: '#eab308',
    trimColor: '#1e293b',
    speedStat: 8,
    handlingStat: 9,
    armorStat: 7,
    exhaustCount: 2,
  },
  {
    id: 'royal_chariot',
    name: 'Royal Chariot',
    archetype: 'royal',
    tagline: 'Ornate gold-trimmed grand roadster',
    defaultColor: '#7e22ce',
    trimColor: '#facc15',
    speedStat: 8,
    handlingStat: 8,
    armorStat: 8,
    exhaustCount: 4,
  },
  {
    id: 'shark_bite',
    name: 'Megalodon Fin',
    archetype: 'shark',
    tagline: 'Predator nosecone & tall dorsal fin',
    defaultColor: '#0284c7',
    trimColor: '#f8fafc',
    speedStat: 9,
    handlingStat: 8,
    armorStat: 7,
    exhaustCount: 2,
  },
  {
    id: 'pixel_roadster',
    name: 'Voxel Runner',
    archetype: 'voxel',
    tagline: 'Stepped retro-blocky arcade chassis',
    defaultColor: '#ec4899',
    trimColor: '#fef08a',
    speedStat: 8,
    handlingStat: 9,
    armorStat: 7,
    exhaustCount: 2,
  },
  {
    id: 'stealth_phantom',
    name: 'Stealth Jet-Kart',
    archetype: 'jet',
    tagline: 'Faceted delta winglets & twin turbines',
    defaultColor: '#1e293b',
    trimColor: '#ef4444',
    speedStat: 10,
    handlingStat: 7,
    armorStat: 7,
    exhaustCount: 4,
  },
  {
    id: 'bumble_rally',
    name: 'Rally Striker',
    archetype: 'rally',
    tagline: 'Agile turbo hatch with hood intake',
    defaultColor: '#facc15',
    trimColor: '#0f172a',
    speedStat: 8,
    handlingStat: 10,
    armorStat: 6,
    exhaustCount: 2,
  },
  {
    id: 'glacier_sled',
    name: 'Arctic Plow-X',
    archetype: 'plow',
    tagline: 'Front snow-ram wedge & cryo canisters',
    defaultColor: '#38bdf8',
    trimColor: '#f8fafc',
    speedStat: 7,
    handlingStat: 8,
    armorStat: 9,
    exhaustCount: 4,
  },
  {
    id: 'magma_drifter',
    name: 'Obsidian Forged',
    archetype: 'forged',
    tagline: 'Volcanic iron plates & glowing vents',
    defaultColor: '#292524',
    trimColor: '#f97316',
    speedStat: 8,
    handlingStat: 7,
    armorStat: 9,
    exhaustCount: 4,
  },
  {
    id: 'omega_formula',
    name: 'Omega Formula',
    archetype: 'formula',
    tagline: 'Open-wheel nosecone, halo & aero wings',
    defaultColor: '#e11d48',
    trimColor: '#f8fafc',
    speedStat: 10,
    handlingStat: 9,
    armorStat: 5,
    exhaustCount: 2,
  },
];

export const SKINS: SkinDef[] = [
  { id: 'rookie_blaze', name: 'Rookie Blaze', category: 'Racer', primaryColor: '#f8fafc', secondaryColor: '#ef4444', visorColor: '#0ea5e9' },
  { id: 'shadow_ninja', name: 'Shadow Ninja', category: 'Stealth', primaryColor: '#1e293b', secondaryColor: '#ef4444', visorColor: '#fde047' },
  { id: 'shiba_doge', name: 'Shiba Doge', category: 'Animal', primaryColor: '#f59e0b', secondaryColor: '#fef3c7', visorColor: '#1e293b' },
  { id: 'mecha_unit', name: 'Mecha Unit-07', category: 'Sci-Fi', primaryColor: '#64748b', secondaryColor: '#0ea5e9', visorColor: '#22d3ee' },
  { id: 'sir_knight', name: 'Sir Reginald', category: 'Fantasy', primaryColor: '#cbd5e1', secondaryColor: '#dc2626', visorColor: '#0f172a' },
  { id: 'astro_nova', name: 'Astro Nova', category: 'Space', primaryColor: '#f1f5f9', secondaryColor: '#2563eb', visorColor: '#f59e0b' },
  { id: 'zorgon_alien', name: 'Zorgon Invader', category: 'Cosmic', primaryColor: '#84cc16', secondaryColor: '#a855f7', visorColor: '#090d16' },
  { id: 'rexy_dino', name: 'Rexy T-Rex', category: 'Beast', primaryColor: '#10b981', secondaryColor: '#f97316', visorColor: '#fef08a' },
  { id: 'captain_skull', name: 'Captain Bones', category: 'Pirate', primaryColor: '#f1f5f9', secondaryColor: '#b91c1c', visorColor: '#090d16' },
  { id: 'cyber_cat', name: 'Neon Kitty', category: 'Animal', primaryColor: '#f472b6', secondaryColor: '#f8fafc', visorColor: '#22d3ee' },
  { id: 'pharaoh_tut', name: 'Golden Pharaoh', category: 'Legend', primaryColor: '#eab308', secondaryColor: '#1d4ed8', visorColor: '#090d16' },
  { id: 'frost_yeti', name: 'Frost Yeti', category: 'Beast', primaryColor: '#e0f2fe', secondaryColor: '#38bdf8', visorColor: '#0f172a' },
  { id: 'toaster_bot', name: 'Toaster Pal', category: 'Quirky', primaryColor: '#cbd5e1', secondaryColor: '#d97706', visorColor: '#22d3ee' },
  { id: 'unicorn_spark', name: 'Unicorn Spark', category: 'Fantasy', primaryColor: '#f8fafc', secondaryColor: '#ec4899', visorColor: '#facc15' },
  { id: 'inferno_imp', name: 'Inferno Demon', category: 'Mythic', primaryColor: '#dc2626', secondaryColor: '#18181b', visorColor: '#fde047' },
  { id: 'panda_bam', name: 'Panda Bam', category: 'Animal', primaryColor: '#f8fafc', secondaryColor: '#0f172a', visorColor: '#0f172a' },
  { id: 'ducksworth', name: 'Sir Ducksworth', category: 'Quirky', primaryColor: '#facc15', secondaryColor: '#f97316', visorColor: '#0f172a' },
  { id: 'king_midas', name: '24K Champion', category: 'Legend', primaryColor: '#facc15', secondaryColor: '#fef08a', visorColor: '#ffffff' },
];

export const HATS: HatDef[] = [
  { id: 'none', name: 'No Hat', accentColor: '#64748b' },
  { id: 'royal_crown', name: 'Royal Crown', accentColor: '#facc15' },
  { id: 'viking_horns', name: 'Viking Helm', accentColor: '#d97706' },
  { id: 'wizard_hat', name: 'Starlight Cone', accentColor: '#6366f1' },
  { id: 'propeller_cap', name: 'Propeller Beanie', accentColor: '#ef4444' },
  { id: 'golden_halo', name: 'Floating Halo', accentColor: '#fde047' },
  { id: 'cowboy_hat', name: 'Sheriff Stetson', accentColor: '#92400e' },
  { id: 'samurai_crest', name: 'Samurai Kabuto', accentColor: '#dc2626' },
  { id: 'top_hat', name: 'Grand Top Hat', accentColor: '#1e293b' },
  { id: 'party_cone', name: 'Festival Cone', accentColor: '#ec4899' },
];

export const CELEBRATIONS: CelebrationDef[] = [
  {
    id: 'quad_fireworks',
    name: 'Exhaust Fireworks',
    description: 'Starburst rockets erupt from your exhaust pipes',
    primaryColor: '#f43f5e',
    secondaryColor: '#facc15',
  },
  {
    id: 'tesla_overload',
    name: 'Tesla Overload',
    description: 'High-voltage electric rings & plasma arcs',
    primaryColor: '#22d3ee',
    secondaryColor: '#818cf8',
  },
  {
    id: 'gold_geyser',
    name: 'Coin & Gem Geyser',
    description: 'Fountain of spinning gold coins & emeralds',
    primaryColor: '#facc15',
    secondaryColor: '#10b981',
  },
  {
    id: 'matrix_pillars',
    name: 'Cyber Matrix',
    description: 'Rising digital data beams & holo cubes',
    primaryColor: '#22c55e',
    secondaryColor: '#86efac',
  },
  {
    id: 'dragon_flames',
    name: 'Dragon Afterburner',
    description: 'Roaring twin fire plumes & ember vortex',
    primaryColor: '#f97316',
    secondaryColor: '#ef4444',
  },
  {
    id: 'confetti_pop',
    name: 'Confetti Star Pop',
    description: 'Rainbow streamers & rising victory stars',
    primaryColor: '#ec4899',
    secondaryColor: '#38bdf8',
  },
  {
    id: 'solar_nova',
    name: 'Solar Supernova',
    description: 'Expanding golden shockwaves & sun orbs',
    primaryColor: '#f59e0b',
    secondaryColor: '#fef08a',
  },
  {
    id: 'frost_shatter',
    name: 'Cryo Crystal Burst',
    description: 'Shattering diamond ice shards & snow spirals',
    primaryColor: '#38bdf8',
    secondaryColor: '#f0f9ff',
  },
];

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  homing_rocket: {
    id: 'homing_rocket',
    name: 'Homing Missile',
    ammoOrDuration: 1,
    color: '#ef4444',
    shortHint: 'Locks onto rivals ahead',
  },
  twin_minigun: {
    id: 'twin_minigun',
    name: 'Twin Minigun',
    ammoOrDuration: 3.6,
    isDuration: true,
    color: '#f59e0b',
    shortHint: 'Rapid-fire bullet storm',
  },
  landmine: {
    id: 'landmine',
    name: 'Proximity Mines',
    ammoOrDuration: 2,
    color: '#f43f5e',
    shortHint: 'Drop explosive traps behind',
  },
  lob_grenuke: {
    id: 'lob_grenuke',
    name: 'Lob-Grenuke',
    ammoOrDuration: 1,
    color: '#a855f7',
    shortHint: 'Arcing mega-blast warhead',
  },
  triple_cannon: {
    id: 'triple_cannon',
    name: 'Triple Cannonballs',
    ammoOrDuration: 1,
    color: '#64748b',
    shortHint: '3-way ricochet iron spread',
  },
  star_shield: {
    id: 'star_shield',
    name: 'Electro Invincibility',
    ammoOrDuration: 5.0,
    isDuration: true,
    color: '#eab308',
    shortHint: 'Deflect all hits & ram to Smash!',
  },
  turbo_flame: {
    id: 'turbo_flame',
    name: 'Nitro Flame Trail',
    ammoOrDuration: 2.8,
    isDuration: true,
    color: '#06b6d4',
    shortHint: 'Hyper speed + scorching trail',
  },
};

export const BOT_NAMES: string[] = [
  'NitroRex',
  'DriftQueen',
  'PixelToast',
  'BlazeWolf',
  'TurboDoge',
  'Vortex99',
  'ApexViper',
  'StarCrusher',
  'ShadowFox',
  'CaptainBoom',
  'HyperNova',
  'FrostByte',
  'KingCobra',
  'RocketPug',
  'CyberKnight',
  'MekaZord',
  'SparkUnicorn',
  'LavaBaron',
];

export const DEFAULT_LOADOUT: PlayerLoadout = {
  playerName: 'You',
  kartId: 'nitro_viper',
  paintColor: '#ef4444',
  paintFinish: 'gloss',
  wheelId: 'neon_slicks',
  skinId: 'shiba_doge',
  hatId: 'royal_crown',
  celebrationId: 'quad_fireworks',
};
