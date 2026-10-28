import React from 'react';
import { Pause, Volume2, VolumeX, RotateCcw, Home, Play, Sparkles, ArrowRight } from 'lucide-react';
import { GameModeId, MAPS, MapId, WEAPONS } from '../game/catalog';
import { CameraPreset, HudSnapshot, LeaderboardEntry } from '../game/engine';
import { CoinSvg, CrownSvg, WeaponSvgIcon } from './GameIcons';

interface BattleHudProps {
  hud: HudSnapshot;
  mode: GameModeId;
  mapId: MapId;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onResume: () => void;
  onRestart: () => void;
  onExitToLobby: () => void;
  onNextMap: () => void;
  cameraPreset: CameraPreset;
  onChangeCameraPreset: (p: CameraPreset) => void;
  onVirtualInput: (patch: { forward?: number; steer?: number; drift?: boolean; firePressed?: boolean }) => void;
  onTriggerCelebration: () => void;
  podiumResults: {
    leaderboard: LeaderboardEntry[];
    playerRank: number;
    coinsEarned: number;
    xpEarned: number;
    redTeamScore: number;
    blueTeamScore: number;
  } | null;
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export const BattleHud: React.FC<BattleHudProps> = ({
  hud,
  mode,
  mapId,
  muted,
  onToggleMute,
  onPause,
  onResume,
  onRestart,
  onExitToLobby,
  onNextMap,
  cameraPreset,
  onChangeCameraPreset,
  onVirtualInput,
  onTriggerCelebration,
  podiumResults,
}) => {
  const mapDef = MAPS.find((m) => m.id === mapId) || MAPS[0];
  const displayWeaponId = hud.rouletteSpinning ? hud.roulettePreviewId : hud.weaponId;
  const activeWeaponDef = displayWeaponId ? WEAPONS[displayWeaponId] : null;
  const hpPercent = Math.max(0, Math.min(100, (hud.playerHp / Math.max(1, hud.playerMaxHp)) * 100));

  // Championship Podium Overlay (Stage === 'podium')
  if (hud.stage === 'podium' && podiumResults) {
    const teamWinner =
      mode === 'teams'
        ? podiumResults.redTeamScore > podiumResults.blueTeamScore
          ? 'Red Squad Victory'
          : podiumResults.blueTeamScore > podiumResults.redTeamScore
            ? 'Blue Squad Victory'
            : 'Squad Tie Match'
        : null;

    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6">
        {/* Top Banner leaving center 3D Podium completely unobstructed */}
        <div className="mx-auto flex flex-col items-center text-center bg-[#0b101d]/92 border border-white/14 rounded-2xl px-7 py-3.5 shadow-2xl">
          <div className="text-xs font-semibold text-amber-300">
            {mapDef.name} <span className="text-slate-500">·</span> Match Complete
          </div>
          <h2 className="font-[Outfit] text-2xl sm:text-3xl font-black text-white mt-0.5">
            {teamWinner
              ? teamWinner
              : podiumResults.playerRank === 1
                ? '1st Place Arena Champion!'
                : `Finished #${podiumResults.playerRank} Overall`}
          </h2>
          <div className="mt-1.5 flex items-center gap-4 text-xs font-bold tabular-nums">
            <span className="flex items-center gap-1.5 text-amber-300">
              <CoinSvg className="w-4 h-4" /> +{podiumResults.coinsEarned} Coins
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-sky-300">+{podiumResults.xpEarned} XP</span>
          </div>
        </div>

        {/* Bottom Compact Standings & Action Dock */}
        <div className="pointer-events-auto mx-auto w-full max-w-[820px] rounded-2xl bg-[#0b101d]/94 border border-white/14 p-4 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-7 max-h-36 overflow-y-auto garage-scroll pr-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="py-1 text-left font-medium">#</th>
                    <th className="py-1 text-left font-medium">Driver</th>
                    <th className="py-1 text-right font-medium">Smashes</th>
                    <th className="py-1 text-right font-medium">{mode === 'crown' ? 'Score' : 'Deaths'}</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {podiumResults.leaderboard.slice(0, 8).map((row, idx) => (
                    <tr
                      key={row.id}
                      className={`border-b border-white/5 ${
                        row.isPlayer ? 'text-amber-300 font-bold' : 'text-slate-200'
                      }`}
                    >
                      <td className="py-1 pr-2">{idx + 1}</td>
                      <td className="py-1 flex items-center gap-1.5">
                        {row.team !== 'none' && (
                          <span
                            className="w-2 h-2 rounded-xs shrink-0"
                            style={{ backgroundColor: row.team === 'red' ? '#ef4444' : '#3b82f6' }}
                          />
                        )}
                        <span className="truncate max-w-[140px]">{row.name}</span>
                        {idx === 0 && <CrownSvg className="w-3.5 h-3.5 shrink-0" />}
                      </td>
                      <td className="py-1 text-right">{row.smashes}</td>
                      <td className="py-1 text-right">{mode === 'crown' ? row.score : row.deaths}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:col-span-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={onRestart}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 py-2.5 px-4 font-[Outfit] text-sm font-extrabold text-slate-950 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Play Again (Enter)</span>
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onNextMap}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 py-2 px-3 text-xs font-bold text-slate-950 whitespace-nowrap cursor-pointer"
                >
                  <span>Next Arena</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={onExitToLobby}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 py-2 px-3 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Garage</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden">
      {/* World-Space Rival Name & HP Projections */}
      {hud.worldLabels.map((lbl) => (
        <div
          key={lbl.id}
          className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
          style={{ left: `${lbl.x}px`, top: `${lbl.y}px` }}
        >
          <div className="flex items-center gap-1 text-[11px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] whitespace-nowrap">
            {lbl.hasCrown && <CrownSvg className="w-3.5 h-3.5" />}
            <span
              className={
                lbl.team === 'red' ? 'text-rose-300' : lbl.team === 'blue' ? 'text-sky-300' : 'text-white'
              }
            >
              {lbl.name}
            </span>
          </div>
          <div className="mt-0.5 h-1.5 w-12 rounded-full bg-slate-950/90 border border-white/20 overflow-hidden">
            <div
              className="h-full"
              style={{
                width: `${Math.round(lbl.hpRatio * 100)}%`,
                backgroundColor:
                  lbl.team === 'blue' ? '#38bdf8' : lbl.hpRatio > 0.45 ? '#22c55e' : '#ef4444',
              }}
            />
          </div>
        </div>
      ))}

      {/* TOP PERIMETER CLUSTER */}
      <div className="flex items-start justify-between gap-3 p-3.5 sm:p-5">
        {/* Top-Left: Controls & Compact Smash Kill-Feed */}
        <div className="flex flex-col gap-2 max-w-[270px]">
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onPause}
              aria-label="Pause Match"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b101d]/90 border border-white/14 text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b101d]/90 border border-white/14 text-slate-200 hover:bg-slate-800 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
            </button>
            <span className="hidden sm:inline text-xs font-semibold text-slate-300 bg-[#0b101d]/85 border border-white/10 rounded-lg px-2.5 py-1.5 whitespace-nowrap">
              {mapDef.name}
            </span>
          </div>

          {hud.killFeed.length > 0 && (
            <div className="flex flex-col gap-1">
              {hud.killFeed.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-[#0b101d]/86 border border-white/10 px-2.5 py-1 text-[11px] text-slate-200 whitespace-nowrap truncate"
                >
                  <span className={item.killerIsPlayer ? 'font-bold text-amber-300' : 'font-semibold text-white'}>
                    {item.killerName}
                  </span>
                  <span className="text-slate-400"> · {item.weaponLabel} · </span>
                  <span className={item.victimIsPlayer ? 'font-bold text-rose-400' : 'font-semibold text-slate-200'}>
                    {item.victimName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top-Center: Match Clock, Mode Score & Kill-Streak Callout */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-4 rounded-xl bg-[#0b101d]/92 border border-white/14 px-4 py-2 shadow-lg">
            {mode === 'teams' && (
              <div className="text-sm font-extrabold text-rose-400 tabular-nums">
                RED {hud.redTeamScore}
              </div>
            )}

            <div className="font-mono text-xl font-bold tracking-tight text-white tabular-nums">
              {formatClock(hud.timeRemaining)}
            </div>

            {mode === 'teams' ? (
              <div className="text-sm font-extrabold text-sky-400 tabular-nums">
                {hud.blueTeamScore} BLUE
              </div>
            ) : mode === 'crown' ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 whitespace-nowrap">
                <CrownSvg className="w-4 h-4" />
                <span>{hud.crownHolderName || 'Loose'}</span>
              </div>
            ) : (
              <div className="text-xs font-bold text-amber-300 tabular-nums whitespace-nowrap">
                {hud.smashes} Smashes
              </div>
            )}
          </div>

          {hud.streakBanner && (
            <div className="rounded-xl bg-amber-400 px-4 py-1 font-[Outfit] text-sm font-black tracking-wide text-slate-950 shadow-xl">
              {hud.streakBanner}
            </div>
          )}
        </div>

        {/* Top-Right: Compact Top-5 Live Standings */}
        <div className="hidden sm:flex flex-col rounded-xl bg-[#0b101d]/88 border border-white/12 px-3 py-2 min-w-[175px]">
          <div className="text-[11px] font-semibold text-slate-400 pb-1 border-b border-white/10">
            Arena Leaders
          </div>
          <div className="mt-1 flex flex-col gap-0.5 tabular-nums text-xs">
            {hud.leaderboard.slice(0, 5).map((entry, i) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between gap-2 ${
                  entry.isPlayer ? 'text-amber-300 font-bold' : 'text-slate-200'
                }`}
              >
                <span className="truncate max-w-[115px] flex items-center gap-1">
                  <span className="text-slate-500">{i + 1}.</span> {entry.name}
                  {entry.hasCrown && <CrownSvg className="w-3 h-3 shrink-0" />}
                </span>
                <span>{entry.score}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Respawn Center Notice when Smashed */}
      {hud.respawnTimer > 0 && (
        <div className="fixed inset-x-0 top-1/3 flex justify-center">
          <div className="rounded-2xl bg-[#0b101d]/94 border border-rose-500/40 px-6 py-3 text-center shadow-2xl">
            <div className="font-[Outfit] text-xl font-black text-rose-400">KART SMASHED!</div>
            <div className="mt-0.5 text-xs font-semibold text-slate-200 tabular-nums">
              Respawning in {hud.respawnTimer.toFixed(1)}s
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM PERIMETER CLUSTER */}
      <div className="fixed inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5 sm:p-5">
        {/* Bottom-Left: Armor HP, Speedometer & Drift Charge */}
        <div className="flex flex-col gap-2 rounded-xl bg-[#0b101d]/90 border border-white/14 px-3.5 py-2.5 min-w-[180px]">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-[Outfit] text-2xl font-black text-white tabular-nums">
              {hud.speedKmh} <span className="text-xs font-semibold text-slate-400">KM/H</span>
            </span>
            <span className="text-xs font-bold text-emerald-400 tabular-nums">
              {hud.playerHp} HP
            </span>
          </div>

          <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full transition-all duration-100"
              style={{
                width: `${hpPercent}%`,
                backgroundColor: hpPercent > 50 ? '#10b981' : hpPercent > 25 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Drift Boost</span>
            <div className="h-1.5 w-24 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-sky-400"
                style={{ width: `${Math.round(hud.driftCharge * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Bottom-Center: '?' Mystery Weapon Slot */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => onVirtualInput({ firePressed: true })}
            className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-[#0b101d]/94 border-2 px-4 py-2.5 shadow-xl cursor-pointer transition-transform active:scale-95"
            style={{
              borderColor: activeWeaponDef ? activeWeaponDef.color : 'rgba(255,255,255,0.16)',
            }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 border border-white/10">
              <WeaponSvgIcon weaponId={displayWeaponId} className="w-9 h-9" />
            </div>

            <div className="text-left min-w-[130px]">
              <div className="text-xs font-bold text-white">
                {hud.rouletteSpinning
                  ? 'Rolling ? Crate...'
                  : activeWeaponDef
                    ? activeWeaponDef.name
                    : 'Drive into ? Box'}
              </div>
              <div className="text-[11px] text-slate-400">
                {activeWeaponDef ? activeWeaponDef.shortHint : 'Collect a weapon crate'}
              </div>
              {activeWeaponDef && !hud.rouletteSpinning && (
                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.min(100, Math.round((hud.weaponAmmoOrTime / Math.max(0.1, hud.weaponMaxAmmoOrTime)) * 100))}%`,
                      backgroundColor: activeWeaponDef.color,
                    }}
                  />
                </div>
              )}
            </div>
          </button>

          <div className="hidden md:block text-[11px] text-slate-300 bg-[#0b101d]/80 px-2.5 py-0.5 rounded-md border border-white/10 whitespace-nowrap">
            Space / Click Fire · Shift Drift · C Celebrate · Esc Pause
          </div>
        </div>

        {/* Bottom-Right: Quick Celebrate Button + Touch Steering/Throttle Pad on smaller viewports */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onTriggerCelebration}
            title="Trigger Kart Celebration (C)"
            className="flex items-center gap-1.5 rounded-xl bg-[#0b101d]/90 border border-amber-400/35 px-3 py-2.5 text-xs font-bold text-amber-300 hover:bg-slate-800 whitespace-nowrap cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">Celebrate (C)</span>
          </button>

          {/* Touch-friendly mini controls on mobile/tablet */}
          <div className="flex md:hidden items-center gap-1">
            <button
              type="button"
              onPointerDown={() => onVirtualInput({ steer: 1 })}
              onPointerUp={() => onVirtualInput({ steer: 0 })}
              onPointerLeave={() => onVirtualInput({ steer: 0 })}
              className="h-11 w-11 rounded-xl bg-[#0b101d]/90 border border-white/15 text-sm font-bold text-white"
            >
              ◀
            </button>
            <button
              type="button"
              onPointerDown={() => onVirtualInput({ forward: 1 })}
              onPointerUp={() => onVirtualInput({ forward: 0 })}
              onPointerLeave={() => onVirtualInput({ forward: 0 })}
              className="h-11 px-3 rounded-xl bg-emerald-500 text-xs font-extrabold text-slate-950"
            >
              GAS
            </button>
            <button
              type="button"
              onPointerDown={() => onVirtualInput({ steer: -1 })}
              onPointerUp={() => onVirtualInput({ steer: 0 })}
              onPointerLeave={() => onVirtualInput({ steer: 0 })}
              className="h-11 w-11 rounded-xl bg-[#0b101d]/90 border border-white/15 text-sm font-bold text-white"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* PAUSE MODAL */}
      {hud.stage === 'paused' && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0b101d] border border-white/15 p-6 shadow-2xl">
            <h2 className="font-[Outfit] text-2xl font-black text-white">Match Paused</h2>
            <p className="mt-1 text-xs text-slate-400">
              {mapDef.name} · {formatClock(hud.timeRemaining)} remaining
            </p>

            {/* Camera Angle Selector */}
            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-300 mb-1.5">Chase Camera Distance</div>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-white/10">
                {(['close', 'standard', 'wide'] as CameraPreset[]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onChangeCameraPreset(preset)}
                    className={`py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                      cameraPreset === preset
                        ? 'bg-sky-400 text-slate-950 font-bold'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="flex items-center justify-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 py-2.5 text-sm font-extrabold text-slate-950 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Resume Match (Esc)</span>
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/12 py-2.5 text-xs font-semibold text-white cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Restart Match</span>
              </button>
              <button
                type="button"
                onClick={onExitToLobby}
                className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 py-2.5 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Return to Garage</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
