import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export const BoxesCore = ({ className, ...rest }: { className?: string }) => {
    const colors = [
        "rgb(52 211 153)",  // emerald-400
        "rgb(16 185 129)",  // emerald-500
        "rgb(110 231 183)", // emerald-300
        "rgb(125 211 252)", // sky-300
        "rgb(134 239 172)", // green-300
        "rgb(147 197 253)", // blue-300
        "rgb(165 180 252)", // indigo-300
        "rgb(196 181 253)", // violet-300
        "rgb(216 180 254)", // purple-300
    ];

    const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

    // Calculate grid to fill viewport — 40px cells
    const cols = 50;
    const rows = 40;

    const cells = useMemo(() => {
        const arr = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                arr.push({ r, c, hasPlus: r % 3 === 0 && c % 3 === 0 });
            }
        }
        return arr;
    }, []);

    return (
        <div
            className={cn(
                "absolute inset-0 w-full h-full z-0 overflow-hidden",
                className
            )}
            {...rest}
        >
            <div
                className="absolute inset-0"
                style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${cols}, 40px)`,
                    gridTemplateRows: `repeat(${rows}, 40px)`,
                    width: `${cols * 40}px`,
                    height: `${rows * 40}px`,
                }}
            >
                {cells.map(({ r, c, hasPlus }) => (
                    <motion.div
                        key={`${r}-${c}`}
                        whileHover={{
                            backgroundColor: getRandomColor(),
                            transition: { duration: 0 },
                        }}
                        className="border-r border-b border-slate-300/20 dark:border-slate-700/30 relative"
                    >
                        {hasPlus && (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="absolute h-4 w-4 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-slate-300/30 dark:text-slate-700/40 stroke-[1px] pointer-events-none"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
                            </svg>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export const Boxes = React.memo(BoxesCore);
