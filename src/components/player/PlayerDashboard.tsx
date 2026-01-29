import { useState } from 'react';
import { Trophy } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGameStore } from '../../store/gameStore';
import { usePeerConnection } from '../../hooks/usePeerConnection';
import { useBingoLogic } from '../../hooks/useBingoLogic';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { BingoCard } from './BingoCard';
import { BrandFooter } from '../shared/BrandFooter';

export const PlayerDashboard = () => {
    const { joinRoom, connectionStatus } = usePeerConnection();
    const { players, currentNumber, roomId } = useGameStore();
    const { generateCard, checkBingo } = useBingoLogic();
    const { playWin } = useSoundEffects();

    // Local state for player identity before interacting with store
    const [playerName, setPlayerName] = useState('');
    const [hasJoined, setHasJoined] = useState(false);

    // Find my player object
    const myPlayerId = players.find(p => p.name === playerName)?.id; // Simplistic ID for now
    const myPlayer = players.find(p => p.id === myPlayerId);

    // Parse room ID from URL if not set
    const [paramRoomId, setParamRoomId] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('join') || '';
    });

    const handleJoin = () => {
        if (!playerName || !paramRoomId) return;

        // Auto-generate ID if needed, but peerjs usually handles it. 
        // Here we use peer id as unique player id.
        // Wait, joinRoom takes hostId.
        joinRoom(paramRoomId, playerName);

        // Generate card immediately
        const card = generateCard();

        setHasJoined(true);

        // Update my card in store
        // Use a small timeout to allow store to receive the player object from the join event
        setTimeout(() => {
            // We need our own ID. usePeerConnection usually sets us up.
            // For this simple P2P, the hook handles the logic. 
            // We just assume we are the last added player matching our name if ID isn't clear,
            // BUT in a real app check ID.
            const myP = useGameStore.getState().players.find(p => p.name === playerName);
            if (myP) {
                useGameStore.getState().updatePlayerCard(myP.id, card);
            }
        }, 500);
    };

    const handleMark = (index: number) => {
        if (!myPlayer) return;

        const newMarked = myPlayer.markedIndices.includes(index)
            ? myPlayer.markedIndices.filter(i => i !== index)
            : [...myPlayer.markedIndices, index];

        useGameStore.setState(state => ({
            players: state.players.map(p =>
                p.id === myPlayer.id ? { ...p, markedIndices: newMarked } : p
            )
        })); // Local update

        // Check win locally
        if (checkBingo(newMarked)) {
            // We just updated local state, wait for user to click BINGO!
        }
    };

    const triggerWin = () => {
        if (!myPlayer) return;
        confetti();
        playWin();

        // Update hasBingo status in store so Host sees it
        useGameStore.setState(state => ({
            players: state.players.map(p =>
                p.id === myPlayer.id ? { ...p, hasBingo: true } : p
            )
        }));
    };

    if (!hasJoined) {
        return (
            <div className="min-h-screen bg-deep-gray flex items-center justify-center p-4 relative overflow-hidden">
                <div className="w-full max-w-sm bg-dark-surface p-6 rounded-xl border border-gray-800 space-y-6 z-10 shadow-2xl">
                    <h1 className="text-3xl font-black text-center text-white italic">
                        NEON<span className="text-neon-cyan">BINGO</span>
                    </h1>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 font-bold uppercase tracking-wider">Room ID</label>
                            <input
                                value={paramRoomId}
                                onChange={e => setParamRoomId(e.target.value)}
                                className="w-full bg-deep-gray border border-gray-700 rounded p-4 text-white focus:border-neon-cyan outline-none transition-colors"
                                placeholder="Enter Room ID"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm text-gray-400 font-bold uppercase tracking-wider">Your Name</label>
                            <input
                                value={playerName}
                                onChange={e => setPlayerName(e.target.value)}
                                className="w-full bg-deep-gray border border-gray-700 rounded p-4 text-white focus:border-neon-magenta outline-none transition-colors"
                                placeholder="Enter Name"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleJoin}
                        disabled={!playerName || !paramRoomId || connectionStatus === 'CONNECTING'}
                        className="w-full py-4 bg-neon-cyan text-black font-black text-lg rounded-lg hover:brightness-110 disabled:opacity-50 transition-all shadow-[0_0_20px_rgba(0,243,255,0.3)]"
                    >
                        {connectionStatus === 'CONNECTING' ? 'CONNECTING...' : 'JOIN GAME'}
                    </button>

                    <div className="pt-4 flex justify-center">
                        <BrandFooter />
                    </div>
                </div>
            </div>
        );
    }

    if (!myPlayer) return <div className="text-center text-white mt-20 animate-pulse">Loading Player Data...</div>;

    const isBingo = checkBingo(myPlayer.markedIndices);

    return (
        <div className="min-h-screen bg-deep-gray text-white pb-32">
            {/* Header */}
            <div className="bg-dark-surface p-4 border-b border-gray-800 sticky top-0 z-20 flex justify-between items-center shadow-lg backdrop-blur-md bg-opacity-90">
                <div>
                    <h2 className="text-lg font-bold text-neon-cyan truncate max-w-[150px]">{myPlayer.name}</h2>
                    <div className="text-xs text-gray-400 font-mono">
                        #{roomId || paramRoomId}
                    </div>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Current Draw</span>
                    <span className="text-3xl font-black text-neon-magenta leading-none dropping-shadow-neon">
                        {currentNumber || '--'}
                    </span>
                </div>
            </div>

            {/* Card */}
            <div className="p-4 mt-2 flex justify-center">
                <BingoCard
                    numbers={myPlayer.card}
                    markedIndices={myPlayer.markedIndices}
                    onMark={handleMark}
                />
            </div>

            {/* Bingo Button - Only show if Bingo and not yet claimed (optional logic, allowing spam for fun) */}
            {isBingo && (
                <div className="fixed bottom-8 left-0 w-full px-6 z-30">
                    <button
                        className="w-full py-4 bg-gradient-to-r from-neon-magenta to-purple-600 text-white font-black text-3xl italic tracking-tighter rounded-full shadow-[0_0_30px_rgba(255,0,255,0.6)] animate-bounce flex items-center justify-center gap-3 border-4 border-white/20"
                        onClick={triggerWin}
                    >
                        <Trophy fill="white" size={32} /> BINGO!
                    </button>
                </div>
            )}

            {!isBingo && (
                <div className="mt-8 pb-8">
                    <BrandFooter />
                </div>
            )}
        </div>
    );
};
