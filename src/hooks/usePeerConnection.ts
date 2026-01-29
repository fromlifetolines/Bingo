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
    | { type: 'GAME_STARTED' } // New: Host notifies game start
    | { type: 'RESET_GAME' };

export const usePeerConnection = () => {
    const {
        role,
        setRoomId,
        joinGame,
        drawNumber: storeDrawNumber,
        drawnNumbers,
        currentNumber
    } = useGameStore();

    const peerRef = useRef<Peer | null>(null);
    const connectionsRef = useRef<DataConnection[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<'DISCONNECTED' | 'CONNECTING' | 'CONNECTED'>('DISCONNECTED');

    const handleData = (data: Payload) => {
        switch (data.type) {
            case 'PLAYER_JOIN':
                if (role === 'HOST') {
                    joinGame(data.payload.name, data.payload.id);
                }
                break;

            case 'PLAYER_LOCK':
                if (role === 'HOST') {
                    useGameStore.getState().lockCard(data.payload);
                }
                break;

            case 'GAME_STARTED':
                if (role === 'PLAYER') {
                    useGameStore.getState().setGameStatus('PLAYING');
                    const myId = localStorage.getItem('my_bingo_player_id');
                    if (myId) useGameStore.getState().lockCard(myId);
                }
                break;

            case 'ROLLING':
                if (role === 'PLAYER') {
                    useGameStore.getState().setRolling(true);
                }
                break;

            case 'DRAW_NUMBER':
                if (role === 'PLAYER') {
                    useGameStore.setState((state) => ({
                        drawnNumbers: [...state.drawnNumbers, data.payload],
                        currentNumber: data.payload,
                        isRolling: false
                    }));
                }
                break;

            case 'SYNC_STATE':
                if (role === 'PLAYER') {
                    useGameStore.setState(() => ({
                        drawnNumbers: data.payload.drawnNumbers,
                        currentNumber: data.payload.currentNumber,
                        isRolling: false,
                    }));
                }
                break;

            case 'RESET_GAME':
                useGameStore.getState().resetGame();
                break;
        }
    };

    const createRoom = () => {
        if (peerRef.current) return;

        setConnectionStatus('CONNECTING');
        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', (id) => {
            console.log('Host ID:', id);
            setRoomId(id);
            setConnectionStatus('CONNECTED');
        });

        peer.on('connection', (conn) => {
            connectionsRef.current.push(conn);
            console.log('New connection:', conn.peer);

            conn.on('data', (data: any) => handleData(data));

            conn.on('open', () => {
                const state = useGameStore.getState();
                conn.send({
                    type: 'SYNC_STATE',
                    payload: {
                        drawnNumbers: state.drawnNumbers,
                        currentNumber: state.currentNumber,
                    }
                });
                if (state.status === 'PLAYING') {
                    conn.send({ type: 'GAME_STARTED' });
                }
            });
        });
    };

    const joinRoom = (hostId: string, playerName: string) => {
        if (peerRef.current) {
            console.log('Destroying old peer...');
            peerRef.current.destroy();
            peerRef.current = null;
        }

        setConnectionStatus('CONNECTING');
        const peer = new Peer();
        peerRef.current = peer;

        peer.on('open', (id) => {
            console.log('My Player ID:', id);
            const conn = peer.connect(hostId, {
                serialization: 'json',
                reliable: true
            });
            connectionsRef.current = [conn];

            conn.on('open', () => {
                console.log('Connected to Host');
                setConnectionStatus('CONNECTED');
                setRoomId(hostId);
                conn.send({ type: 'PLAYER_JOIN', payload: { id, name: playerName } });
                joinGame(playerName, id);
            });

            conn.on('data', (data: any) => handleData(data));
            conn.on('error', (err) => {
                console.error('Connection Error:', err);
                setConnectionStatus('DISCONNECTED');
            });
            conn.on('close', () => {
                console.warn('Connection Closed');
                setConnectionStatus('DISCONNECTED');
            });
        });

        peer.on('error', (err) => {
            console.error('Peer Fatal Error:', err);
            setConnectionStatus('DISCONNECTED');
        });
    };

    const broadcast = (data: Payload) => {
        connectionsRef.current.forEach(conn => {
            if (conn.open) conn.send(data);
        });
    };

    const hostDrawNumber = async () => {
        if (useGameStore.getState().status !== 'PLAYING') return;

        broadcast({ type: 'ROLLING' });
        useGameStore.getState().setRolling(true);

        await new Promise(resolve => setTimeout(resolve, 3000));

        storeDrawNumber();
        const state = useGameStore.getState();
        if (state.currentNumber) {
            broadcast({ type: 'DRAW_NUMBER', payload: state.currentNumber });
        }
        useGameStore.getState().setRolling(false);
    };

    const startGame = () => {
        useGameStore.getState().startGame();
        broadcast({ type: 'GAME_STARTED' });
    };

    const lockMyCard = (playerId: string) => {
        useGameStore.getState().lockCard(playerId);
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
    };

    return {
        createRoom,
        joinRoom,
        connectionStatus,
        hostDrawNumber,
        startGame,
        lockMyCard,
        reset
    };
};
