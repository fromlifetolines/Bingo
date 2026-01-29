import { useEffect } from 'react';
import { Play, RotateCcw, Users } from 'lucide-react';
import { usePeerConnection } from '../../hooks/usePeerConnection';
import { useGameStore } from '../../store/gameStore';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { LotteryDrum } from './LotteryDrum';
import { QRCodeDisplay } from './QRCodeDisplay';
import { RecentNumbers } from './RecentNumbers';
import { BrandFooter } from '../shared/BrandFooter';

export const HostDashboard = () => {
    const { createRoom, hostDrawNumber, reset, connectionStatus } = usePeerConnection();
    const { roomId, currentNumber, drawnNumbers, players } = useGameStore();
    const { playPop, playHorn, announceNumber } = useSoundEffects();

    useEffect(() => {
        // Auto-create room on mount if not exists
        if (!roomId) {
            createRoom();
        }
    }, [roomId, createRoom]);

    useEffect(() => {
        // Play sound and announce when number changes
        if (currentNumber) {
            playPop();
            // Small delay for announcement so it doesn't clash with pop
            setTimeout(() => announceNumber(currentNumber), 200);
        }
    }, [currentNumber, playPop, announceNumber]);

    // Check for Bingo to play Horn
    useEffect(() => {
        const hasWinner = players.some(p => p.hasBingo);
        if (hasWinner) {
            playHorn();
        }
    }, [players, playHorn]); // players array reference changes on update

    return (
        <div className="min-h-screen bg-deep-gray text-white p-8 grid grid-cols-12 gap-8">
            {/* Sidebar Info */}
            <div className="col-span-3 space-y-8 border-r border-gray-800 pr-6 flex flex-col h-full">
                <div>
                    <h1 className="text-3xl font-black italic bg-gradient-to-r from-neon-cyan to-neon-magenta bg-clip-text text-transparent">
                        NEON BINGO
                    </h1>
                    <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        HOST MODE
                    </p>
                </div>

                {roomId && <QRCodeDisplay roomId={roomId} />}

                <div className="p-4 bg-dark-surface rounded-lg border border-gray-800 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center gap-2 mb-4 text-neon-magenta flex-shrink-0">
                        <Users size={20} />
                        <span className="font-bold">PLAYERS ({players.length})</span>
                    </div>
                    <ul className="space-y-2 overflow-y-auto flex-1 h-0">
                        {players.map(p => (
                            <li key={p.id} className="text-sm text-gray-300 border-b border-gray-800 pb-1 flex justify-between">
                                <span>{p.name}</span>
                                {p.hasBingo && <span className="text-yellow-400 animate-pulse">🏆 BINGO!</span>}
                            </li>
                        ))}
                        {players.length === 0 && <li className="text-gray-600 italic text-sm">Waiting for players...</li>}
                    </ul>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-800">
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
                    <button
                        onClick={hostDrawNumber}
                        className="flex items-center gap-3 px-10 py-5 bg-neon-cyan text-black font-black text-2xl rounded-full hover:scale-105 active:scale-95 transition shadow-[0_0_30px_rgba(0,243,255,0.3)]"
                    >
                        <Play fill="black" /> DRAW NUMBER
                    </button>

                    <button
                        onClick={() => {
                            if (confirm("Reset entire game?")) reset();
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
