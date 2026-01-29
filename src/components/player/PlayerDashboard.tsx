import { useEffect, useState, useRef } from 'react';
import { Trophy, Lock, RotateCcw, PartyPopper, Ban } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGameStore } from '../../store/gameStore';
import { usePeerConnection } from '../../hooks/usePeerConnection';
import { useBingoLogic } from '../../hooks/useBingoLogic';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { BingoCard } from './BingoCard';
import { BrandFooter } from '../shared/BrandFooter';
// import FluidCanvas, { FluidCanvasRef } from '../effects/FluidCanvas';

// V4.0 SYNC: ANIMATION AWARE
export const PlayerDashboard = () => {
    const { joinRoom, connectionStatus, lockMyCard } = usePeerConnection();
    const { players, currentNumber, roomId, status, updatePlayerCard, rerollCard, isRolling } = useGameStore();
    const { checkBingo } = useBingoLogic();
    const { playWin } = useSoundEffects();

    const [playerName, setPlayerName] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [localRolling, setLocalRolling] = useState(false);

    // V3.7 Force State
    const [hasCardLocal, setHasCardLocal] = useState(false);
    // V3.8 Local Numbers State
    const [localCardNumbers, setLocalCardNumbers] = useState<number[]>([]);

    // Fallback ID from local storage
    const savedId = localStorage.getItem('my_bingo_player_id');

    // Resolve Player Object
    const storePlayer = players.find(p => p.id === savedId);

    const myPlayer = storePlayer || (hasJoined && savedId ? {
        id: savedId,
        name: playerName,
        card: localCardNumbers.length > 0 ? localCardNumbers : [],
        markedIndices: [],
        isLocked: false,
        hasBingo: false,
        joinedAt: 0 // V6.1 Fix: Avoid impure Date.now()
    } : undefined);

    useEffect(() => {
        if (myPlayer?.card && myPlayer.card.length > 0) {
            setHasCardLocal(true);
            if (localCardNumbers.length === 0) {
                setLocalCardNumbers(myPlayer.card);
            }
        }
    }, [myPlayer]);

    const handleManualReset = () => {
        localStorage.clear();
        window.location.reload();
    };

    // Helper: Inline Generator (Fisher-Yates)
    const generateInline = () => {
        const pool = Array.from({ length: 75 }, (_, i) => i + 1);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        return pool.slice(0, 16);
    };

    // V5.7 DEBOUNCE LOCK
    const joinLock = useRef(false);

    const handleJoin = () => {
        if (joinLock.current) return; // Prevent double firing
        joinLock.current = true;

        const params = new URLSearchParams(window.location.search);
        const joinId = params.get('join');

        if (!playerName || !joinId) {
            joinLock.current = false;
            return;
        }

        // V5.5 FIX: USE PERSISTENT ID
        const persistentId = localStorage.getItem('bingo_player_id') || crypto.randomUUID();
        localStorage.setItem('bingo_player_id', persistentId);
        localStorage.setItem('my_bingo_player_id', persistentId);

        // V5.2 FIX: ADD TO LOCAL STORE
        useGameStore.getState().joinGame(playerName, persistentId);

        joinRoom(joinId, playerName);

        // Re-enable lock after 5 seconds in case of fail, but usually we just stay locked
        setTimeout(() => { joinLock.current = false; }, 5000);

        // Inline Gen
        const card = generateInline();
        console.log("⚡️ V4.0 INLINE GEN (JOIN):", card);

        updatePlayerCard(persistentId, card); // FIXED: Was newId

        setLocalCardNumbers(card);
        setHasJoined(true);
        setHasCardLocal(true);
    };

    const handleManualGen = () => {
        console.log("⚡️ V4.0 MANUAL TRIGGER");

        const newCard = generateInline();
        setLocalCardNumbers(newCard);
        setHasCardLocal(true);

        const targetId = myPlayer?.id || localStorage.getItem('my_bingo_player_id');
        if (targetId) {
            updatePlayerCard(targetId, newCard);
        }
    }

    const handleReroll = () => {
        if (status !== 'LOBBY' || !myPlayer || myPlayer.isLocked) return;
        const newCard = generateInline();
        setLocalCardNumbers(newCard);
        rerollCard(myPlayer.id, newCard);
    };

    const handleLock = () => {
        if (!myPlayer) return;
        if (window.confirm("Lock this card? You won't be able to reroll.")) {
            // 1. UPDATE STATE IMMEDIATELY (Fixes UI lag)
            useGameStore.getState().lockCard(myPlayer.id);

            // 2. BROADCAST TO HOST
            lockMyCard(myPlayer.id);
        }
    };

    const handleMark = (index: number) => {
        if (!myPlayer) return;
        const store = useGameStore.getState();
        store.markNumber(myPlayer.id, index);
        const newMarked = myPlayer.markedIndices.includes(index)
            ? myPlayer.markedIndices.filter(i => i !== index)
            : [...myPlayer.markedIndices, index];
        checkBingo(newMarked);
    };

    const triggerWin = () => {
        if (!myPlayer) return;
        confetti();
        playWin();
        useGameStore.setState(state => ({
            players: state.players.map(p => p.id === myPlayer.id ? { ...p, hasBingo: true } : p)
        }));
    };

    // V6.0 FLUID INTERACTION
    const fluidRef = useRef<FluidCanvasRef>(null);

    const handleSplat = (x: number, y: number, color: number[]) => {
        if (fluidRef.current) {
            // Multiple splats for richness
            fluidRef.current.splat(x, y, (Math.random() - 0.5) * 0.01, (Math.random() - 0.5) * 0.01, color);
        }
    };

    // V6.0 MOBILE OPTIMIZATION
    // We can pass a prop to FluidCanvas for resolution?
    // For now, FluidCanvas has fixed config. Let's just avoid heavy splashes on mobile if needed.
    // Or we rely on FluidCanvas internal resolution (128).

    // Init Logic
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get('join');
        const store = useGameStore.getState();

        const savedId = localStorage.getItem('my_bingo_player_id');
        if (savedId) {
            const existing = store.players.find(p => p.id === savedId);
            if (existing) {
                setPlayerName(existing.name);
                setHasJoined(true);
                if (existing.card && existing.card.length > 0) {
                    setLocalCardNumbers(existing.card);
                    setHasCardLocal(true);
                }
                const targetRoom = store.roomId || joinId;
                if (targetRoom) joinRoom(targetRoom, existing.name);
            }
        }
    }, [joinRoom]);

    // V4.5 Local History (The Permanent Notebook)
    // V4.7 Stateless History (Crash Prevention)
    // We use a REF to store history so it doesn't trigger effect loops.
    const markedRef = useRef<number[]>([]);
    // Manual re-render trigger
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        if (currentNumber) {
            setLocalRolling(false);
            if (localCardNumbers.length > 0) {
                const strNum = currentNumber.toString();
                const idx = localCardNumbers.findIndex(n => n.toString() === strNum);

                // V4.7 STATELESS UPDATE
                if (idx !== -1) {
                    if (!markedRef.current.includes(idx)) {
                        console.log("⚡️ V4.7 ADDING TO REF (Safe):", idx);
                        markedRef.current.push(idx);

                        // ONE Render Trigger
                        forceUpdate(n => n + 1);

                        // Sync to store silently
                        if (myPlayer && !myPlayer.markedIndices.includes(idx)) {
                            useGameStore.getState().markNumber(myPlayer.id, idx);
                        }
                    }
                }
            }
        }
    }, [currentNumber, localCardNumbers]); // Removed myPlayer dependency to be safer

    useEffect(() => {
        // Sync Visuals
        if (isRolling) setLocalRolling(true);
        else setLocalRolling(false);
    }, [isRolling]);

    // VIEW: LOGIN
    if (!hasJoined && !myPlayer) {
        return (
            <div className="min-h-screen bg-deep-gray flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-dark-surface p-6 rounded-xl border border-gray-800 shadow-2xl space-y-4">
                    <h1 className="text-3xl font-black text-center text-white italic">HOW<span className="text-neon-cyan">BINGO</span></h1>
                    <input
                        className="w-full bg-deep-gray p-4 rounded text-white border border-gray-700 focus:border-neon-cyan outline-none"
                        placeholder="Enter Your Name"
                        value={playerName}
                        onChange={e => setPlayerName(e.target.value)}
                    />
                    <button
                        onClick={handleJoin}
                        disabled={!playerName}
                        className="w-full bg-neon-cyan text-black font-bold p-4 rounded hover:scale-105 transition disabled:opacity-50"
                    >
                        JOIN GAME
                    </button>
                </div>
            </div>
        )
    }

    const displayCard = localCardNumbers.length > 0 ? localCardNumbers : (myPlayer?.card || []);
    const showGame = hasCardLocal || displayCard.length > 0;

    if (!showGame) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-8">
                {/* Connection Status Indicator */}
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className={`w - 3 h - 3 rounded - full ${connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-red-500 animate-pulse'} `}></div>
                    <span className="text-xs text-gray-400">{connectionStatus}</span>
                </div>

                <h1 className="text-3xl font-bold mb-8 text-center text-neon-cyan">
                    Welcome, {myPlayer?.name || playerName}!
                </h1>
                <p className="mb-8 text-center text-gray-400">Click below to generate your Bingo Card.</p>
                <button
                    onClick={handleManualGen}
                    className="bg-neon-magenta hover:bg-neon-cyan text-white text-2xl font-black px-8 py-6 rounded-xl shadow-[0_0_20px_rgba(255,0,255,0.5)] border-2 border-white animate-bounce active:scale-95 transition-all"
                >
                    GET BINGO CARD
                </button>
            </div>
        );
    }

    const isBingo = checkBingo(myPlayer?.markedIndices || []);

    // DEBUG: Verify Lock State
    console.log("Current Lock State:", myPlayer?.isLocked);

    return (
        <div className="min-h-screen bg-deep-gray text-white flex flex-col relative overflow-hidden">
            {/* V6.0 FLUID BACKGROUND */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen">
                {/* <FluidCanvas ref={fluidRef} /> */}
            </div>

            {/* Header */}
            <header className="bg-deep-gray/80 backdrop-blur-md p-4 sticky top-0 z-40 border-b border-white/10 shadow-lg">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <div>
                        {/* FLUID TITLE EFFECT: Text is Transparent Stroked, getting fill from background via mix-blend */}
                        <h1 className="text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-white/20 mix-blend-overlay drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] border-white">
                            HOW <span className="text-white mix-blend-normal">BINGO</span>
                        </h1>
                        <div className="text-xs font-mono text-white/50 flex items-center gap-2">
                            <span>PLAYER V6.0 (FLUID)</span>
                            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Draw</span>
                        <div className="text-4xl font-black text-neon-magenta leading-none">{currentNumber || '--'}</div>
                    </div>
                </div>
            </header>

            {(localRolling || isRolling) && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center flex-col">
                    <div className="text-neon-cyan text-4xl font-black animate-bounce">ROLLING...</div>
                    <div className="text-white text-sm mt-2">Good Luck!</div>
                </div>
            )}

            {status === 'LOBBY' && (
                <div className="bg-yellow-500/10 p-2 text-center text-yellow-500 text-xs font-bold border-b border-yellow-500/20">
                    {myPlayer?.isLocked ? "READY TO START" : "FINALIZE YOUR CARD"}
                </div>
            )}

            {/* GAME AREA */}
            <main className="flex-1 overflow-y-auto pb-32">
                <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10 w-full max-w-md mx-auto">
                    <BingoCard
                        numbers={localCardNumbers}
                        markedIndices={myPlayer?.markedIndices || []}
                        onMark={handleMark}
                        currentNumber={currentNumber}
                        onSplat={(x, y, color) => handleSplat(x, y, color)}
                    />
                </div>

                {/* CONTROLS */}
                {!myPlayer?.isLocked && status === 'LOBBY' && (
                    <div className="flex gap-4 max-w-sm mx-auto p-4">
                        <button
                            onClick={handleReroll}
                            className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-4 rounded-xl flex flex-col items-center gap-2 border border-gray-700 transition-all border-b-4 border-gray-950 active:border-b-0 active:translate-y-1"
                        >
                            <RotateCcw size={24} className="text-neon-cyan" />
                            <span>REROLL</span>
                        </button>
                        <button
                            onClick={handleLock}
                            className="flex-1 bg-neon-magenta hover:bg-neon-pink text-white font-bold py-4 rounded-xl flex flex-col items-center gap-2 border-b-4 border-purple-900 active:border-b-0 active:translate-y-1 transition-all shadow-[0_0_15px_rgba(255,0,255,0.4)]"
                        >
                            <Lock size={24} />
                            <span>LOCK CARD</span>
                        </button>
                    </div>
                )}

                {/* STATUS MESSAGE */}
                {myPlayer?.isLocked && !isBingo && (
                    <div className="text-center p-4">
                        <div className="inline-block bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-bold border border-green-500/50 animate-pulse">
                            CARD LOCKED • WAITING FOR NUMBERS
                        </div>
                    </div>
                )}

                {/* BINGO BUTTON */}
                {isBingo && (
                    <div className="fixed bottom-20 left-0 right-0 p-4 z-50 flex justify-center pointer-events-none">
                        <div className="pointer-events-auto animate-bounce">
                            <button
                                onClick={triggerWin}
                                className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-4xl font-black px-12 py-6 rounded-2xl shadow-[0_0_50px_rgba(255,200,0,0.8)] border-4 border-white transform hover:scale-110 transition-all flex items-center gap-4"
                            >
                                <Trophy size={48} />
                                BINGO!
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {myPlayer && <BrandFooter playerName={myPlayer.name} />}
        </div>
    );
};
