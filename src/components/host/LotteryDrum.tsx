import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useSoundEffects } from '../../hooks/useSoundEffects';

interface Props {
    currentNumber: number | null;
}

const BALL_COLORS = {
    B: 'border-neon-cyan text-neon-cyan shadow-[0_0_20px_rgba(0,243,255,0.4)]',
    I: 'border-neon-magenta text-neon-magenta shadow-[0_0_20px_rgba(255,0,255,0.4)]',
    N: 'border-yellow-400 text-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]',
    G: 'border-green-400 text-green-400 shadow-[0_0_20px_rgba(74,222,128,0.4)]',
    O: 'border-purple-400 text-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.4)]',
};

const getLetter = (num: number) => {
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
};

export const LotteryDrum = ({ currentNumber }: Props) => {
    const [displayNumber, setDisplayNumber] = useState<number | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const { playShuffle, stopShuffle } = useSoundEffects();

    useEffect(() => {
        if (currentNumber !== null) {
            // Start rolling effect
            setIsRolling(true);
            playShuffle();

            const interval = setInterval(() => {
                setDisplayNumber(Math.floor(Math.random() * 75) + 1);
            }, 50); // Fast shuffle

            // Stop after 2 seconds and show real number
            const timeout = setTimeout(() => {
                clearInterval(interval);
                stopShuffle();
                setDisplayNumber(currentNumber);
                setIsRolling(false);
            }, 2000);

            return () => {
                clearInterval(interval);
                clearTimeout(timeout);
                stopShuffle();
            };
        }
    }, [currentNumber, playShuffle, stopShuffle]);

    // Determine style based on rolling state or final number
    const currentStyle = isRolling
        ? 'border-gray-500 text-gray-400 animate-pulse' // Generic style while rolling
        : displayNumber
            ? BALL_COLORS[getLetter(displayNumber) as keyof typeof BALL_COLORS]
            : 'border-gray-700 text-gray-700';

    return (
        <div className="flex items-center justify-center p-10">
            <div className="relative w-72 h-72 flex items-center justify-center">
                {/* Outer Ring - Las Vegas Lights style */}
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-gray-800 animate-[spin_8s_linear_infinite]" />
                <div className="absolute inset-0 rounded-full border-t-4 border-neon-cyan/30 animate-[spin_3s_linear_infinite_reverse]" />

                <AnimatePresence mode="popLayout">
                    {displayNumber ? (
                        <motion.div
                            key={isRolling ? 'rolling' : displayNumber}
                            initial={isRolling ? { scale: 0.8, filter: 'blur(4px)' } : { scale: 1.2, filter: 'blur(0px)' }}
                            animate={isRolling
                                ? { scale: [0.9, 1.1, 0.9], transition: { repeat: Infinity, duration: 0.2 } }
                                : { scale: 1, filter: 'blur(0px)', rotate: [0, -5, 5, 0], transition: { type: "spring", bounce: 0.5 } }
                            }
                            className={`
                w-56 h-56 rounded-full border-8 bg-deep-gray 
                flex flex-col items-center justify-center 
                z-10 bg-opacity-95 backdrop-blur-xl shadow-2xl
                ${currentStyle}
                transition-colors duration-200
              `}
                        >
                            <span className="text-5xl font-bold uppercase opacity-60 mb-2">
                                {isRolling ? '??' : getLetter(displayNumber)}
                            </span>
                            <span className={`font-black ${isRolling ? 'text-9xl opacity-50' : 'text-9xl'}`}>
                                {displayNumber}
                            </span>
                        </motion.div>
                    ) : (
                        <div className="text-neon-cyan/50 text-2xl font-black font-mono animate-pulse tracking-widest text-center">
                            READY<br />TO DRAW
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};
