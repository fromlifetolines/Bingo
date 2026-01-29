import { QRCodeSVG } from 'qrcode.react';

interface Props {
    roomId: string;
}

export const QRCodeDisplay = ({ roomId }: Props) => {
    // Correctly construct URL using current full path (Handles /Bingo/ subpath on GitHub Pages)
    // Uses window.location.href to capture protocol, domain, and path, then appends query param
    const joinUrl = `${window.location.href.split('?')[0]}?join=${roomId}`;

    return (
        <div className="flex flex-col items-center gap-4 p-6 bg-dark-surface rounded-xl border border-neon-cyan/30 shadow-[0_0_15px_rgba(0,243,255,0.2)]">
            <h3 className="text-neon-cyan text-xl font-bold uppercase tracking-widest">Join Game</h3>
            <div className="bg-white p-2 rounded">
                <QRCodeSVG value={joinUrl} size={200} />
            </div>
            <div className="text-center">
                <p className="text-gray-400 text-sm">Scan or visit</p>
                <p className="text-white font-mono text-xs break-all mt-1">{joinUrl}</p>
            </div>
            <div className="mt-2 text-center">
                <span className="text-gray-500 text-xs uppercase">Room ID</span>
                <p className="text-neon-magenta font-mono text-2xl font-bold tracking-wider">{roomId}</p>
            </div>
        </div>
    );
};
