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
                    const drawnNum = data.payload;
                    useGameStore.setState((state) => ({
                        drawnNumbers: [...state.drawnNumbers, drawnNum],
                        currentNumber: drawnNum,
                        isRolling: false
                    }));

                    // Fix 3 (Auto-Mark Fix): Type-Safe Logic
                    const myId = localStorage.getItem('my_bingo_player_id');
                    if (myId) {
                        const state = useGameStore.getState();
                        const me = state.players.find(p => p.id === myId);

                        if (me) {
                            // FORCE STRING COMPARISON to avoid Number vs String bugs
                            const foundIndex = me.card.findIndex(n => n.toString() === drawnNum.toString());

                            if (foundIndex !== -1) {
                                // Auto-mark locally
                                state.markNumber(myId, foundIndex);
                                // Optional: trigger vibration if available (handled in component usually, but logic here is requested)
                                if (navigator.vibrate) navigator.vibrate(50);
                            }
                        }
                    }
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
        const state = useGameStore.getState();
        if (state.status !== 'PLAYING') return;
        if (state.isRolling) return; // Prevent double clicks

        // 1. START ROLLING (Immediate)
        state.setRolling(true);
        // Play sound if possible? (Hook usage limitation in non-component, skipping direct sound call, relying on UI to react to isRolling)

        // BROADCAST "ROLLING" STATE ONLY. DO NOT SEND THE NUMBER YET.
        broadcast({ type: 'ROLLING' });

        // 2. WAIT FOR ANIMATION (3 Seconds Hard Delay)
        setTimeout(() => {
            // 3. GENERATE & BROADCAST RESULT (Delayed)
            storeDrawNumber(); // This generates the number in store
            const newState = useGameStore.getState();
            // We need to stop rolling
            state.setRolling(false);

            // Broadcast the ACTUAL number now
            if (newState.currentNumber) {
                broadcast({ type: 'DRAW_NUMBER', payload: newState.currentNumber });
            }
        }, 3000); // 3000ms delay
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
