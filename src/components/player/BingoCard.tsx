import { motion } from 'framer-motion';
import { BingoCell } from './BingoCell';

// ...
interface Props {
    numbers: number[];
    markedIndices: number[];
    currentNumber?: number | null;
    onMark: (index: number) => void;
    onSplat?: (x: number, y: number, color: number[]) => void; // V6.0
}

export const BingoCard = ({ numbers, markedIndices, currentNumber, onMark, onSplat }: Props) => {
    const targetStr = currentNumber ? currentNumber.toString() : null;

    return (
        <div className="w-full max-w-sm aspect-square bg-dark-surface p-3 rounded-2xl border border-gray-800 shadow-2xl relative">
            <div className="grid grid-cols-4 gap-2 h-full">
                {numbers.map((number, index) => {
                    const numStr = number.toString();
                    const isMatch = (targetStr && numStr === targetStr);
                    const isMarked = markedIndices.includes(index);
                    const finalMarked = isMarked || isMatch;

                    return (
                        <div key={index}
                            className="relative"
                            onClick={(e) => {
                                // V6.0 FLUID INTERACTION
                                if (onSplat) {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = (e.clientX - rect.left) / rect.width; // relative to cell? No, relative to screen for fluid?
                                    // FluidCanvas is FULL SCREEN. So we need 0-1 relative to window.
                                    const nx = e.clientX / window.innerWidth;
                                    const ny = 1.0 - (e.clientY / window.innerHeight); // WebGL Y is flipped?
                                    // Let's pass normalized screen coords.
                                    const color = finalMarked ? [1.0, 1.0, 0.0] : [0.0, 1.0, 1.0]; // Yellow if matched, Cyan if clicking
                                    onSplat(nx, ny, color);
                                }
                                onMark(index);
                            }}>
                            <BingoCell
                                number={number}
                                isMarked={!!finalMarked}
                                onClick={() => { }} // Handled by wrapper div for event access
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
