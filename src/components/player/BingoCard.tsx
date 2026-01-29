import { motion } from 'framer-motion';
import { BingoCell } from './BingoCell';

interface Props {
    numbers: number[];
    markedIndices: number[];
    currentNumber?: number | null; // V4.2 New Prop
    onMark: (index: number) => void;
}

export const BingoCard = ({ numbers, markedIndices, currentNumber, onMark }: Props) => {
    // Helper to safely compare numbers/strings
    const targetStr = currentNumber ? currentNumber.toString() : null;

    return (
        <div className="w-full max-w-sm aspect-square bg-dark-surface p-3 rounded-2xl border border-gray-800 shadow-2xl relative">
            {/* Grid Container */}
            <div className="grid grid-cols-4 gap-2 h-full">
                {/* Changed from grid-cols-5 to grid-cols-4 */}
                {numbers.map((number, index) => {
                    const numStr = number.toString();

                    // V4.2 FORCE RENDER CHECK (Auto-Mark Visual Fallback)
                    const isMatch = (targetStr && numStr === targetStr);
                    const isMarked = markedIndices.includes(index);

                    // If it matches current number, we treat it as "Highlighted" or "Marked" visually
                    // We can pass a special flag or just use isMarked = true if match
                    // Let's pass forceHighlight to BingoCell if needed, or just set isMarked=true
                    const finalMarked = isMarked || isMatch;

                    return (
                        <BingoCell
                            key={index}
                            number={number}
                            isMarked={!!finalMarked}
                            onClick={() => onMark(index)}
                        />
                    );
                })}
            </div>
        </div>
    );
};
