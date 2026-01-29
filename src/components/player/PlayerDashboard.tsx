import { useEffect, useState } from 'react';
import { Trophy, RefreshCw, Lock, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGameStore } from '../../store/gameStore';
import { usePeerConnection } from '../../hooks/usePeerConnection';
import { useBingoLogic } from '../../hooks/useBingoLogic';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { BingoCard } from './BingoCard';
import { BrandFooter } from '../shared/BrandFooter';

export const PlayerDashboard = () => {
    const { joinRoom, connectionStatus, lockMyCard } = usePeerConnection();
    const { players, currentNumber, roomId, status, updatePlayerCard, rerollCard, isRolling } = useGameStore();
    const { generateCard, checkBingo } = useBingoLogic();
    const { playWin } = useSoundEffects();

    const [playerName, setPlayerName] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [isStuck, setIsStuck] = useState(false);

    // Persistence Check on Mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get('join');

        // Check for mismatch BEFORE trying to restore
        useGameStore.getState().checkSessionMismatch(joinId);

        // Stuck Timer: Show retry button quickly (2s) if connection hangs
        const stuckTimer = setTimeout(() => {
            if (joinId && !useGameStore.getState().roomId) {
                setIsStuck(true);
            }
        }, 2000);

        const storedPlayers = useGameStore.getState().players;
        const savedId = localStorage.getItem('my_bingo_player_id');

        if (savedId) {
            const existing = storedPlayers.find(p => p.id === savedId);
            if (existing) {
                setPlayerName(existing.name);
                setHasJoined(true);
                // Important: Use the joinId from URL if available and store was cleared, 
                // OR use the one from store if it matched.
                const targetRoom = useGameStore.getState().roomId || joinId;
                if (targetRoom) joinRoom(targetRoom, existing.name);
            }
        }
        return () => clearTimeout(stuckTimer);
    }, [joinRoom]);

    const handleManualReset = () => {
        // Immediate Nuclear Reset
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

        setTimeout(() => {
            updatePlayerCard(newId, card);
        }, 100);

        setHasJoined(true);
    };

    const handleReroll = () => {
        if (status !== 'LOBBY' || !myPlayer || myPlayer.isLocked) return;
        const newCard = generateCard();
        rerollCard(myPlayer.id, newCard);
    };

    const handleLock = () => {
        if (!myPlayer) return;
        // Native confirm is fine, but let's make sure linter doesn't complain
        const confirmed = window.confirm("Lock this card? You won't be able to reroll.");
        if (confirmed) {
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

        if (checkBingo(newMarked)) {
            // Bingo logic handled by button
        }
    };

    const triggerWin = () => {
        if (!myPlayer) return;
        confetti();
        playWin();
        useGameStore.setState(state => ({
            players: state.players.map(p => p.id === myPlayer.id ? { ...p, hasBingo: true } : p)
        }));
    };

    if (!hasJoined) {
        return (
            <div className="min-h-screen bg-deep-gray flex items-center justify-center p-4">
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
                    <div className="text-xs text-center text-gray-500 mt-2">
                        Build v2.1 (Anti-Cheat)
                    </div>
                </div>
            </div>
        )
    }

    if (!myPlayer) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white gap-4 bg-deep-gray">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
                <div className="text-gray-400 font-medium">Connecting to Game...</div>

                {isStuck && (
                    <div className="flex flex-col items-center animate-fade-in mt-4">
                        <button
                            onClick={handleManualReset}
                            className="px-8 py-3 bg-red-500/10 border-2 border-red-500 text-red-400 rounded-full font-bold hover:bg-red-500/20 active:scale-95 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                        >
                            Stuck? Tap to Retry
                        </button>
                        <p className="text-xs text-gray-600 mt-2">Force Reconnect</p>
                    </div>
                )}
            </div>
        );
    }

    const isBingo = checkBingo(myPlayer.markedIndices);

    return (
        <div className="min-h-screen bg-deep-gray text-white pb-32 relative">
            {/* ROLLING OVERLAY */}
            {isRolling && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center flex-col">
                    <div className="text-neon-cyan text-4xl font-black animate-bounce">ROLLING...</div>
                    <div className="text-white text-sm mt-2">Good Luck!</div>
                </div>
            )}

            {/* Header */}
            <div className="sticky top-0 bg-dark-surface/90 backdrop-blur border-b border-gray-800 p-4 z-20 flex justify-between items-center">
                <div>
                    <h2 className="font-bold text-neon-cyan">{myPlayer.name}</h2>
                    <span className="text-xs text-gray-400">{status} MODE</span>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Draw</span>
                    <div className="text-3xl font-black text-neon-magenta leading-none">{currentNumber || '--'}</div>
                </div>
            </div>

            {/* Status Bar */}
            {status === 'LOBBY' && (
                <div className="bg-yellow-500/10 p-2 text-center text-yellow-500 text-xs font-bold border-b border-yellow-500/20">
                    {myPlayer.isLocked ? "READY TO START" : "FINALIZE YOUR CARD"}
                </div>
            )}

            {/* Card Area */}
            <div className="p-4 flex flex-col items-center gap-6 mt-4">
                <BingoCard
                    numbers={myPlayer.card}
                    markedIndices={myPlayer.markedIndices}
                    onMark={handleMark}
                />

                {/* Lobby Controls */}
                {status === 'LOBBY' ? (
                    !myPlayer.isLocked ? (
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

            {/* Victory Button */}
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
        </div>
    );
};
