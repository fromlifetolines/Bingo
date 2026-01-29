import { motion } from 'framer-motion';

interface Props {
    numbers: number[];
}

export const RecentNumbers = ({ numbers }: Props) => {
    // Take the last 5 numbers, excluding the very last one (current), reversed
    // actually, let's just show the last few drawn in reverse order
    const recent = [...numbers].reverse().slice(1, 6);

    return (
        <div className="flex flex-col gap-2 w-full">
            <h4 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Recent Draws</h4>
            <div className="flex flex-wrap gap-2 content-start h-32 overflow-y-auto pr-2 custom-scrollbar">
                {recent.map((num, i) => (
                    <motion.div
                        key={`${num}-${i}`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-10 h-10 rounded-full border border-gray-600 flex items-center justify-center bg-dark-surface font-mono font-bold text-gray-300 flex-shrink-0"
                    >
                        {num}
                    </motion.div>
                ))}
                {recent.length === 0 && <span className="text-gray-600 text-sm italic">No history</span>}
            </div>
        </div>
    );
};
