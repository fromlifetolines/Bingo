import { motion } from 'framer-motion';
import { BingoCell } from './BingoCell';

interface Props {
    numbers: number[];
    markedIndices: number[];
    onMark: (index: number) => void;
}

export const BingoCard = ({ numbers, markedIndices, onMark }: Props) => {
    return (
        <div className="w-full max-w-sm aspect-square bg-dark-surface p-3 rounded-2xl border border-gray-800 shadow-2xl relative">
            {/* Grid Container */}
            <div className="grid grid-cols-4 gap-2 h-full">
                {/* Changed from grid-cols-5 to grid-cols-4 */}
                {numbers.map((number, index) => {
                    const isMarked = markedIndices.includes(index);

                    return (
                        <BingoCell
                            key={index}
                            number={number}
                            isMarked={isMarked}
                            onClick={() => onMark(index)}
                        />
                    );
                })}
            </div>
        </div>
    );
};
