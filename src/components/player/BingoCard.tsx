import { useEffect } from 'react';
import { BingoCell } from './BingoCell';
import { useBingoLogic } from '../../hooks/useBingoLogic';
import confetti from 'canvas-confetti';

interface Props {
    numbers: number[]; // 25 numbers
    markedIndices: number[];
    onMark: (index: number) => void;
}

export const BingoCard = ({ numbers, markedIndices, onMark }: Props) => {
    const { checkBingo } = useBingoLogic();

    // Check for Bingo whenever marked indices change
    const isBingo = checkBingo(markedIndices);

    useEffect(() => {
        if (isBingo) {
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });
            // Optional: Notify host here? Or let the big button do it?
        }
    }, [isBingo]);

    return (
        <div className="grid grid-cols-5 gap-2 w-full max-w-md mx-auto p-2 bg-black/30 rounded-xl backdrop-blur-sm border border-white/10">
            {/* Headers */}
            {['B', 'I', 'N', 'G', 'O'].map(letter => (
                <div key={letter} className="text-center font-black text-neon-cyan text-xl py-2">
                    {letter}
                </div>
            ))}

            {numbers.map((num, i) => (
                <BingoCell
                    key={`${num}-${i}`}
                    number={num}
                    isMarked={markedIndices.includes(i) || num === 0} // 0 is free space
                    onToggle={() => onMark(i)}
                    disabled={num === 0} // Free space automatically marked
                />
            ))}
        </div>
    );
};
