import { motion } from 'framer-motion';

interface Props {
    number: number;
    isMarked: boolean;
    onClick?: () => void; // V6.0 Added optional onClick
}

export const BingoCell = ({ number, isMarked, onClick }: Props) => {
    return (
        <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClick}
            className={`
                aspect-square flex items-center justify-center rounded-xl text-2xl font-black relative overflow-hidden cursor-pointer
                ${isMarked
                    ? 'bg-gradient-to-br from-neon-magenta to-purple-600 text-white shadow-[0_0_15px_rgba(255,0,255,0.5)] border-2 border-white'
                    : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-white'
                }
            `}
        >
            {number}
        </motion.div>
    );
};
