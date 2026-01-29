import { motion } from 'framer-motion';

interface Props {
    numbers: number[];
}

export const RecentNumbers = ({ numbers }: Props) => {
    // Take the last 5 numbers, excluding the very last one (current), reversed
    // actually, let's just show the last few drawn in reverse order
    const recent = [...numbers].reverse().slice(1, 6);

    return (
        <div className="flex flex-col gap-2">
            <h4 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Recent Draws</h4>
            <div className="flex gap-3">
                {recent.map((num, i) => (
                    <motion.div
                        key={`${num}-${i}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1 - i * 0.15, x: 0 }}
                        className="w-12 h-12 rounded-full border border-gray-600 flex items-center justify-center bg-dark-surface font-mono font-bold text-gray-300"
                    >
                        {num}
                    </motion.div>
                ))}
                {recent.length === 0 && <span className="text-gray-600 text-sm italic">No history</span>}
            </div>
        </div>
    );
};
