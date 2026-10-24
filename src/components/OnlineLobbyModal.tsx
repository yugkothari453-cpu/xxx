import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Copy,
  Check,
  Users,
  Loader2,
  ArrowRight,
  ChevronLeft,
  Crown,
  AlertCircle,
  Zap,
  Swords,
  Bot,
  Compass,
} from 'lucide-react';
import { onlineClient, RoomConnection } from '../game/onlineClient';
import { sound } from '../game/audio';

interface OnlineLobbyModalProps {
  onRoomReady: (connection: RoomConnection) => void;
  onClose: () => void;
  initialMode?: 'menu' | 'random';
  onStartAiPractice?: () => void;
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  onRoomReady,
  onClose,
  initialMode = 'menu',
  onStartAiPractice,
}) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'random_searching' | 'waiting' | 'join'>(
    initialMode === 'random' ? 'random_searching' : 'menu'
  );
  const [roomConnection, setRoomConnection] = useState<RoomConnection | null>(null);
  const [joinCode, setJoinCode] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>(() => {
    return 'Commander ' + Math.floor(100 + Math.random() * 900);
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchSeconds, setSearchSeconds] = useState<number>(0);

  const searchTimerRef = useRef<number | null>(null);
  const currentConnRef = useRef<RoomConnection | null>(null);
  currentConnRef.current = roomConnection;

  // Auto-start random matchmaking if initialMode is 'random'
  useEffect(() => {
    if (initialMode === 'random') {
      handleFindRandomMatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer for searching
  useEffect(() => {
    if (activeTab === 'random_searching') {
      setSearchSeconds(0);
      searchTimerRef.current = window.setInterval(() => {
        setSearchSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    }

    return () => {
      if (searchTimerRef.current) {
        clearInterval(searchTimerRef.current);
        searchTimerRef.current = null;
      }
    };
  }, [activeTab]);

  // Clean up any pending room or SSE on unmount
  useEffect(() => {
    return () => {
      const conn = currentConnRef.current;
      if (conn && conn.room.isRandomMatch) {
        onlineClient.cancelMatchmaking(conn.room.id, conn.playerToken);
      }
      onlineClient.unsubscribe();
    };
  }, []);

  const handleFindRandomMatch = async () => {
    sound.playClick();
    setLoading(true);
    setErrorMsg(null);
    setActiveTab('random_searching');

    try {
      const result = await onlineClient.findRandomMatch(playerName || 'Royal Challenger');
      setRoomConnection(result.connection);

      if (result.matched) {
        // Paired immediately as Crimson with an already waiting Blue!
        sound.playVictory();
        onRoomReady(result.connection);
      } else {
        // Created waiting room as Blue; wait for Crimson to join via SSE
        onlineClient.subscribe(
          result.connection.room.id,
          (updatedRoom) => {
            if (updatedRoom.players.crimson && updatedRoom.players.crimson.connected) {
              sound.playVictory();
              onRoomReady({
                room: updatedRoom,
                playerRole: 'blue',
                playerToken: result.connection.playerToken,
              });
            }
          },
          (err) => {
            setErrorMsg(`Sync notice: ${err}`);
          }
        );
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Matchmaking failed';
      setErrorMsg(msg);
      setActiveTab('menu');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSearch = async () => {
    sound.playClick();
    if (roomConnection) {
      await onlineClient.cancelMatchmaking(roomConnection.room.id, roomConnection.playerToken);
      onlineClient.unsubscribe();
      setRoomConnection(null);
    }
    setActiveTab('menu');
  };

  const handleCreateRoom = async () => {
    sound.playClick();
    setLoading(true);
    setErrorMsg(null);
    try {
      const conn = await onlineClient.createRoom(playerName || 'Blue Kingdom (Mayura)');
      setRoomConnection(conn);
      setActiveTab('waiting');

      onlineClient.subscribe(
        conn.room.id,
        (updatedRoom) => {
          if (updatedRoom.players.crimson && updatedRoom.players.crimson.connected) {
            sound.playVictory();
            onRoomReady({
              room: updatedRoom,
              playerRole: 'blue',
              playerToken: conn.playerToken,
            });
          }
        },
        (err) => {
          setErrorMsg(err);
        }
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create room';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    sound.playClick();
    if (!joinCode.trim()) {
      setErrorMsg('Please enter a 6-character Shahi Farman code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const conn = await onlineClient.joinRoom(
        joinCode.trim(),
        undefined,
        playerName || 'Crimson Kingdom (Suryavanshi)'
      );
      sound.playVictory();
      onRoomReady(conn);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to join chamber';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!roomConnection) return;
    sound.playClick();
    const url = `${window.location.origin}?room=${roomConnection.room.code}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  const handleCopyCode = () => {
    if (!roomConnection) return;
    sound.playClick();
    navigator.clipboard.writeText(roomConnection.room.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {});
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative glass-panel max-w-lg w-full rounded-2xl p-6 sm:p-8 animate-fadeIn border-amber-500/40 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => {
              sound.playClick();
              if (activeTab === 'random_searching' && roomConnection) {
                onlineClient.cancelMatchmaking(roomConnection.room.id, roomConnection.playerToken);
              }
              onlineClient.unsubscribe();
              onClose();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Leave Lobby</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 uppercase tracking-widest font-royal">
            <Globe className="w-3.5 h-3.5 text-amber-400" />
            <span>Shahi Online Arena</span>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/30 to-rose-500/20 text-amber-300 border border-amber-400/50 mx-auto flex items-center justify-center mb-3 shadow-lg shadow-amber-500/15">
                <Swords className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1 font-royal">
                Raj Darbar Arena
              </h2>
              <p className="text-xs text-amber-100/70">
                Match with a random online commander or challenge a friend in a private Mahal chamber.
              </p>
            </div>

            {/* Commander Name Input */}
            <div className="mb-5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-300/80 mb-1.5">
                Your Commander Moniker
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={20}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-amber-500/30 focus:border-amber-400 text-white text-xs outline-none transition-colors"
                placeholder="Enter commander name"
              />
            </div>

            {/* FEATURED: Ran-Dangal (Play with Random Player Card) */}
            <div
              onClick={handleFindRandomMatch}
              className="group relative cursor-pointer rounded-2xl p-4 sm:p-5 mb-5 bg-gradient-to-br from-amber-500/20 via-[#181226]/80 to-[#0d1322] border-2 border-amber-400/60 hover:border-amber-400 transition-all duration-300 shadow-xl shadow-amber-500/15 hover:shadow-amber-500/25 hover:-translate-y-0.5 overflow-hidden"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleFindRandomMatch();
              }}
            >
              <div className="absolute top-0 right-0 px-3 py-1 bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-widest rounded-bl-xl flex items-center gap-1 shadow-md">
                <Zap className="w-3 h-3 fill-slate-950" />
                <span>Quick Match</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center shrink-0 text-amber-300 group-hover:scale-105 transition-transform shadow-xs">
                  <Zap className="w-6 h-6" />
                </div>
                <div className="flex-1 pr-12">
                  <h3 className="text-base font-bold text-white font-royal group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                    <span>Ran-Dangal · Play Random Player</span>
                  </h3>
                  <p className="text-[11px] text-amber-100/70 leading-relaxed">
                    Instantly pair with an active commander waiting online across the realm.
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-amber-400/25 flex items-center justify-between text-xs font-bold text-amber-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Instant Matchmaking
                </span>
                <div className="flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Search Rival</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-amber-500/20" />
              <span className="shrink-0 mx-3 text-[10px] uppercase font-bold text-amber-300/70 tracking-widest font-royal">
                Or Duel a Friend in Private Mahal
              </span>
              <div className="flex-grow border-t border-amber-500/20" />
            </div>

            {/* Private Room Options */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 hover:from-amber-500 hover:to-amber-700 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border border-amber-400/30"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crown className="w-4 h-4" />}
                <span>Create Chamber</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab('join');
                }}
                className="py-3 px-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-amber-200 font-bold text-xs tracking-wider uppercase border border-amber-500/30 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span>Join with Code</span>
              </button>
            </div>
          </div>
        )}

        {/* Random Searching Radar Tab */}
        {activeTab === 'random_searching' && (
          <div className="text-center py-4">
            {/* Animated Radar Pulse */}
            <div className="relative w-28 h-28 mx-auto mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-ping" style={{ animationDuration: '2.5s' }} />
              <div className="absolute inset-2 rounded-full border border-rose-400/40 animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-radial from-amber-400/20 to-transparent blur-md" />
              <div className="relative w-16 h-16 rounded-2xl bg-slate-950 border-2 border-amber-400/60 flex items-center justify-center shadow-xl shadow-amber-500/25">
                <Compass className="w-8 h-8 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
              </div>
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-widest mb-2 font-royal">
              Searching Realm · {formatTimer(searchSeconds)}
            </div>

            <h2 className="text-xl font-bold text-white mb-1.5 font-royal">
              Seeking an Imperial Rival...
            </h2>
            <p className="text-xs text-amber-100/70 max-w-sm mx-auto mb-6">
              Scanning active commanders across the realm. The crown duel begins immediately when a challenger is paired!
            </p>

            <div className="bg-slate-950/80 rounded-xl p-3.5 border border-amber-500/25 text-left mb-6 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase text-amber-400/80 font-bold block">Your Commander:</span>
                <span className="text-white font-bold">{playerName || 'Royal Challenger'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ran-Dangal Active</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleCancelSearch}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                Cancel Search
              </button>

              {onStartAiPractice && (
                <button
                  onClick={() => {
                    handleCancelSearch();
                    onStartAiPractice();
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/40 font-semibold text-xs tracking-wider uppercase transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Bot className="w-3.5 h-3.5 text-amber-400" />
                  <span>Duel AI Instead</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Private Chamber Waiting Tab */}
        {activeTab === 'waiting' && roomConnection && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-400/40 mx-auto flex items-center justify-center mb-4">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1 font-royal">
              Private Chamber Ready
            </h2>
            <p className="text-xs text-amber-100/70 mb-6">
              Share the Shahi Farman code or invite link with your rival. The duel commences the moment they enter.
            </p>

            <div className="bg-slate-950/90 rounded-2xl p-4 border border-amber-500/40 mb-6">
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-widest mb-1 font-royal">
                Shahi Farman Code
              </div>
              <div className="text-3xl font-extrabold tracking-widest text-amber-200 font-royal my-2">
                {roomConnection.room.code}
              </div>

              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={handleCopyCode}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-500/30"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>Copy Invite Link</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-amber-300/80">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Awaiting rival commander to enter...</span>
            </div>
          </div>
        )}

        {/* Join Tab */}
        {activeTab === 'join' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-400/40 mx-auto flex items-center justify-center mb-3">
                <Users className="w-7 h-7 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1 font-royal">
                Enter Shahi Chamber
              </h2>
              <p className="text-xs text-amber-100/70">
                Enter the 6-character Shahi Farman code provided by the chamber host.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-300/80 mb-1.5">
                  Your Commander Moniker
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/90 border border-amber-500/30 focus:border-amber-400 text-white text-xs outline-none transition-colors"
                  placeholder="Crimson Challenger"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-300/80 mb-1.5">
                  Shahi Farman Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="w-full px-3.5 py-3 rounded-xl bg-slate-950/90 border border-amber-500/40 focus:border-amber-400 text-center tracking-widest text-lg font-bold font-royal text-amber-200 outline-none transition-colors uppercase"
                  placeholder="E.G. AB12CD"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab('menu');
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs tracking-wider uppercase transition-colors cursor-pointer"
              >
                Back
              </button>

              <button
                onClick={handleJoinRoom}
                disabled={loading || joinCode.length < 4}
                className="flex-[2] py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                <span>Enter Chamber</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
