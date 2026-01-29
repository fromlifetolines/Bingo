import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
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

// 4x4 mode ranges for coloring/lettering (approximate)
const getLetter = (num: number) => {
    if (num <= 19) return 'N';
    if (num <= 38) return 'E';
    if (num <= 57) return 'O';
    return 'N'; // Just using NEON for 4 columns? Or just stick to standard?
    // User said "16-Grid". Standard 75 ball has 5 ranges. 
    // Let's stick to simple "Ball" logic or standard Bingo letters if using 1-75.
    // 1-15 B, 16-30 I ... 
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

    // Slot machine scrolling numbers
    const [scrollNumbers, setScrollNumbers] = useState<number[]>([]);

    useEffect(() => {
        if (currentNumber !== null) {
            setIsRolling(true);
            playShuffle();

            // Generate a sequence of random numbers for the "blur" effect
            const sequence = Array.from({ length: 20 }, () => Math.floor(Math.random() * 75) + 1);
            setScrollNumbers(sequence);

            // After animation, show the result
            const timeout = setTimeout(() => {
                setIsRolling(false);
                stopShuffle();
                setDisplayNumber(currentNumber);
            }, 2500);

            return () => {
                clearTimeout(timeout);
                stopShuffle();
            };
        }
    }, [currentNumber, playShuffle, stopShuffle]);

    const currentLetter = displayNumber ? getLetter(displayNumber) : '';
    const colorClass = displayNumber
        ? BALL_COLORS[currentLetter as keyof typeof BALL_COLORS] || 'border-white text-white'
        : 'border-gray-700 text-gray-700';

    return (
        <div className="flex items-center justify-center p-10">
            <div className="relative w-80 h-80 flex items-center justify-center">
                {/* Decorative Rings */}
                <div className="absolute inset-0 rounded-full border-4 border-dashed border-gray-800 animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-0 rounded-full border-t-4 border-neon-cyan/50 animate-[spin_2s_linear_infinite]" />

                {/* The Drum */}
                <div className={`
             w-64 h-64 rounded-full border-8 bg-deep-gray 
             flex flex-col items-center justify-center overflow-hidden
             z-10 bg-opacity-95 backdrop-blur-xl shadow-2xl relative
             ${isRolling ? 'border-neon-magenta shadow-[0_0_30px_rgba(255,0,255,0.3)]' : colorClass}
             transition-all duration-500
        `}>
                    <AnimatePresence mode="wait">
                        {isRolling ? (
                            <motion.div
                                className="flex flex-col items-center justify-start absolute top-0"
                                animate={{ y: [0, -1000] }}
                                transition={{ duration: 2.5, ease: "linear" }}
                            >
                                {/* Render a tall strip of numbers for sliding effect */}
                                {scrollNumbers.concat(scrollNumbers).map((n, i) => (
                                    <div key={i} className="h-64 flex items-center justify-center text-8xl font-black text-gray-500 blur-[2px]">
                                        {n}
                                    </div>
                                ))}
                            </motion.div>
                        ) : displayNumber ? (
                            <motion.div
                                key={displayNumber}
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="flex flex-col items-center"
                            >
                                <span className="text-4xl font-bold uppercase opacity-60 mb-2">{getLetter(displayNumber)}</span>
                                <span className="text-9xl font-black dropping-shadow-neon">{displayNumber}</span>
                            </motion.div>
                        ) : (
                            <div className="text-neon-cyan/40 text-2xl font-black font-mono animate-pulse text-center">
                                WAITING
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
