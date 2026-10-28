import React, { useState } from 'react';
import { Volume2, VolumeX, Play, Sparkles, ChevronDown, ChevronUp, Gift, Check } from 'lucide-react';
import {
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
  PAINT_FINISHES,
  PAINT_SWATCHES,
  PaintFinishId,
  PlayerLoadout,
  SKINS,
  SkinId,
  WHEELS,
  WheelId,
} from '../game/catalog';
import { CoinSvg, TitleLogoSvg } from './GameIcons';
import { sound } from '../game/audio';

type DockTab = 'play' | 'karts' | 'skins' | 'celebrations' | 'prize';

interface LobbyOverlayProps {
  mapId: MapId;
  onSelectMap: (id: MapId) => void;
  mode: GameModeId;
  onSelectMode: (m: GameModeId) => void;
  lobbySize: 8 | 12 | 16;
  onSelectLobbySize: (s: 8 | 12 | 16) => void;
  botDifficulty: BotDifficulty;
  onSelectDifficulty: (d: BotDifficulty) => void;
  loadout: PlayerLoadout;
  onUpdateLoadout: (patch: Partial<PlayerLoadout>) => void;
  coins: number;
  xp: number;
  unlockedPrizeIds: string[];
  onSpinPrizeMachine: () => { itemLabel: string; alreadyOwned: boolean } | null;
  onUnlockAllPrizes: () => void;
  onTestCelebration: () => void;
  onStartMatch: () => void;
  muted: boolean;
  onToggleMute: () => void;
  dockCollapsed: boolean;
  onToggleDock: () => void;
}

