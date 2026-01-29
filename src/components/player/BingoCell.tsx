import { motion } from 'framer-motion';
import clsx from 'clsx';


interface Props {
    number: number;
    isMarked: boolean;
    onToggle: () => void;
    disabled?: boolean;
}

export const BingoCell = ({ number, isMarked, onToggle, disabled }: Props) => {

    const handleClick = () => {
        if (disabled) return;

        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }

        onToggle();
    };

    if (number === 0) {
        return (
            <div className="aspect-square flex items-center justify-center bg-neon-cyan/20 rounded-lg border-2 border-neon-cyan">
                <span className="text-neon-cyan font-bold text-xs uppercase">FREE</span>
            </div>
        );
    }

    return (
        <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleClick}
            disabled={disabled}
            className={clsx(
                "aspect-square flex items-center justify-center rounded-lg text-lg font-bold transition-all duration-300 relative overflow-hidden",
                isMarked
                    ? "bg-neon-magenta text-white shadow-[0_0_15px_rgba(255,0,255,0.5)] border-2 border-neon-magenta"
                    : "bg-dark-surface text-gray-300 border border-gray-700 hover:border-gray-500",
                disabled && "opacity-50 cursor-not-allowed"
            )}
        >
            {/* Background Pulse Animation when marked */}
            {isMarked && (
                <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 0.5, scale: 2 }}
                    className="absolute inset-0 bg-white"
                />
            )}
            <span className="relative z-10">{number}</span>
        </motion.button>
    );
};
