import { useEffect, useState } from 'react';
import { Trophy, RefreshCw, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGameStore } from '../../store/gameStore';
import { usePeerConnection } from '../../hooks/usePeerConnection';
import { useBingoLogic } from '../../hooks/useBingoLogic';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { BingoCard } from './BingoCard';
import { BrandFooter } from '../shared/BrandFooter';

export const PlayerDashboard = () => {
    const { joinRoom, connectionStatus } = usePeerConnection();
    const { players, currentNumber, roomId, status, updatePlayerCard, rerollCard } = useGameStore();
    const { generateCard, checkBingo } = useBingoLogic();
    const { playWin } = useSoundEffects();

    const [playerName, setPlayerName] = useState('');
    const [hasJoined, setHasJoined] = useState(false);

    // Persistence Check on Mount
    useEffect(() => {
        // Zustand persist middleware rehydrates automatically.
        // We just need to check if we are already in a room and have an ID.
        // But local component state (playerName) might be empty.
        // Let's see if we can recover from store.
        const storedPlayers = useGameStore.getState().players;
        // In a real app we'd store "myPlayerId" in localStorage separately.
        // For now, let's ask user to re-login or use heuristics.
        // Actually, the user asked for persistence.
        // Best approach: Store 'myPlayerId' in a separate persist store or just localStorage here.
        const savedId = localStorage.getItem('my_bingo_player_id');
        if (savedId) {
            const existing = storedPlayers.find(p => p.id === savedId);
            if (existing) {
                setPlayerName(existing.name);
                setHasJoined(true);
                if (roomId) joinRoom(roomId, existing.name); // Re-establish peer connection
            }
        }
    }, []);

    const myPlayer = players.find(p => p.name === playerName); // Still using name match if id logic is simple

    const handleJoin = () => {
        const params = new URLSearchParams(window.location.search);
        const joinId = params.get('join');

        if (!playerName || !joinId) return;

        // Generate ID
        const newId = crypto.randomUUID(); // Valid in modern browsers
        localStorage.setItem('my_bingo_player_id', newId);

        joinRoom(joinId, playerName);

        const card = generateCard();

        // We use a slight delay or optimistic update.
        // But since we are using PeerJS, we need validity. 
        // Let's just update local store immediately for "Lobby" feel.
        // Note: joinRoom triggers store update via peer events usually? 
        // In our simple logic, joinGame is called locally too.

        // Wait for store to update with new player from joinRoom's local call
        setTimeout(() => {
            updatePlayerCard(newId, card);
        }, 100);

        setHasJoined(true);
    };

    const handleReroll = () => {
        if (status !== 'LOBBY' || !myPlayer) return;
        const newCard = generateCard();
        rerollCard(myPlayer.id, newCard);
    };

    const handleMark = (index: number) => {
        if (!myPlayer || status !== 'PLAYING') return; // Can only mark if playing

        // Toggle mark
        const store = useGameStore.getState();
        store.markNumber(myPlayer.id, index);

        // Check win
        // We need to fetch the *updated* marks. 
        // Simplest is to check locally with the new array.
        const newMarked = myPlayer.markedIndices.includes(index)
            ? myPlayer.markedIndices.filter(i => i !== index)
            : [...myPlayer.markedIndices, index];

        if (checkBingo(newMarked)) {
            // Let user click bingo
        }
    };

    const triggerWin = () => {
        if (!myPlayer) return;
        confetti();
        playWin();
        // Update store
        useGameStore.setState(state => ({
            players: state.players.map(p => p.id === myPlayer.id ? { ...p, hasBingo: true } : p)
        }));
    };

    // Login Screen
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
                    <button onClick={handleJoin} className="w-full bg-neon-cyan text-black font-bold p-4 rounded hover:scale-105 transition">
                        JOIN GAME
                    </button>
                    <div className="text-xs text-center text-gray-500 mt-2">
                        Build v2.0 (16-Grid)
                    </div>
                </div>
            </div>
        )
    }

    if (!myPlayer) return <div className="text-white text-center mt-20">Loading...</div>;

    const isBingo = checkBingo(myPlayer.markedIndices);

    return (
        <div className="min-h-screen bg-deep-gray text-white pb-32">
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
                    WAITING FOR HOST TO START
                </div>
            )}

            {/* Card Area */}
            <div className="p-4 flex flex-col items-center gap-6 mt-4">
                <BingoCard
                    numbers={myPlayer.card}
                    markedIndices={myPlayer.markedIndices}
                    onMark={handleMark}
                />

                {/* Reroll Button (Lobby Only) */}
                {status === 'LOBBY' ? (
                    <button
                        onClick={handleReroll}
                        className="flex items-center gap-2 px-6 py-3 bg-gray-800 border border-gray-600 rounded-full text-gray-300 hover:text-white hover:border-white transition"
                    >
                        <RefreshCw size={18} /> REROLL CARD
                    </button>
                ) : (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Lock size={14} /> CARD LOCKED
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
