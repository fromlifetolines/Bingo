import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type GameStatus = 'LOBBY' | 'PLAYING' | 'GAME_OVER';
export type UserRole = 'HOST' | 'PLAYER' | null;

export interface Player {
    id: string; // Peer ID usually
    name: string;
    card: number[]; // Flat array of 16 numbers
    markedIndices: number[];
    hasBingo: boolean;
    isLocked: boolean;
}

interface GameState {
    status: GameStatus;
    role: UserRole;
    roomId: string | null;
    drawnNumbers: number[];
    currentNumber: number | null;
    isRolling: boolean;
    players: Player[];

    // Actions
    setRole: (role: UserRole) => void;
    setRoomId: (id: string) => void;
    startGame: () => void;
    resetGame: () => void;
    setRolling: (isRolling: boolean) => void;

    // Host Actions
    drawNumber: () => void;
    setGameStatus: (status: GameStatus) => void;

    // Player Actions
    joinGame: (name: string, playerId: string) => void;
    updatePlayerCard: (playerId: string, card: number[]) => void;
    rerollCard: (playerId: string, newCard: number[]) => void;
    lockCard: (playerId: string) => void;
    markNumber: (playerId: string, numberIndex: number) => void;
    checkSessionMismatch: (incomingRoomId: string | null) => void;

    // V4.1 Global Broadcast Access
    broadcastEvent: (payload: any) => void;
    registerBroadcast: (callback: (payload: any) => void) => void;
}

// --- NUCLEAR HARD RESET LOGIC (PERSISTENCE FIX) ---
try {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    const storageData = localStorage.getItem('bingo-storage');

    if (joinId && storageData) {
        const parsed = JSON.parse(storageData);
        // "state" is the default wrapper for zustand persist
        const storedRoomId = parsed.state?.roomId;

        if (storedRoomId && storedRoomId !== joinId) {
            console.warn('[CRITICAL] Room ID Mismatch detected (URL vs LocalStorage).');
            console.warn(`URL: ${joinId} | Stored: ${storedRoomId}`);
            console.warn('Initiating NUCLEAR HARD RESET to prevent deadlock...');

            localStorage.clear();

            // Reload with the same URL (which still has ?join=...)
            // But now localStorage is empty, so it will be a clean join.
            window.location.reload();

            // Throw error to halt further script execution immediately
            throw new Error('Halting execution for hard reset...');
        }
    }
} catch (e) {
    // If it's our intention to halt, log it. 
    if ((e as Error).message === 'Halting execution for hard reset...') {
        console.log('Resetting...');
    } else {
        console.error('Error during persistence check:', e); // Non-blocking if JSON parse fails
    }
}
// --------------------------------------------------    

// Helper: Persistent ID
const getPersistentId = () => {
    let id = localStorage.getItem('bingo_player_id');
    if (!id) {
        id = Math.random().toString(36).substr(2, 9);
        localStorage.setItem('bingo_player_id', id);
    }
    return id;
};

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            playerId: getPersistentId(), // Stores the persistent ID
            status: 'LOBBY',
            role: null,
            roomId: null,
            drawnNumbers: [],
            currentNumber: null,
            isRolling: false,
            players: [],

            setRole: (role) => set({ role }),
            setRoomId: (roomId) => set({ roomId }),

            setGameStatus: (status) => set({ status }),
            setRolling: (isRolling) => set({ isRolling }),

            startGame: () => set({ status: 'PLAYING', drawnNumbers: [], currentNumber: null }),

            resetGame: () => set({
                status: 'LOBBY',
                drawnNumbers: [],
                currentNumber: null,
                isRolling: false,
                players: []
            }),

            drawNumber: () => {
                const { drawnNumbers, status } = get();
                if (status !== 'PLAYING') return;
                if (drawnNumbers.length >= 75) return;

                let nextNum;
                do {
                    nextNum = Math.floor(Math.random() * 75) + 1;
                } while (drawnNumbers.includes(nextNum));

                set({
                    drawnNumbers: [...drawnNumbers, nextNum],
                    currentNumber: nextNum
                });
            },

            joinGame: (name, playerId) => set((state) => {
                // 1. STRICT DEDUPLICATION (ID OR NAME)
                // If we see the same ID, OR the same Name, we treat it as the same person to prevent "Infinite Clones"
                if (state.players.some(p => p.id === playerId || p.name === name)) {
                    // Update status if needed (optional) but do not add row
                    return state;
                }

                // 2. ADD NEW ONLY
                return {
                    players: [...state.players, {
                        id: playerId,
                        name,
                        card: [],
                        markedIndices: [],
                        hasBingo: false,
                        isLocked: false
                    }]
                };
            }),

            updatePlayerCard: (playerId, card) => set((state) => ({
                players: state.players.map(p =>
                    p.id === playerId ? { ...p, card } : p
                )
            })),

            rerollCard: (playerId, newCard) => set((state) => ({
                players: state.players.map(p =>
                    p.id === playerId ? { ...p, card: newCard, markedIndices: [] } : p
                )
            })),

            lockCard: (playerId) => set((state) => ({
                players: state.players.map(p =>
                    p.id === playerId ? { ...p, isLocked: true } : p
                )
            })),

            markNumber: (playerId, numberIndex) => set((state) => ({
                players: state.players.map(p => {
                    if (p.id !== playerId) return p;
                    const isMarked = p.markedIndices.includes(numberIndex);
                    const newMarked = isMarked
                        ? p.markedIndices.filter(i => i !== numberIndex)
                        : [...p.markedIndices, numberIndex];
                    return { ...p, markedIndices: newMarked };
                })
            })),

            checkSessionMismatch: (incomingRoomId) => {
                const state = get();
                // If we are trying to join a SPECIFIC room (incomingRoomId) 
                // AND we have a stored room ID that is DIFFERENT
                if (incomingRoomId && state.roomId && state.roomId !== incomingRoomId) {
                    console.log('Detected Room Mismatch: Clearing Session');
                    // Wipe everything for a clean slate
                    set({
                        status: 'LOBBY',
                        role: null,
                        roomId: null,
                        drawnNumbers: [],
                        currentNumber: null,
                        isRolling: false,
                        players: []
                    });
                }
            },

            // V4.1 Impl
            broadcastEvent: (payload) => console.warn("Broadcast not registered", payload),
            registerBroadcast: (callback) => set({ broadcastEvent: callback })
        }),
        {
            name: 'bingo-storage',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                role: state.role,
                roomId: state.roomId,
                players: state.players
            }),
        }
    )
);
