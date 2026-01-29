import { useRef, useState } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { useGameStore } from '../store/gameStore';

type Payload =
    | { type: 'SYNC_STATE'; payload: any }
    | { type: 'DRAW_NUMBER'; payload: number }
    | { type: 'PLAYER_JOIN'; payload: { id: string; name: string } }
    | { type: 'PLAYER_BINGO'; payload: string }
    | { type: 'RESET_GAME' };

export const usePeerConnection = () => {
    const {
        role,
        setRoomId,
        joinGame,
        drawNumber: storeDrawNumber,
        drawnNumbers, // to sync new players
        currentNumber
    } = useGameStore();

    const peerRef = useRef<Peer | null>(null);
    const connectionsRef = useRef<DataConnection[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');

    const handleData = (data: Payload) => {
        console.log('Received:', data);

        switch (data.type) {
            case 'PLAYER_JOIN':
                // Host received player join
                if (role === 'HOST') {
                    joinGame(data.payload.name, data.payload.id);
                }
                break;

            case 'DRAW_NUMBER':
                // Player received number
                if (role === 'PLAYER') {
                    useGameStore.setState((state) => ({
                        drawnNumbers: [...state.drawnNumbers, data.payload],
                        currentNumber: data.payload
                    }));
                }
                break;

            case 'SYNC_STATE':
                if (role === 'PLAYER') {
                    useGameStore.setState(() => ({
                        drawnNumbers: data.payload.drawnNumbers,
                        currentNumber: data.payload.currentNumber
                    }));
                }
                break;

            case 'RESET_GAME':
                useGameStore.getState().resetGame();
                break;
        }
    };

    // HOST: Create Room
    const createRoom = () => {
        if (peerRef.current) return;

        setConnectionStatus('CONNECTING');
        const peer = new Peer(); // Auto-generate ID
        peerRef.current = peer;

        peer.on('open', (id) => {
            console.log('Host ID:', id);
            setRoomId(id);
            setConnectionStatus('CONNECTED');
        });

        peer.on('connection', (conn) => {
            connectionsRef.current.push(conn);
            console.log('New connection:', conn.peer);

            conn.on('data', (data: any) => {
                handleData(data);
            });

            // Sync initial state to new player
            conn.on('open', () => {
                conn.send({
                    type: 'SYNC_STATE',
                    payload: { drawnNumbers, currentNumber }
                });
            });
        });
    };

    // PLAYER: Join Room
    const joinRoom = (hostId: string, playerName: string) => {
        if (peerRef.current) return;

        setConnectionStatus('CONNECTING');
        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', (id) => {
            const conn = peer.connect(hostId);
            connectionsRef.current = [conn]; // Player only has one connection (to Host)

            conn.on('open', () => {
                setConnectionStatus('CONNECTED');
                setRoomId(hostId);
                // Send join event
                conn.send({ type: 'PLAYER_JOIN', payload: { id, name: playerName } });
                // Local join
                joinGame(playerName, id);
            });

            conn.on('data', (data: any) => {
                handleData(data);
            });

            conn.on('error', (err) => {
                console.error('Connection Error:', err);
                setConnectionStatus('DISCONNECTED');
            });
        });
    };

    const broadcast = (data: Payload) => {
        connectionsRef.current.forEach(conn => {
            if (conn.open) conn.send(data);
        });
    };

    // Wrapper for Host actions that also need to broadcast
    const hostDrawNumber = () => {
        storeDrawNumber();
        const state = useGameStore.getState();
        if (state.currentNumber) {
            broadcast({ type: 'DRAW_NUMBER', payload: state.currentNumber });
        }
    };

    const reset = () => {
        useGameStore.getState().resetGame();
        broadcast({ type: 'RESET_GAME' });
    };

    return {
        createRoom,
        joinRoom,
        connectionStatus,
        hostDrawNumber,
        reset
    };
};
