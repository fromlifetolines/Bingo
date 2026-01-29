import { useEffect } from 'react';
import { useGameStore } from './store/gameStore';
import { HostDashboard } from './components/host/HostDashboard';
import { PlayerDashboard } from './components/player/PlayerDashboard';
import { BrandFooter } from './components/shared/BrandFooter';

function App() {
  const { role, setRole } = useGameStore();
  useEffect(() => {
    // Check URL for ?join=ID
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('join');
    if (joinId) {
      setRole('PLAYER');
    }
  }, [setRole]);

  if (role === 'HOST') {
    return <HostDashboard />;
  }

  if (role === 'PLAYER') {
    return <PlayerDashboard />;
  }

  // Lobby
  return (
    <div className="min-h-screen bg-deep-gray text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-12">
        <div className="space-y-4">
          <h1 className="text-6xl font-black bg-gradient-to-r from-neon-cyan to-neon-magenta bg-clip-text text-transparent italic tracking-tighter">
            HOW<br />BINGO
          </h1>
          <p className="text-gray-400 text-lg">The Ultimate Real-Time Event Experience</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setRole('HOST')}
            className="w-full py-4 bg-neon-cyan text-black font-bold rounded-xl text-xl hover:scale-105 transition shadow-[0_0_20px_rgba(0,243,255,0.3)]"
          >
            PROJECTOR MODE (HOST)
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-deep-gray text-gray-500">OR</span>
            </div>
          </div>

          <button
            onClick={() => setRole('PLAYER')}
            className="w-full py-4 border-2 border-neon-magenta text-neon-magenta font-bold rounded-xl text-xl hover:bg-neon-magenta/10 transition"
          >
            JOIN GAME (PLAYER)
          </button>
        </div>

        <p className="text-xs text-gray-600 font-mono">Build v1.1.0 • PeerJS Connected</p>

        <BrandFooter />
      </div>
    </div>
  );
}

export default App;
