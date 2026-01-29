import { useEffect, useState, useRef } from 'react';
import { Users, Play, Unlock, RotateCcw } from 'lucide-react';
import { useGameStore } from '../../store/gameStore';
import { usePeerConnection } from '../../hooks/usePeerConnection';
import { QRCodeDisplay } from './QRCodeDisplay';
import { RecentNumbers } from './RecentNumbers';
import { LotteryDrum } from './LotteryDrum';
import { useSoundEffects } from '../../hooks/useSoundEffects';
// import FluidCanvas, { type FluidCanvasRef } from '../effects/FluidCanvas';
import { BrandFooter } from '../shared/BrandFooter';

// V4.1 STABLE: GLOBAL STORE ACCESS (Anti-Closure Fix)
export const HostDashboard = () => {
    const { createRoom, connectionStatus, startGame } = usePeerConnection();
    const { roomId, currentNumber, drawnNumbers, players, status } = useGameStore();
    const { playHorn, announceNumber, playRollingSound, playDingSound } = useSoundEffects();

    const [isRolling, setIsRolling] = useState(false);

    // V6.0 FLUID REF
    const fluidRef = useRef<FluidCanvasRef>(null);

    useEffect(() => {
        if (!roomId) createRoom();
    }, [roomId, createRoom]);

    useEffect(() => {
        if (players.some(p => p.hasBingo)) playHorn();
    }, [players, playHorn]);

    const handleStartGame = () => {
        startGame();
    };

    const handleStrictDraw = () => {
        if (isRolling) return;

        console.log("⚡️ V4.1 GLOBAL DRAW TRIGGER");

        try {
            // V6.0: FLUID EXPLOSION
            if (fluidRef.current) {
                // Multiple splats for "explosion" effect
                for (let i = 0; i < 8; i++) {
                    const angle = (Math.PI * 2 * i) / 8;
                    const dx = Math.cos(angle) * 2000;
                    const dy = Math.sin(angle) * 2000;
                    fluidRef.current.splat(0.5, 0.5, dx, dy, [1.0, 0.0, 0.5]); // Neon Pink
                }
            }

            // 1. VISUAL START
            setIsRolling(true);
            useGameStore.getState().setRolling(true);
            try { playRollingSound(); } catch (e) { }

            // 2. HARD-WIRED BROADCAST (Fixes "r is not a function")
            // We access the store instance DIRECTLY to guarantee the function exists.
            const globalBroadcast = useGameStore.getState().broadcastEvent;

            if (globalBroadcast) {
                globalBroadcast({ type: 'ROLLING' });
            } else {
                console.warn("⚠️ Broadcast function not registered in store yet!");
            }

            // 3. ANIMATION DELAY (2.5s)
            setTimeout(() => {
                try {
                    // --- INLINE GENERATION ---
                    const used = useGameStore.getState().drawnNumbers || [];
                    const all = Array.from({ length: 75 }, (_, i) => i + 1);
                    const available = all.filter(n => !used.includes(n));

                    if (available.length === 0) {
                        alert("Game Over! All numbers drawn.");
                        setIsRolling(false);
                        useGameStore.getState().setRolling(false);
                        return;
                    }

                    const newNum = available[Math.floor(Math.random() * available.length)];
                    // -------------------------

                    // 4. UPDATE STORE MANUALLY
                    useGameStore.setState((state) => ({
                        drawnNumbers: [...state.drawnNumbers, newNum],
                        currentNumber: newNum,
                        isRolling: false
                    }));

                    // 5. HOST REVEAL (Host sees it first)
                    setIsRolling(false);
                    try { playDingSound(); } catch (e) { }

                    // 6. BROADCAST (Delayed by 500ms AFTER Host reveal)
                    // V5.2: TURBO SYNC (500ms Anim + 500ms Delay)
                    setTimeout(() => {
                        const freshBroadcast = useGameStore.getState().broadcastEvent;
                        if (freshBroadcast) {
                            freshBroadcast({ type: 'DRAW_NUMBER', payload: newNum });
                            announceNumber(newNum);
                        }
                    }, 500);
                } catch (innerError) {
                    console.error("Gen failed", innerError);
                    setIsRolling(false);
                    useGameStore.getState().setRolling(false);
                }
            }, 500); // V5.2: Turbo 0.5s Animation

        } catch (error) {
            console.error("Draw setup failed", error);
            setIsRolling(false);
            useGameStore.getState().setRolling(false);
        }
    };



    return (
        <div className="min-h-screen bg-deep-gray text-white p-8 grid grid-cols-12 gap-8 relative overflow-hidden">
            {/* V6.0 FLUID BACKGROUND */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
                {/* <FluidCanvas ref={fluidRef} /> */}
            </div>

            <div className="fixed top-0 left-0 bg-blue-600 text-white p-2 z-[9999] font-bold shadow-lg border-2 border-white">
                HOST V6.0 (FLUID)
            </div>

            {/* Sidebar */}
            <div className="col-span-3 space-y-8 border-r border-gray-800 pr-6 flex flex-col h-full">
                <div>
                    <h1 className="text-3xl font-black italic bg-gradient-to-r from-neon-cyan to-neon-magenta bg-clip-text text-transparent">
                        HOW BINGO
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

                <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 w-full max-w-md flex-1 flex flex-col min-h-0">
                    <div className="flex items-center gap-2 mb-4 text-neon-magenta flex-shrink-0">
                        <Users size={20} />
                        <span className="font-bold">PLAYERS ({players.filter((v, i, a) => a.findIndex(t => t.name === v.name) === i).length})</span>
                    </div>

                    {/* V5.5 FORCE SCROLL WITH INLINE STYLES */}
                    <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #333' }} className="custom-scrollbar pr-2 space-y-2 flex-1">
                        {/* V5.7 VISUAL SHIELD: Only show unique names */}
                        {players
                            .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
                            .map(p => (
                                <div key={p.id} className="p-3 bg-gray-800 rounded flex justify-between items-center border-b border-gray-700">
                                    <span className="text-white font-medium">{p.name}</span>
                                    {p.isLocked && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">READY</span>}
                                    {p.hasBingo && <span className="text-yellow-400 animate-pulse">🏆 BINGO!</span>}
                                </div>
                            ))}
                    </div>
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
                            onClick={handleStrictDraw}
                            disabled={status !== 'PLAYING' || isRolling}
                            className="flex items-center gap-3 px-10 py-5 bg-neon-cyan text-black font-black text-2xl rounded-full hover:scale-105 active:scale-95 transition-transform duration-100 shadow-[0_0_30px_rgba(0,243,255,0.3)] disabled:opacity-50"
                        >
                            <Play fill="black" /> {isRolling ? 'ROLLING...' : 'DRAW NUMBER'}
                        </button>
                    )}

                    <button
                        onClick={() => {
                            if (confirm("⚠️ START NEW GAME?\nThis will disconnect everyone and generate a new Room ID.")) {
                                localStorage.clear();
                                sessionStorage.clear();
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
