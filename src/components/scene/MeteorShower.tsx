import { motion } from 'framer-motion';

export function MeteorShower() {
    // Grounded at Y=10-80 (sky layer)
    // Diagonal streaks from top to mid-sky

    return (
        <motion.div
            className="absolute inset-0 pointer-events-none overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
        >
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                <defs>
                    {/* Meteor gradient - white to transparent */}
                    <linearGradient id="meteorGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="white" stopOpacity="0" />
                        <stop offset="30%" stopColor="white" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.3" />
                    </linearGradient>
                </defs>

                {/* Multiple meteors with staggered timing */}
                {Array.from({ length: 12 }).map((_, i) => {
                    const startX = 50 + i * 30;
                    const startY = 5 + Math.random() * 20;
                    const length = 40 + Math.random() * 30;
                    const angle = 45 + Math.random() * 20; // Diagonal fall

                    return (
                        <motion.g key={i}>
                            {/* Meteor trail */}
                            <motion.line
                                x1={startX}
                                y1={startY}
                                x2={startX + length * Math.cos((angle * Math.PI) / 180)}
                                y2={startY + length * Math.sin((angle * Math.PI) / 180)}
                                stroke="url(#meteorGrad)"
                                strokeWidth={1.5 + Math.random()}
                                strokeLinecap="round"
                                initial={{
                                    pathLength: 0,
                                    opacity: 0,
                                    x: 0,
                                    y: 0,
                                }}
                                animate={{
                                    pathLength: [0, 1, 1],
                                    opacity: [0, 1, 0],
                                    x: [0, 60],
                                    y: [0, 60],
                                }}
                                transition={{
                                    duration: 1.5 + Math.random() * 0.5,
                                    delay: i * 0.2,
                                    ease: 'easeOut',
                                }}
                            />

                            {/* Meteor head (bright point) */}
                            <motion.circle
                                cx={startX + length * Math.cos((angle * Math.PI) / 180)}
                                cy={startY + length * Math.sin((angle * Math.PI) / 180)}
                                r={2}
                                fill="white"
                                initial={{
                                    opacity: 0,
                                    x: 0,
                                    y: 0,
                                }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    x: [0, 60],
                                    y: [0, 60],
                                }}
                                transition={{
                                    duration: 1.5 + Math.random() * 0.5,
                                    delay: i * 0.2,
                                    ease: 'easeOut',
                                }}
                            />
                        </motion.g>
                    );
                })}
            </svg>
        </motion.div>
    );
}
