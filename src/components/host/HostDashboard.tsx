import { useEffect } from 'react';
import { Play, RotateCcw, Users, Unlock } from 'lucide-react';
import { usePeerConnection } from '../../hooks/usePeerConnection';
import { useGameStore } from '../../store/gameStore';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { LotteryDrum } from './LotteryDrum';
import { QRCodeDisplay } from './QRCodeDisplay';
import { RecentNumbers } from './RecentNumbers';
import { BrandFooter } from '../shared/BrandFooter';

export const HostDashboard = () => {
    const { createRoom, hostDrawNumber, connectionStatus } = usePeerConnection();
    const { roomId, currentNumber, drawnNumbers, players, status, startGame } = useGameStore();
    const { playPop, playHorn, announceNumber } = useSoundEffects();

    useEffect(() => {
        if (!roomId) createRoom();
    }, [roomId, createRoom]);

    useEffect(() => {
        if (currentNumber && status === 'PLAYING') {
            // Delay announce to sync with slot animation finish (approx 2.5s)
            setTimeout(() => {
                playPop(); // This is the 'ting'
                announceNumber(currentNumber);
            }, 2500);
        }
    }, [currentNumber, status, playPop, announceNumber]);

    // Bingo Horn
    useEffect(() => {
        if (players.some(p => p.hasBingo)) playHorn();
    }, [players, playHorn]);

    const handleStartGame = () => {
        startGame();
        // Should broadcast 'GAME_STARTED' or 'SYNC_STATE' here ideally via store subscription or direct call
        // The store update will be broadcasted by usePeerConnection's state listener if we set one up, 
        // OR we need to trigger broadcast manually. 
        // Since usePeerConnection handles 'DRAW_NUMBER', we need to make sure 'START_GAME' is handled there too.
        // For now, let's assume the players check the status sync.
        // Actually, we should call a method in usePeerConnection to ensure broadcast.
        // But usePeerConnection doesn't expose a 'broadcastState' easily. 
        // We will rely on the fact that `startGame` updates the store, and we should create a triggered broadcast.
        // To be safe, we can add a useEffect observing 'status' in usePeerConnection to broadcast.
    };

    return (
        <div className="min-h-screen bg-deep-gray text-white p-8 grid grid-cols-12 gap-8">
            {/* Sidebar */}
            <div className="col-span-3 space-y-8 border-r border-gray-800 pr-6 flex flex-col h-full">
                <div>
                    <h1 className="text-3xl font-black italic bg-gradient-to-r from-neon-cyan to-neon-magenta bg-clip-text text-transparent">
                        NEON BINGO
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${status === 'LOBBY' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-green-500/20 text-green-500'}`}>
                            {status}
                        </span>
                        <span className="text-gray-600 text-xs">{connectionStatus}</span>
                    </div>
                </div>

                {roomId && status === 'LOBBY' && <QRCodeDisplay roomId={roomId} />}

                {status === 'PLAYING' && (
                    <div className="p-4 bg-dark-surface rounded-lg border border-neon-cyan/20 animate-pulse">
                        <p className="text-neon-cyan text-center font-bold">GAME IN PROGRESS</p>
                        <p className="text-center text-xs text-gray-400">Join disabled</p>
                    </div>
                )}

                <div className="p-4 bg-dark-surface rounded-lg border border-gray-800 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-neon-magenta flex-shrink-0">
                        <Users size={20} />
                        <span className="font-bold">PLAYERS ({players.length})</span>
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                            {players.filter(p => p.isLocked).length} READY
                        </span>
                    </div>
                    <ul className="space-y-2 overflow-y-auto flex-1 h-0">
                        {players.map(p => (
                            <li key={p.id} className="text-sm text-gray-300 border-b border-gray-800 pb-1 flex justify-between">
                                <span>{p.name}</span>
                                {p.hasBingo && <span className="text-yellow-400 animate-pulse">🏆 BINGO!</span>}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mt-auto">
                    <BrandFooter />
                </div>
            </div>

            {/* Main Stage */}
            <div className="col-span-9 flex flex-col">
                <div className="flex-1 flex flex-col items-center justify-center relative">
                    <LotteryDrum currentNumber={currentNumber} />
                    <div className="absolute top-0 right-0">
                        <RecentNumbers numbers={drawnNumbers} />
                    </div>
                </div>

                {/* Controls */}
                <div className="h-32 border-t border-gray-800 flex items-center justify-center gap-8">
                    {status === 'LOBBY' ? (
                        <button
                            onClick={handleStartGame}
                            className="flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-neon-magenta to-purple-600 text-white font-black text-2xl rounded-full hover:scale-105 transition shadow-[0_0_30px_rgba(255,0,255,0.4)]"
                        >
                            <Unlock size={28} /> START GAME
                        </button>
                    ) : (
                        <button
                            onClick={hostDrawNumber}
                            disabled={status !== 'PLAYING'}
                            className="flex items-center gap-3 px-10 py-5 bg-neon-cyan text-black font-black text-2xl rounded-full hover:scale-105 active:scale-95 transition shadow-[0_0_30px_rgba(0,243,255,0.3)] disabled:opacity-50"
                        >
                            <Play fill="black" /> DRAW NUMBER
                        </button>
                    )}

                    <button
                        onClick={() => {
                            if (confirm("⚠️ START NEW GAME?\nThis will disconnect everyone and generate a new Room ID.")) {
                                // 1. CLEAR MEMORY to prevent "Zombie ID" (reconnecting to old session)
                                localStorage.clear();
                                sessionStorage.clear();

                                // 2. FORCE NAVIGATE TO ROOT (Strip all params)
                                window.location.href = window.location.origin + window.location.pathname;
                            }
                        }}
                        className="flex items-center gap-2 px-6 py-3 border border-red-500 text-red-500 rounded-lg hover:bg-red-500/10 transition"
                    >
                        <RotateCcw size={18} /> RESET
                    </button>
                </div>
            </div>
        </div>
    );
};
