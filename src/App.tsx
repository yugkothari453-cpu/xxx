import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CellPosition,
  Difficulty,
  GameAction,
  GameMode,
  GameState,
  PlayerId,
  Wall,
} from './game/types';
import { applyAction, createInitialGameState } from './game/rules';
import { calculateAiAction } from './game/ai';
import { sound } from './game/audio';
import { onlineClient, RoomConnection } from './game/onlineClient';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { GameBoard } from './components/GameBoard';
import { PlayerDashboard } from './components/PlayerDashboard';
import { GameResultModal } from './components/GameResultModal';
import { OnlineLobbyModal } from './components/OnlineLobbyModal';

type AppScreen = 'home' | 'match';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('home');
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [myPlayerRole, setMyPlayerRole] = useState<PlayerId | null>(null);
  const [onlineConnection, setOnlineConnection] = useState<RoomConnection | null>(null);

  const [showOnlineLobby, setShowOnlineLobby] = useState<boolean>(false);
  const [lobbyInitialMode, setLobbyInitialMode] = useState<'menu' | 'random'>('menu');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(() => sound.getMuted());
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

  const statusTimerRef = useRef<number | null>(null);

  const showStatus = useCallback((msg: string) => {
    setStatusMessage(msg);
    if (statusTimerRef.current) {
      window.clearTimeout(statusTimerRef.current);
    }
    statusTimerRef.current = window.setTimeout(() => {
      setStatusMessage('');
      statusTimerRef.current = null;
    }, 4000);
  }, []);

  // Update document.body.dataset.state for ultra-mode compliance
  useEffect(() => {
    if (screen === 'home') {
      document.body.dataset.state = 'title';
    } else if (gameState.winner) {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [screen, gameState.winner]);

  // Support ?autostart=1 query parameter to jump straight to match, or ?room=CODE
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      startMatch('ai', 'normal');
    } else if (params.get('room')) {
      setShowOnlineLobby(true);
    }
  }, []);

  // Keyboard controls for sound mute
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'm' || e.key === 'M') {
        const nextMute = sound.toggleMute();
        setIsMuted(nextMute);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Start new match
  const startMatch = (mode: GameMode, diff: Difficulty = 'normal') => {
    setGameMode(mode);
    setDifficulty(diff);
    setGameState(createInitialGameState());
    setStatusMessage('');
    setIsAiThinking(false);

    if (mode === 'ai') {
      setMyPlayerRole('blue');
    } else if (mode === 'local') {
      setMyPlayerRole(null);
    }

    setScreen('match');
  };

  // Online Room Ready callback
  const handleRoomReady = (conn: RoomConnection) => {
    setOnlineConnection(conn);
    setGameMode('online');
    setMyPlayerRole(conn.playerRole);
    setGameState(conn.room.gameState);
    setShowOnlineLobby(false);
    setScreen('match');

    // Subscribe to live room updates via SSE
    onlineClient.subscribe(
      conn.room.id,
      (updatedRoom) => {
        setGameState(updatedRoom.gameState);
        if (updatedRoom.gameState.winner) {
          // Finished
        }
      },
      (err) => {
        showStatus(`Online sync error: ${err}`);
      }
    );
  };

  // Handle local pawn move
  const handleMovePawn = (to: CellPosition) => {
    const action: GameAction = {
      type: 'move',
      player: gameState.turn,
      to,
      timestamp: Date.now(),
    };

    if (gameMode === 'online' && onlineConnection) {
      onlineClient.sendAction(onlineConnection.room.id, onlineConnection.playerToken, action).then(() => {
        sound.playPawnMove();
      }).catch((err) => {
        sound.playInvalid();
        showStatus(err.message || 'Move failed');
      });
      return;
    }

    const result = applyAction(gameState, action);
    if (result.valid) {
      sound.playPawnMove();
      setGameState(result.state);
    } else {
      sound.playInvalid();
      showStatus(result.reason || 'Illegal move');
    }
  };

  // Handle wall placement
  const handlePlaceWall = (wall: Wall) => {
    const action: GameAction = {
      type: 'wall',
      player: gameState.turn,
      wall,
      timestamp: Date.now(),
    };

    if (gameMode === 'online' && onlineConnection) {
      onlineClient.sendAction(onlineConnection.room.id, onlineConnection.playerToken, action).then(() => {
        sound.playWallPlacement();
      }).catch((err) => {
        sound.playInvalid();
        showStatus(err.message || 'Wall placement failed');
      });
      return;
    }

    const result = applyAction(gameState, action);
    if (result.valid) {
      sound.playWallPlacement();
      setGameState(result.state);
    } else {
      sound.playInvalid();
      showStatus(result.reason || 'Invalid wall placement');
    }
  };

  // Handle surrender / give up
  const handleGiveUp = () => {
    const action: GameAction = {
      type: 'give_up',
      player: myPlayerRole || gameState.turn,
      timestamp: Date.now(),
    };

    if (gameMode === 'online' && onlineConnection) {
      onlineClient.sendAction(onlineConnection.room.id, onlineConnection.playerToken, action).catch(() => {});
      return;
    }

    const result = applyAction(gameState, action);
    if (result.valid) {
      setGameState(result.state);
    }
  };

  // Return to home
  const handleReturnHome = () => {
    if (gameMode === 'online') {
      onlineClient.unsubscribe();
      setOnlineConnection(null);
    }
    setScreen('home');
    setGameState(createInitialGameState());
  };

  // Trigger AI turn when playing vs Computer
  useEffect(() => {
    if (
      screen === 'match' &&
      gameMode === 'ai' &&
      gameState.turn === 'crimson' &&
      !gameState.winner
    ) {
      setIsAiThinking(true);
      const timer = window.setTimeout(() => {
        setGameState((currentState) => {
          if (currentState.turn !== 'crimson' || currentState.winner) {
            setIsAiThinking(false);
            return currentState;
          }
          const aiAction = calculateAiAction(currentState, difficulty);
          const result = applyAction(currentState, aiAction);
          if (result.valid) {
            if (aiAction.type === 'move') {
              sound.playPawnMove();
            } else if (aiAction.type === 'wall') {
              sound.playWallPlacement();
            }
            setIsAiThinking(false);
            return result.state;
          }
          setIsAiThinking(false);
          return currentState;
        });
      }, 550);

      return () => clearTimeout(timer);
    }
  }, [screen, gameMode, gameState.turn, gameState.winner, difficulty]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950">
      {/* Top Navigation */}
      <Header
        isMuted={isMuted}
        onToggleMute={() => {
          const next = sound.toggleMute();
          setIsMuted(next);
        }}
        showHomeButton={screen === 'match'}
        onReturnHome={handleReturnHome}
        subtitle={
          screen === 'match'
            ? gameMode === 'ai'
              ? `AI Duel · Difficulty: ${difficulty.toUpperCase()}`
              : gameMode === 'local'
              ? 'Local 2-Player Pass & Play'
              : `Online Arena · Room: ${onlineConnection?.room.code || '...'}`
            : undefined
        }
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-2">
        {screen === 'home' && (
          <HomeScreen
            onStartGame={startMatch}
            onOpenOnlineLobby={(mode) => {
              setLobbyInitialMode(mode || 'menu');
              setShowOnlineLobby(true);
            }}
          />
        )}

        {screen === 'match' && (
          <div className="w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-center gap-6 sm:gap-10 py-2">
            {/* Game Board: sits directly on background, NO large black box */}
            <GameBoard
              gameState={gameState}
              myPlayerRole={myPlayerRole}
              onMovePawn={handleMovePawn}
              onPlaceWall={handlePlaceWall}
              onInvalidAction={(msg) => showStatus(msg)}
              disabled={isAiThinking || gameState.winner !== null}
            />

            {/* Player Dashboard */}
            <PlayerDashboard
              gameState={gameState}
              gameMode={gameMode}
              myPlayerRole={myPlayerRole}
              onGiveUp={handleGiveUp}
              onReturnHome={handleReturnHome}
              isMuted={isMuted}
              onToggleMute={() => {
                const next = sound.toggleMute();
                setIsMuted(next);
              }}
              statusMessage={statusMessage}
            />
          </div>
        )}
      </main>

      {/* Online Lobby Modal */}
      {showOnlineLobby && (
        <OnlineLobbyModal
          initialMode={lobbyInitialMode}
          onRoomReady={handleRoomReady}
          onClose={() => setShowOnlineLobby(false)}
          onStartAiPractice={() => {
            setShowOnlineLobby(false);
            startMatch('ai', 'normal');
          }}
        />
      )}

      {/* Match Result Overlay */}
      {gameState.winner && (
        <GameResultModal
          gameState={gameState}
          gameMode={gameMode}
          myPlayerRole={myPlayerRole}
          onReturnHome={handleReturnHome}
          onPlayAgain={() => startMatch(gameMode, difficulty)}
        />
      )}

      {/* Footer */}
      <footer className="w-full text-center py-3 text-[11px] text-slate-500 font-medium tracking-wide">
        Royal Gambit: The Crown Race &copy; 2026 · Tactical Pawn & Rampart Strategy
      </footer>
    </div>
  );
}
