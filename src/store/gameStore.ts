import { create } from 'zustand';

export type GameStatus = 'LOBBY' | 'PLAYING' | 'GAME_OVER';
export type UserRole = 'HOST' | 'PLAYER' | null;

export interface Player {
    id: string;
    name: string;
    card: number[]; // Flat array of 25 numbers (0 for free space/marked?)
    markedIndices: number[]; // Indices of numbers marked by player
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

    // Player Actions
    joinGame: (name: string, playerId: string) => void;
    updatePlayerCard: (playerId: string, card: number[]) => void;
    markReceivedNumber: (playerId: string, number: number) => void; // For verifying if needed logic happens here
}

export const useGameStore = create<GameState>((set, get) => ({
    status: 'LOBBY',
    role: null,
    roomId: null,
    drawnNumbers: [],
    currentNumber: null,
    players: [],

    setRole: (role) => set({ role }),
    setRoomId: (roomId) => set({ roomId }),

    startGame: () => set({ status: 'PLAYING', drawnNumbers: [], currentNumber: null }),

    resetGame: () => set({
        status: 'LOBBY',
        drawnNumbers: [],
        currentNumber: null,
        players: [] // Maybe keep players but reset their state? For now hard reset.
    }),

    drawNumber: () => {
        const { drawnNumbers } = get();
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

    joinGame: (name, playerId) => set((state) => ({
        players: [...state.players, {
            id: playerId,
            name,
            card: [],
            markedIndices: [],
            hasBingo: false
        }]
    })),

    updatePlayerCard: (playerId, card) => set((state) => ({
        players: state.players.map(p =>
            p.id === playerId ? { ...p, card } : p
        )
    })),

    markReceivedNumber: () => {
        // This might be where we'd add server-side validation if this was a real backend
        // For now, this is just a placeholder or could be used by Host to track player progress if we sync card states
    }
}));
