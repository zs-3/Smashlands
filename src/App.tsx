import { useCallback, useEffect, useRef, useState } from 'react';
import { BattleHud } from './components/BattleHud';
import { LobbyOverlay } from './components/LobbyOverlay';
import { sound } from './game/audio';
import {
  BotDifficulty,
  DEFAULT_LOADOUT,
  GameModeId,
  MAPS,
  MapId,
  PlayerLoadout,
} from './game/catalog';
import { CameraPreset, HudSnapshot, LeaderboardEntry, TurboSmashEngine } from './game/engine';

const PRIZE_POOL: { id: string; label: string }[] = [
  { id: 'finish_chrome', label: 'Mirror Chrome Paint' },
  { id: 'finish_gold_leaf', label: '24K Gold Alloy Paint' },
  { id: 'finish_neon_edge', label: 'Overdrive Glow Paint' },
  { id: 'wheel_armored_rollers', label: 'Steel Combat Hubs' },
  { id: 'wheel_plasma_turbines', label: 'Plasma Turbine Discs' },
];

function loadSavedJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<TurboSmashEngine | null>(null);

  const [mapId, setMapId] = useState<MapId>('smash_island');
  const [mode, setMode] = useState<GameModeId>('ffa');
  const [lobbySize, setLobbySize] = useState<8 | 12 | 16>(12);
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('skilled');
  const [loadout, setLoadout] = useState<PlayerLoadout>(() =>
    loadSavedJson<PlayerLoadout>('turbosmash_loadout', DEFAULT_LOADOUT),
  );

  const [coins, setCoins] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('turbosmash_coins'));
      return Number.isFinite(v) && v >= 0 && localStorage.getItem('turbosmash_coins') !== null ? v : 1200;
    } catch {
      return 1200;
    }
  });

  const [xp, setXp] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem('turbosmash_xp'));
      return Number.isFinite(v) && v >= 0 ? v : 0;
    } catch {
      return 0;
    }
  });

  const [unlockedPrizeIds, setUnlockedPrizeIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('turbosmash_prizes');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [muted, setMuted] = useState<boolean>(() => sound.isMuted());
  const [dockCollapsed, setDockCollapsed] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('standard');

  const [hud, setHud] = useState<HudSnapshot>({
    stage: 'lobby',
    timeRemaining: 180,
    playerHp: 100,
    playerMaxHp: 100,
    speedKmh: 0,
    driftCharge: 0,
    respawnTimer: 0,
    weaponId: null,
    weaponAmmoOrTime: 0,
    weaponMaxAmmoOrTime: 1,
    rouletteSpinning: false,
    roulettePreviewId: null,
    smashes: 0,
    streakCount: 0,
    streakBanner: null,
    redTeamScore: 0,
    blueTeamScore: 0,
    crownHolderName: null,
    leaderboard: [],
    killFeed: [],
    worldLabels: [],
  });

  const [podiumResults, setPodiumResults] = useState<{
    leaderboard: LeaderboardEntry[];
    playerRank: number;
    coinsEarned: number;
    xpEarned: number;
    redTeamScore: number;
    blueTeamScore: number;
  } | null>(null);

  // Persist loadout, coins, xp, and prizes
  useEffect(() => {
    try {
      localStorage.setItem('turbosmash_loadout', JSON.stringify(loadout));
    } catch {
      // Ignore
    }
  }, [loadout]);

  useEffect(() => {
    try {
      localStorage.setItem('turbosmash_coins', String(coins));
      localStorage.setItem('turbosmash_xp', String(xp));
      localStorage.setItem('turbosmash_prizes', JSON.stringify(unlockedPrizeIds));
    } catch {
      // Ignore
    }
  }, [coins, xp, unlockedPrizeIds]);

  // Mount Three.js Engine ONCE inside isolated canvasMountRef
  useEffect(() => {
    if (!canvasMountRef.current) return;

    const engine = new TurboSmashEngine(
      canvasMountRef.current,
      {
        mapId,
        mode,
        lobbySize,
        durationSec: 180,
        botDifficulty,
        loadout,
      },
      (snap) => {
        setHud(snap);
      },
      (results) => {
        setPodiumResults(results);
        setCoins((prev) => prev + results.coinsEarned);
        setXp((prev) => prev + results.xpEarned);
      },
    );

    engineRef.current = engine;
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live update 3D Garage turntable & Arena backdrop whenever map or loadout changes in Lobby
  useEffect(() => {
    if (engineRef.current && hud.stage === 'lobby') {
      engineRef.current.updateLobbyPreview(mapId, loadout);
    }
  }, [mapId, loadout, hud.stage]);

  const handleStartMatch = useCallback(() => {
    if (!engineRef.current) return;
    sound.unlock();
    setPodiumResults(null);
    engineRef.current.startMatch({
      mapId,
      mode,
      lobbySize,
      durationSec: 180,
      botDifficulty,
      loadout,
    });
  }, [mapId, mode, lobbySize, botDifficulty, loadout]);

  const handleNextMapMatch = useCallback(() => {
    const idx = MAPS.findIndex((m) => m.id === mapId);
    const nextMap = MAPS[(idx + 1) % MAPS.length].id;
    setMapId(nextMap);
    if (!engineRef.current) return;
    setPodiumResults(null);
    engineRef.current.startMatch({
      mapId: nextMap,
      mode,
      lobbySize,
      durationSec: 180,
      botDifficulty,
      loadout,
    });
  }, [mapId, mode, lobbySize, botDifficulty, loadout]);

  // Global Lobby / Podium Keyboard Shortcuts ('Enter' to Start / Play Again, 'H' to Toggle Dock)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')
      ) {
        return;
      }
      if (e.code === 'KeyH' && hud.stage === 'lobby') {
        setDockCollapsed((prev) => !prev);
      } else if (e.code === 'Enter') {
        if (hud.stage === 'lobby' || hud.stage === 'podium') {
          handleStartMatch();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hud.stage, handleStartMatch]);

  const handleUpdateLoadout = (patch: Partial<PlayerLoadout>) => {
    setLoadout((prev) => ({ ...prev, ...patch }));
  };

  const handleToggleMute = () => {
    const next = !muted;
    sound.setMuted(next);
    setMuted(next);
  };

  const handleSpinPrizeMachine = () => {
    if (coins < 150) return null;
    sound.playPrizeSpin();
    setCoins((c) => c - 150);

    const lockedPool = PRIZE_POOL.filter((p) => !unlockedPrizeIds.includes(p.id));
    const chosen =
      lockedPool.length > 0
        ? lockedPool[Math.floor(Math.random() * lockedPool.length)]
        : PRIZE_POOL[Math.floor(Math.random() * PRIZE_POOL.length)];

    const alreadyOwned = unlockedPrizeIds.includes(chosen.id);
    if (alreadyOwned) {
      setXp((x) => x + 75);
    } else {
      setUnlockedPrizeIds((prev) => [...prev, chosen.id]);
    }
    return { itemLabel: chosen.label, alreadyOwned };
  };

  const handleUnlockAllPrizes = () => {
    setUnlockedPrizeIds(PRIZE_POOL.map((p) => p.id));
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#090d16]">
      {/* Dedicated Isolated WebGL Canvas Mount (Never re-rendered by React HUD updates) */}
      <div ref={canvasMountRef} className="absolute inset-0 h-full w-full" />

      {hud.stage === 'lobby' ? (
        <LobbyOverlay
          mapId={mapId}
          onSelectMap={setMapId}
          mode={mode}
          onSelectMode={setMode}
          lobbySize={lobbySize}
          onSelectLobbySize={setLobbySize}
          botDifficulty={botDifficulty}
          onSelectDifficulty={setBotDifficulty}
          loadout={loadout}
          onUpdateLoadout={handleUpdateLoadout}
          coins={coins}
          xp={xp}
          unlockedPrizeIds={unlockedPrizeIds}
          onSpinPrizeMachine={handleSpinPrizeMachine}
          onUnlockAllPrizes={handleUnlockAllPrizes}
          onTestCelebration={() => engineRef.current?.triggerLobbyCelebrationPreview()}
          onStartMatch={handleStartMatch}
          muted={muted}
          onToggleMute={handleToggleMute}
          dockCollapsed={dockCollapsed}
          onToggleDock={() => setDockCollapsed((c) => !c)}
        />
      ) : (
        <BattleHud
          hud={hud}
          mode={mode}
          mapId={mapId}
          muted={muted}
          onToggleMute={handleToggleMute}
          onPause={() => engineRef.current?.setPaused(true)}
          onResume={() => engineRef.current?.setPaused(false)}
          onRestart={handleStartMatch}
          onExitToLobby={() => engineRef.current?.enterLobby(loadout, mapId)}
          onNextMap={handleNextMapMatch}
          cameraPreset={cameraPreset}
          onChangeCameraPreset={(p) => {
            setCameraPreset(p);
            engineRef.current?.setCameraPreset(p);
          }}
          onVirtualInput={(patch) => engineRef.current?.setVirtualInput(patch)}
          onTriggerCelebration={() => engineRef.current?.triggerPlayerManualCelebration()}
          podiumResults={podiumResults}
        />
      )}
    </main>
  );
}
