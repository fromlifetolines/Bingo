import { motion } from 'framer-motion';

interface Props {
    numbers: number[];
}

export const RecentNumbers = ({ numbers }: Props) => {
    // V4.8: Show ALL history, reversed (Newest first)
    const history = [...numbers].reverse();

    return (
        <div className="flex flex-col gap-2 w-full max-h-[60vh]">
            <h4 className="text-neon-cyan text-sm uppercase tracking-wider mb-2 font-bold">
                Draw History ({history.length})
            </h4>
            <div className="bg-dark-surface/50 p-4 rounded-xl border border-gray-700 overflow-y-auto custom-scrollbar flex-1">
                <div className="flex flex-wrap gap-2 content-start">
                    {history.map((num, i) => {
                        const isNewest = i === 0;
                        return (
                            <motion.div
                                key={`${num}-${i}`} // Use index in key to ensure uniqueness if data is weird, but num should be unique.
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className={`
                                    w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-lg
                                    ${isNewest
                                        ? 'bg-neon-pink text-white scale-110 border-2 border-white'
                                        : 'bg-gray-800 text-gray-300 border border-gray-600'
                                    }
                                `}
                            >
                                {num}
                            </motion.div>
                        );
                    })}
                    {history.length === 0 && <span className="text-gray-500 italic w-full text-center">No numbers drawn yet</span>}
                </div>
            </div>
        </div>
    );
};
