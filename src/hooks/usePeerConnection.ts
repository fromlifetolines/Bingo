import { useRef, useState } from 'react';
import Peer, { type DataConnection } from 'peerjs';
import { useGameStore } from '../store/gameStore';

type Payload =
    | { type: 'SYNC_STATE'; payload: any }
    | { type: 'DRAW_NUMBER'; payload: number }
    | { type: 'ROLLING' } // New
    | { type: 'PLAYER_JOIN'; payload: { id: string; name: string } }
    | { type: 'PLAYER_BINGO'; payload: string }
    | { type: 'PLAYER_LOCK'; payload: string } // New: Player sends this to Host
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

            case 'PLAYER_LOCK':
                if (role === 'HOST') {
                    useGameStore.getState().lockCard(data.payload);
                }
                break;

            case 'ROLLING':
                // Players show rolling state
                if (role === 'PLAYER') {
                    useGameStore.getState().setRolling(true);
                }
                break;

            case 'DRAW_NUMBER':
                // Player received number
                if (role === 'PLAYER') {
                    useGameStore.setState((state) => ({
                        drawnNumbers: [...state.drawnNumbers, data.payload],
                        currentNumber: data.payload,
                        isRolling: false // Stop rolling when number arrives
                    }));
                }
                break;

            case 'SYNC_STATE':
                if (role === 'PLAYER') {
                    useGameStore.setState(() => ({
                        drawnNumbers: data.payload.drawnNumbers,
                        currentNumber: data.payload.currentNumber,
                        isRolling: false
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
        // Safe refresh: if peer exists, it might be in an old state. Destroy it.
        if (peerRef.current) {
            console.log('Destroying old peer before joining new room...');
            peerRef.current.destroy();
            peerRef.current = null;
        }

        setConnectionStatus('CONNECTING');
        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', (id) => {
            console.log('My Player ID:', id);
            console.log(`Attempting to connect to Host: ${hostId}`);

            // Connect with reliable serialization
            const conn = peer.connect(hostId, {
                serialization: 'json',
                reliable: true
            });

            connectionsRef.current = [conn];

            conn.on('open', () => {
                console.log('✅ Connection to Host OPEN!');
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

            conn.on('close', () => {
                console.warn('Connection to Host CLOSED.');
                setConnectionStatus('DISCONNECTED');
            });
        });

        peer.on('error', (err) => {
            console.error('Peer Fatal Error:', err);
            // If ID is taken (rare with random) or network fails
            setConnectionStatus('DISCONNECTED');
        });
    };

    const broadcast = (data: Payload) => {
        connectionsRef.current.forEach(conn => {
            if (conn.open) conn.send(data);
        });
    };

    // Wrapper for Host actions that also need to broadcast
    const hostDrawNumber = async () => {
        // 1. Broadcast Rolling immediately
        if (useGameStore.getState().status !== 'PLAYING') return;

        broadcast({ type: 'ROLLING' });
        useGameStore.getState().setRolling(true); // Local update

        // 2. Wait for animation (2.5s)
        await new Promise(resolve => setTimeout(resolve, 2500));

        // 3. Draw and Broadcast
        storeDrawNumber();
        const state = useGameStore.getState();
        if (state.currentNumber) {
            broadcast({ type: 'DRAW_NUMBER', payload: state.currentNumber });
        }
        useGameStore.getState().setRolling(false);
    };

    const lockMyCard = (playerId: string) => {
        // Player locks themselves
        useGameStore.getState().lockCard(playerId);
        // Notify host
        if (peerRef.current && connectionsRef.current[0]) {
            connectionsRef.current[0].send({ type: 'PLAYER_LOCK', payload: playerId });
        }
    };

    const reset = () => {
        if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
        }
        connectionsRef.current = [];
        setConnectionStatus('DISCONNECTED');
        useGameStore.getState().resetGame();
        // Cannot broadcast after destroy, but maybe we should broadcast first?
        // Actually, if we destroy, we can't broadcast.
        // But reset is usually for the HOST starting over a SESSION, or a hard reset.
        // If it's a hard reset, destroying is correct.
    };

    return {
        createRoom,
        joinRoom,
        connectionStatus,
        hostDrawNumber,
        lockMyCard,
        reset
    };
};
