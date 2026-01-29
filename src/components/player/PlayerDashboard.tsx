import { useEffect, useState } from 'react';
import { Trophy, RefreshCw, Lock, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGameStore } from '../../store/gameStore';
import { usePeerConnection } from '../../hooks/usePeerConnection';
import { useBingoLogic } from '../../hooks/useBingoLogic';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { BingoCard } from './BingoCard';
import { BrandFooter } from '../shared/BrandFooter';

// V3.4 AUTO: AUTOMATED CARD GEN + FALLBACK
export const PlayerDashboard = () => {
    const { joinRoom, connectionStatus, lockMyCard } = usePeerConnection();
    const { players, currentNumber, roomId, status, updatePlayerCard, rerollCard, isRolling } = useGameStore();
    const { generateCard, checkBingo } = useBingoLogic();
    const { playWin } = useSoundEffects();

    const [playerName, setPlayerName] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [isStuck, setIsStuck] = useState(false);
    const [localRolling, setLocalRolling] = useState(false);

    const handleManualReset = () => {
        localStorage.clear();
        window.location.reload();
    };

    const myPlayer = players.find(p => p.name === playerName);

    const handleJoin = () => {
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get('join');

        if (!playerName || !joinId) return;

        const newId = crypto.randomUUID();
        localStorage.setItem('my_bingo_player_id', newId);

        joinRoom(joinId, playerName);
        const card = generateCard();
        // Immediate local store update
        updatePlayerCard(newId, card);
        setHasJoined(true);
    };

    const handleManualGen = () => {
        console.log("⚡️ V3.4 MANUAL TRIGGER");
        const newCard = generateCard();
        let id = myPlayer?.id;
        if (!id) id = localStorage.getItem('my_bingo_player_id') || 'temp';
        updatePlayerCard(id, newCard);
    }

    const handleReroll = () => {
        if (status !== 'LOBBY' || !myPlayer || myPlayer.isLocked) return;
        const newCard = generateCard();
        rerollCard(myPlayer.id, newCard);
    };

    const handleLock = () => {
        if (!myPlayer) return;
        if (window.confirm("Lock this card? You won't be able to reroll.")) {
            lockMyCard(myPlayer.id);
        }
    };

    const handleMark = (index: number) => {
        if (!myPlayer || status !== 'PLAYING') return;

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

    // Persistence Check
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get('join');
        const store = useGameStore.getState();

        // Stuck Timer
        const stuckTimer = setTimeout(() => {
            if (joinId && !store.roomId) {
                setIsStuck(true);
            }
        }, 2000);

        // Session Restore
        const savedId = localStorage.getItem('my_bingo_player_id');
        if (savedId) {
            const existing = store.players.find(p => p.id === savedId);
            if (existing) {
                setPlayerName(existing.name);
                setHasJoined(true);
                const targetRoom = store.roomId || joinId;
                if (targetRoom) joinRoom(targetRoom, existing.name);
            }
        }

        return () => clearTimeout(stuckTimer);
    }, [joinRoom]);

    // V3.4 AUTO-GEN ON MOUNT
    useEffect(() => {
        // Attempt to auto-fill card if missing on EVERY render cycle where hasJoined is true
        // This ensures it catches connection latencies
        if (hasJoined) {
            const savedId = localStorage.getItem('my_bingo_player_id') || 'temp';
            const store = useGameStore.getState();
            const me = store.players.find(p => p.id === savedId);

            // If local store sees empty card...
            if (!me || !me.card || me.card.length === 0) {
                console.log("⚡️ V3.4 AUTO-GEN TRIGGER");
                const newCard = generateCard();
                updatePlayerCard(savedId, newCard);
            }
        }
    }, [hasJoined, players, updatePlayerCard, generateCard]);

    useEffect(() => {
        if (currentNumber) {
            setLocalRolling(false);
            if (myPlayer) {
                const strNum = currentNumber.toString();
                const idx = myPlayer.card.findIndex(n => n.toString() === strNum);
                if (idx !== -1 && !myPlayer.markedIndices.includes(idx)) {
                    handleMark(idx);
                    if (navigator.vibrate) navigator.vibrate(200);
                }
            }
        }
    }, [currentNumber, myPlayer]);

    useEffect(() => {
        if (isRolling) setLocalRolling(true);
        else setLocalRolling(false);
    }, [isRolling]);


    if (hasJoined && !myPlayer) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white gap-4 bg-deep-gray p-4">
                <div className="fixed top-0 right-0 bg-purple-600 text-white p-2 z-[9999] font-bold border-2 border-white">
                    PLAYER V3.4 (AUTO)
                </div>
                <h2 className="text-xl font-bold text-neon-cyan animate-pulse">Connecting to Host...</h2>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
                {isStuck && (
                    <div className="flex flex-col items-center animate-fade-in mt-4">
                        <button onClick={handleManualReset} className="px-8 py-3 bg-red-500/10 border-2 border-red-500 text-red-400 rounded-full font-bold">
                            Stuck? Tap to Retry
                        </button>
                    </div>
                )}
            </div>
        );
    }

    if (!hasJoined) {
        return (
            <div className="min-h-screen bg-deep-gray flex items-center justify-center p-4">
                <div className="fixed top-0 right-0 bg-purple-600 text-white p-2 z-[9999] font-bold border-2 border-white">
                    PLAYER V3.4 (AUTO)
                </div>
                <div className="w-full max-w-sm bg-dark-surface p-6 rounded-xl border border-gray-800 shadow-2xl space-y-4">
                    <h1 className="text-3xl font-black text-center text-white italic">NEON<span className="text-neon-cyan">BINGO</span></h1>
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

    // FAIL-SAFE MANUAL BUTTON (Only shows if AUTO failed)
    if (!myPlayer.card || myPlayer.card.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-8">
                <div className="fixed top-0 right-0 bg-purple-600 text-white p-2 z-[9999] font-bold border-2 border-white">PLAYER V3.4 (AUTO-TRIGGERED)</div>
                <h1 className="text-3xl font-bold mb-8 text-center text-red-400">Loading Card...</h1>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan mb-8"></div>
                <p className="mb-8 text-center text-gray-400">If this takes too long, click below:</p>
                <button
                    onClick={handleManualGen}
                    className="bg-neon-magenta hover:bg-neon-cyan text-white text-2xl font-black px-8 py-6 rounded-xl shadow-[0_0_20px_rgba(255,0,255,0.5)] border-2 border-white animate-bounce active:scale-95 transition-all"
                >
                    FORCE LOAD CARD
                </button>
            </div>
        );
    }

    const isBingo = checkBingo(myPlayer!.markedIndices);

    return (
        <div className="min-h-screen bg-deep-gray text-white pb-32 relative">
            <div className="fixed top-0 right-0 bg-purple-600 text-white p-2 z-[9999] font-bold shadow-lg border-2 border-white">
                PLAYER V3.4 (AUTO)
            </div>

            {(localRolling || isRolling) && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center flex-col">
                    <div className="text-neon-cyan text-4xl font-black animate-bounce">ROLLING...</div>
                    <div className="text-white text-sm mt-2">Good Luck!</div>
                </div>
            )}

            <div className="sticky top-0 bg-dark-surface/90 backdrop-blur border-b border-gray-800 p-4 z-20 flex justify-between items-center">
                <div>
                    <h2 className="font-bold text-neon-cyan">{myPlayer!.name}</h2>
                    <span className="text-xs text-gray-400">{status} MODE</span>
                </div>
                <div className="text-right">
                    <span className="text-xs text-gray-500 uppercase tracking-widest font-bold">Draw</span>
                    <div className="text-4xl font-black text-neon-magenta leading-none">{currentNumber || '--'}</div>
                </div>
            </div>

            {status === 'LOBBY' && (
                <div className="bg-yellow-500/10 p-2 text-center text-yellow-500 text-xs font-bold border-b border-yellow-500/20">
                    {myPlayer!.isLocked ? "READY TO START" : "FINALIZE YOUR CARD"}
                </div>
            )}

            <div className="p-4 flex flex-col items-center gap-6 mt-4">
                <BingoCard
                    numbers={myPlayer!.card}
                    markedIndices={myPlayer!.markedIndices}
                    onMark={handleMark}
                />

                {status === 'LOBBY' ? (
                    !myPlayer!.isLocked ? (
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
                        <div className="flex items-center justify-center gap-2 text-green-400 text-sm py-2 px-4 bg-green-500/10 rounded-lg border border-green-500/20 w-full max-w-sm">
                            <CheckCircle size={16} /> CARD LOCKED & READY
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
