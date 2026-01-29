import { motion } from 'framer-motion';

interface Props {
    number: number;
    isMarked: boolean;
    onMark: () => void;
}

export const BingoCell = ({ number, isMarked, onMark }: Props) => {
    return (
        <motion.div
            whileTap={{ scale: 0.9 }}
            onClick={onMark}
            className={`
                aspect-square rounded-xl flex items-center justify-center text-xl font-bold cursor-pointer transition-all border-2
                ${isMarked
                    ? 'bg-yellow-400 border-yellow-500 text-black shadow-[0_0_15px_rgba(250,204,21,0.6)] scale-105 z-10' // Fix 2: Permanent High-Contrast
                    : 'bg-dark-surface border-gray-700 text-gray-300 hover:border-neon-cyan hover:text-white hover:shadow-[0_0_10px_rgba(0,243,255,0.2)]'
                }
            `}
        >
            {number}
        </motion.div>
    );
};
