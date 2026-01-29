import { useEffect, useState, useRef } from 'react';
import { Trophy, RefreshCw, Lock, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGameStore } from '../../store/gameStore';
import { usePeerConnection } from '../../hooks/usePeerConnection';
import { useBingoLogic } from '../../hooks/useBingoLogic';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { BingoCard } from './BingoCard';
import { BrandFooter } from '../shared/BrandFooter';

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
        joinedAt: Date.now()
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

    const handleJoin = () => {
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get('join');

        if (!playerName || !joinId) return;

        const newId = crypto.randomUUID();
        localStorage.setItem('my_bingo_player_id', newId);

        // V5.2 FIX: ADD TO LOCAL STORE
        useGameStore.getState().joinGame(playerName, newId);

        joinRoom(joinId, playerName);

        // Inline Gen
        const card = generateInline();
        console.log("⚡️ V4.0 INLINE GEN (JOIN):", card);

        updatePlayerCard(newId, card);

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
                    <div className={`w-3 h-3 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
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

    return (
        <div className="min-h-screen bg-deep-gray text-white pb-32 relative">
            <div className="fixed top-0 right-0 bg-green-600 text-white p-2 z-[9999] font-bold shadow-lg border-2 border-white">
                PLAYER V5.2 (FIXED)
            </div>

            {/* Connection Status Indicator */}
            <div className="absolute top-16 left-4 flex items-center gap-2 z-10">
                <div className={`w-3 h-3 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
            </div>

            {(localRolling || isRolling) && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center flex-col">
                    <div className="text-neon-cyan text-4xl font-black animate-bounce">ROLLING...</div>
                    <div className="text-white text-sm mt-2">Good Luck!</div>
                </div>
            )}

            <div className="sticky top-0 bg-dark-surface/90 backdrop-blur border-b border-gray-800 p-4 z-20 flex justify-between items-center">
                <div>
                    <h2 className="font-bold text-neon-cyan">{myPlayer?.name || playerName}</h2>
                    <span className="text-xs text-gray-400">{status} MODE</span>
                </div>
                <div className="text-right">
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Draw</span>
                    <div className="text-4xl font-black text-neon-magenta leading-none">{currentNumber || '--'}</div>
                </div>
            </div>

            {status === 'LOBBY' && (
                <div className="bg-yellow-500/10 p-2 text-center text-yellow-500 text-xs font-bold border-b border-yellow-500/20">
                    {myPlayer?.isLocked ? "READY TO START" : "FINALIZE YOUR CARD"}
                </div>
            )}

            <div className="p-4 flex flex-col items-center gap-6 mt-4">
                <BingoCard
                    numbers={displayCard}
                    markedIndices={[...new Set([...(myPlayer?.markedIndices || []), ...markedRef.current])]} // V4.7 Use Ref
                    currentNumber={currentNumber}
                    onMark={handleMark}
                />

                {status === 'LOBBY' ? (
                    !myPlayer?.isLocked ? (
                        <div className="flex gap-3 w-full max-w-sm">
                            <button
                                onClick={handleReroll}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-300 hover:text-white hover:border-white transition"
                            >
                                <RefreshCw size={18} /> REROLL
                            </button>
                            <button
                                onClick={handleLock}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600/20 border border-green-500/50 text-green-400 rounded-lg hover:bg-green-600/30 transition text-sm font-bold"
                            >
                                <Lock size={18} /> LOCK CARD
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2 text-green-400 font-bold py-4 px-4 bg-green-900/50 border border-green-500 rounded-xl w-full max-w-sm animate-pulse shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                            🔒 CARD LOCKED - WAITING FOR HOST
                        </div>
                    )
                ) : (
                    <div className="flex items-center justify-center gap-2 text-gray-500 text-sm">
                        <Lock size={14} /> GAME IN PROGRESS
                    </div>
                )}
            </div>

            {isBingo && (
                <div className="fixed bottom-8 left-0 w-full px-6 z-30">
                    <button
                        onClick={triggerWin}
                        className="w-full py-4 bg-gradient-to-r from-neon-magenta to-purple-600 text-white font-black text-2xl rounded-full shadow-[0_0_30px_rgba(255,0,255,0.6)] animate-bounce flex items-center justify-center gap-2"
                    >
                        <Trophy size={24} /> BINGO!
                    </button>
                </div>
            )}

            <div className="mt-8 opacity-50"><BrandFooter /></div>
        </div >
    );
};