export const LobbyOverlay: React.FC<LobbyOverlayProps> = ({
  mapId,
  onSelectMap,
  mode,
  onSelectMode,
  lobbySize,
  onSelectLobbySize,
  botDifficulty,
  onSelectDifficulty,
  loadout,
  onUpdateLoadout,
  coins,
  xp,
  unlockedPrizeIds,
  onSpinPrizeMachine,
  onUnlockAllPrizes,
  onTestCelebration,
  onStartMatch,
  muted,
  onToggleMute,
  dockCollapsed,
  onToggleDock,
}) => {
  const [activeTab, setActiveTab] = useState<DockTab>('play');
  const [prizeBanner, setPrizeBanner] = useState<string | null>(null);

  const playerLevel = Math.floor(xp / 300) + 1;
  const levelProgress = Math.round(((xp % 300) / 300) * 100);
  const currentMap = MAPS.find((m) => m.id === mapId) || MAPS[0];
  const currentKart = KARTS.find((k) => k.id === loadout.kartId) || KARTS[0];
  const currentSkin = SKINS.find((s) => s.id === loadout.skinId) || SKINS[0];

  const handleTabClick = (t: DockTab) => {
    sound.playUiClick();
    setActiveTab(t);
    if (dockCollapsed) onToggleDock();
  };

  const handlePrizeClick = () => {
    const res = onSpinPrizeMachine();
    if (!res) {
      setPrizeBanner('Need 150 Coins — Play a match to earn more!');
    } else if (res.alreadyOwned) {
      setPrizeBanner(`Duplicate ${res.itemLabel} — +75 Bonus XP awarded!`);
    } else {
      setPrizeBanner(`Unlocked ${res.itemLabel}!`);
    }
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Perimeter Bar: Title Lockup Left + Player Progression & Start CTA Right */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="pointer-events-auto flex flex-col gap-1.5">
          <TitleLogoSvg className="h-14 sm:h-16 w-auto drop-shadow" />
          <div className="flex items-center gap-2 text-xs text-slate-200 bg-[#0b101d]/88 border border-white/12 rounded-lg px-3 py-1.5 w-fit">
            <span className="font-semibold text-amber-300">{currentKart.name}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span>{currentSkin.name}</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-sky-300">{currentMap.name}</span>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-3">
          {/* Player Level & Coins Readout */}
          <div className="flex items-center gap-4 bg-[#0b101d]/90 border border-white/12 rounded-xl px-3.5 py-2">
            <div>
              <div className="text-xs font-semibold text-slate-300 tabular-nums">
                Level {playerLevel} <span className="text-slate-500">·</span> {xp} XP
              </div>
              <div className="mt-1 h-1.5 w-24 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-sky-400" style={{ width: `${levelProgress}%` }} />
              </div>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-1.5 text-sm font-bold text-amber-300 tabular-nums">
              <CoinSvg className="w-4 h-4 shrink-0" />
              <span>{coins.toLocaleString()}</span>
            </div>
          </div>

          {/* Audio Toggle */}
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b101d]/90 border border-white/12 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5 text-sky-400" />}
          </button>

          {/* Primary Play Action */}
          <button
            type="button"
            onClick={onStartMatch}
            className="flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-98 px-5 py-2.5 font-[Outfit] text-base font-extrabold tracking-wide text-slate-950 shadow-lg transition-transform whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>Start Match</span>
          </button>
        </div>
      </div>

      {/* Center 3D Viewport stays 100% unobstructed so user can drag/admire the 3D Kart + Arena */}

      {/* Unified Collapsible Bottom Control Dock */}
      <div className="mx-auto w-full max-w-[940px] flex flex-col items-center">
        {/* Collapse / Expand Drawer Handle + Flat Single-Line Control Hint */}
        <div className="pointer-events-auto mb-1.5 flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleDock}
            className="flex items-center gap-1.5 rounded-lg bg-[#0b101d]/90 border border-white/14 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{dockCollapsed ? 'Show Garage & Maps (H)' : 'Hide Dock (H)'}</span>
          </button>

          <button
            type="button"
            onClick={onTestCelebration}
            className="flex items-center gap-1.5 rounded-lg bg-[#0b101d]/90 border border-amber-400/35 px-3 py-1 text-xs font-semibold text-amber-300 hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Celebration (C)</span>
          </button>

          <span className="hidden md:inline text-xs text-slate-200 bg-[#0b101d]/80 rounded-lg px-3 py-1 border border-white/10 whitespace-nowrap">
            WASD / Arrows Drive · Shift Drift · Space Fire Weapon · Drag Kart to Rotate
          </span>
        </div>

        {!dockCollapsed && (
          <div className="pointer-events-auto w-full rounded-2xl bg-[#0b101d]/94 border border-white/14 p-4 shadow-2xl">
            {/* Segmented Tab Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
              <div className="flex flex-wrap items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-white/8">
                {(
                  [
                    ['play', `Maps & Match (${MAPS.length})`],
                    ['karts', `Karts & Paint (${KARTS.length})`],
                    ['skins', `Skins & Hats (${SKINS.length})`],
                    ['celebrations', `Celebrations (${CELEBRATIONS.length})`],
                    ['prize', 'Prize Machine'],
                  ] as [DockTab, string][]
                ).map(([tabKey, label]) => (
                  <button
                    key={tabKey}
                    type="button"
                    onClick={() => handleTabClick(tabKey)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeTab === tabKey
                        ? 'bg-sky-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Driver Call-Sign Input */}
              <div className="flex items-center gap-2">
                <label htmlFor="driver-name" className="text-xs text-slate-400 whitespace-nowrap">
                  Driver Name
                </label>
                <input
                  id="driver-name"
                  type="text"
                  maxLength={14}
                  value={loadout.playerName}
                  onChange={(e) => onUpdateLoadout({ playerName: e.target.value })}
                  className="w-32 rounded-lg bg-slate-900 border border-white/15 px-2.5 py-1 text-xs font-semibold text-white focus:outline-none focus:border-sky-400"
                />
              </div>
            </div>

            {/* TAB 1: MAPS & MATCH SETUP */}
            {activeTab === 'play' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                {/* 6 Arena Selector Cards */}
                <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-44 overflow-y-auto garage-scroll pr-1">
                  {MAPS.map((m) => {
                    const selected = m.id === mapId;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          sound.playUiClick();
                          onSelectMap(m.id);
                        }}
                        className={`text-left rounded-xl p-2.5 border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-slate-800/95 border-sky-400'
                            : 'bg-slate-900/75 border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white truncate">{m.name}</span>
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: m.accentHex }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">{m.subtitle}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Mode, Lobby Count & Bot Skill */}
                <div className="lg:col-span-5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 whitespace-nowrap">Mode</span>
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-white/10">
                      {(
                        [
                          ['ffa', 'Free For All'],
                          ['teams', 'Teams'],
                          ['crown', 'Crown Rush'],
                        ] as [GameModeId, string][]
                      ).map(([mId, mLabel]) => (
                        <button
                          key={mId}
                          type="button"
                          onClick={() => {
                            sound.playUiClick();
                            onSelectMode(mId);
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                            mode === mId ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {mLabel}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 whitespace-nowrap">Lobby Size</span>
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-white/10">
                      {([8, 12, 16] as const).map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            sound.playUiClick();
                            onSelectLobbySize(sz);
                          }}
                          className={`px-3 py-1 rounded-md text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 cursor-pointer ${
                            lobbySize === sz ? 'bg-sky-400 text-slate-950 font-bold' : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {sz} Karts
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 whitespace-nowrap">Bot AI</span>
                    <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-white/10">
                      {(
                        [
                          ['casual', 'Casual'],
                          ['skilled', 'Skilled'],
                          ['chaos', 'Chaos'],
                        ] as [BotDifficulty, string][]
                      ).map(([dId, dLabel]) => (
                        <button
                          key={dId}
                          type="button"
                          onClick={() => {
                            sound.playUiClick();
                            onSelectDifficulty(dId);
                          }}
                          className={`px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                            botDifficulty === dId
                              ? 'bg-emerald-400 text-slate-950 font-bold'
                              : 'text-slate-300 hover:text-white'
                          }`}
                        >
                          {dLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: 16 KARTS, 16 PAINTS, 6 FINISHES & 6 WHEELS */}
            {activeTab === 'karts' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-44 overflow-y-auto garage-scroll pr-1">
                  {KARTS.map((k) => {
                    const selected = k.id === loadout.kartId;
                    return (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => {
                          sound.playUiClick();
                          onUpdateLoadout({ kartId: k.id });
                        }}
                        className={`text-left rounded-xl p-2 border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-slate-800 border-amber-400'
                            : 'bg-slate-900/75 border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="text-xs font-bold text-white truncate">{k.name}</div>
                        <div className="mt-1 text-[11px] text-slate-400 tabular-nums">
                          Spd {k.speedStat} · Hnd {k.handlingStat} · Arm {k.armorStat}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="lg:col-span-5 flex flex-col gap-2.5 justify-between">
                  {/* Paint Swatches */}
                  <div>
                    <div className="text-xs text-slate-400 mb-1.5">Body Paint Color</div>
                    <div className="grid grid-cols-8 gap-1.5">
                      {PAINT_SWATCHES.map((sw) => (
                        <button
                          key={sw.hex}
                          type="button"
                          title={sw.name}
                          onClick={() => {
                            sound.playUiClick();
                            onUpdateLoadout({ paintColor: sw.hex });
                          }}
                          className={`h-6 rounded-md border transition-transform cursor-pointer ${
                            loadout.paintColor === sw.hex ? 'border-white scale-110' : 'border-white/20 hover:scale-105'
                          }`}
                          style={{ backgroundColor: sw.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Finish & Wheels */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {PAINT_FINISHES.map((f) => {
                      const locked = f.prizeOnly && !unlockedPrizeIds.includes(`finish_${f.id}`);
                      const selected = loadout.paintFinish === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            sound.playUiClick();
                            onUpdateLoadout({ paintFinish: f.id as PaintFinishId });
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold border whitespace-nowrap shrink-0 ${
                            selected
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold cursor-pointer'
                              : locked
                                ? 'bg-slate-900/40 text-slate-500 border-white/5 cursor-not-allowed'
                                : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white cursor-pointer'
                          }`}
                        >
                          {f.name} {locked ? '(Prize)' : ''}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {WHEELS.map((w) => {
                      const locked = w.prizeOnly && !unlockedPrizeIds.includes(`wheel_${w.id}`);
                      const selected = loadout.wheelId === w.id;
                      return (
                        <button
                          key={w.id}
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            sound.playUiClick();
                            onUpdateLoadout({ wheelId: w.id as WheelId });
                          }}
                          className={`px-2 py-1 rounded-md text-[11px] font-semibold border whitespace-nowrap shrink-0 ${
                            selected
                              ? 'bg-sky-400 text-slate-950 border-sky-300 font-bold cursor-pointer'
                              : locked
                                ? 'bg-slate-900/40 text-slate-500 border-white/5 cursor-not-allowed'
                                : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white cursor-pointer'
                          }`}
                        >
                          {w.name} {locked ? '(Prize)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: 18 DRIVER SKINS + 10 HATS */}
            {activeTab === 'skins' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8 grid grid-cols-3 sm:grid-cols-6 gap-2 max-h-44 overflow-y-auto garage-scroll pr-1">
                  {SKINS.map((sk) => {
                    const selected = sk.id === loadout.skinId;
                    return (
                      <button
                        key={sk.id}
                        type="button"
                        onClick={() => {
                          sound.playUiClick();
                          onUpdateLoadout({ skinId: sk.id as SkinId });
                        }}
                        className={`text-left rounded-xl p-2 border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-slate-800 border-sky-400'
                            : 'bg-slate-900/75 border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-3 h-3 rounded-sm shrink-0 border border-white/25"
                            style={{ backgroundColor: sk.primaryColor }}
                          />
                          <span className="text-xs font-bold text-white truncate">{sk.name}</span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">{sk.category}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="lg:col-span-4">
                  <div className="text-xs text-slate-400 mb-1.5">Driver Hat / Helmet ({HATS.length})</div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto garage-scroll pr-1">
                    {HATS.map((h) => {
                      const selected = h.id === loadout.hatId;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            sound.playUiClick();
                            onUpdateLoadout({ hatId: h.id as HatId });
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left border truncate cursor-pointer ${
                            selected
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                              : 'bg-slate-900 text-slate-300 border-white/10 hover:text-white'
                          }`}
                        >
                          {h.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: 8 KILL-STREAK & VICTORY CELEBRATIONS */}
            {activeTab === 'celebrations' && (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto garage-scroll pr-1">
                  {CELEBRATIONS.map((cel) => {
                    const selected = cel.id === loadout.celebrationId;
                    return (
                      <button
                        key={cel.id}
                        type="button"
                        onClick={() => {
                          onUpdateLoadout({ celebrationId: cel.id as CelebrationId });
                          onTestCelebration();
                        }}
                        className={`text-left rounded-xl p-2.5 border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-slate-800 border-amber-400'
                            : 'bg-slate-900/75 border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white truncate">{cel.name}</span>
                          <span
                            className="w-2.5 h-2.5 rounded-sm shrink-0"
                            style={{ backgroundColor: cel.primaryColor }}
                          />
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">{cel.description}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Celebrations erupt from your kart exhausts on Smashes, Kill Streaks, Victory Podiums, or pressing C.</span>
                  <button
                    type="button"
                    onClick={onTestCelebration}
                    className="px-3 py-1.5 rounded-lg bg-amber-400 text-slate-950 font-bold whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Fire Celebration Now
                  </button>
                </div>
              </div>
            )}

            {/* TAB 5: PRIZE CAPSULE MACHINE */}
            {activeTab === 'prize' && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 border border-amber-400/35 text-amber-300">
                    <Gift className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Exotic Finish & Rim Prize Capsule</h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      All 16 Karts, 18 Skins, 10 Hats, and 8 Celebrations are ready to play immediately. Spin Capsules (150 Coins) to unlock Mirror Chrome, 24K Gold Alloy, Overdrive Glow, and Plasma Rims!
                    </p>
                    {prizeBanner && (
                      <div className="mt-1.5 text-xs font-semibold text-amber-300">{prizeBanner}</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handlePrizeClick}
                    className="flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 px-4 py-2.5 text-xs font-extrabold text-slate-950 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <CoinSvg className="w-4 h-4" />
                    <span>Spin Capsule (150)</span>
                  </button>

                  {unlockedPrizeIds.length < 5 ? (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playPrizeSpin();
                        onUnlockAllPrizes();
                        setPrizeBanner('All exotic finishes and rims unlocked!');
                      }}
                      className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 px-3.5 py-2.5 text-xs font-semibold text-slate-200 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Unlock All Free
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 whitespace-nowrap">
                      <Check className="w-4 h-4" /> All Unlocked
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
