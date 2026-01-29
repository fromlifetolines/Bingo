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
}

interface GameState {
    status: GameStatus;
    role: UserRole;
    roomId: string | null;
    drawnNumbers: number[];
    currentNumber: number | null;
    players: Player[];

    // Actions
    setRole: (role: UserRole) => void;
    setRoomId: (id: string) => void;
    startGame: () => void;
    resetGame: () => void;

    // Host Actions
    drawNumber: () => void;
    setGameStatus: (status: GameStatus) => void;

    // Player Actions
    joinGame: (name: string, playerId: string) => void;
    updatePlayerCard: (playerId: string, card: number[]) => void;
    rerollCard: (playerId: string, newCard: number[]) => void;
    markNumber: (playerId: string, numberIndex: number) => void;
}

export const useGameStore = create<GameState>()(
    persist(
        (set, get) => ({
            status: 'LOBBY',
            role: null,
            roomId: null,
            drawnNumbers: [],
            currentNumber: null,
            players: [],

            setRole: (role) => set({ role }),
            setRoomId: (roomId) => set({ roomId }),

            setGameStatus: (status) => set({ status }),

            startGame: () => set({ status: 'PLAYING', drawnNumbers: [], currentNumber: null }),

            resetGame: () => set({
                status: 'LOBBY',
                drawnNumbers: [],
                currentNumber: null,
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
                // Prevent duplicate join for same ID
                if (state.players.some(p => p.id === playerId)) return state;

                return {
                    players: [...state.players, {
                        id: playerId,
                        name,
                        card: [],
                        markedIndices: [],
                        hasBingo: false
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
        }),
        {
            name: 'bingo-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
            partialize: (state) => ({
                // Only persist these fields to recover session
                role: state.role,
                roomId: state.roomId,
                // players: state.players, // Maybe risky to persist all players if host? 
                // ideally host persists everything, player persists only self details?
                // For simplicity, persist all for now, assuming peer sync handles the rest on reconnect.
                // Actually, if we persist 'players', we might have stale data. 
                // But we need it for 'reconnect as existing player'.
                players: state.players
            }),
        }
    )
);
