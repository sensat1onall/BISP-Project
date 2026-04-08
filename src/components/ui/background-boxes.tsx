import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";

export const BoxesCore = ({ className, ...rest }: { className?: string }) => {
    const rows = new Array(150).fill(1);
    const cols = new Array(100).fill(1);

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

    const getRandomColor = () => {
        return colors[Math.floor(Math.random() * colors.length)];
    };

    return (
        <div
            style={{
                transform: `translate(-40%,-60%) skewX(-48deg) skewY(14deg) scale(0.675) rotate(0deg) translateZ(0)`,
            }}
            className={cn(
                "absolute -left-[40%] p-4 -top-[40%] flex w-[300%] h-[300%] z-0",
                className
            )}
            {...rest}
        >
            {rows.map((_, i) => (
                <div
                    key={`row${i}`}
                    className="w-16 h-8 border-l border-slate-300/30 dark:border-slate-700/40 relative"
                >
                    {cols.map((_, j) => (
                        <motion.div
                            whileHover={{
                                backgroundColor: getRandomColor(),
                                transition: { duration: 0 },
                            }}
                            animate={{
                                transition: { duration: 2 },
                            }}
                            key={`col${j}`}
                            className="w-16 h-8 border-r border-t border-slate-300/30 dark:border-slate-700/40 relative"
                        >
                            {j % 2 === 0 && i % 2 === 0 ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="absolute h-6 w-10 -top-[14px] -left-[22px] text-slate-300/30 dark:text-slate-700/40 stroke-[1px] pointer-events-none"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 6v12m6-6H6"
                                    />
                                </svg>
                            ) : null}
                        </motion.div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export const Boxes = React.memo(BoxesCore);
