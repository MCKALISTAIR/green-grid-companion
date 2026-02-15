import { motion } from 'framer-motion';

interface SimpleFactoryProps {
    className?: string;
    isNight?: boolean;
    style?: React.CSSProperties;
}

/**
 * Minimalist geometric factory icon that matches the app's flat design aesthetic
 */
export function SimpleFactory({ className = '', isNight = false, style }: SimpleFactoryProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={className}
            style={style}
            fill="currentColor"
            aria-hidden="true"
        >
            {/* Main building - simple rectangle */}
            <rect x="10" y="50" width="35" height="45" rx="2" opacity="0.9" />

            {/* Second building section - stepped */}
            <rect x="45" y="35" width="30" height="60" rx="2" opacity="0.85" />

            {/* Tall chimney/smokestack 1 */}
            <rect x="20" y="25" width="8" height="25" rx="1" opacity="0.95" />

            {/* Tall chimney/smokestack 2 */}
            <rect x="55" y="15" width="8" height="20" rx="1" opacity="0.95" />

            {/* Windows - simple squares */}
            {isNight && (
                <>
                    <rect x="17" y="60" width="6" height="6" fill="#fbbf24" opacity="0.8" rx="0.5" />
                    <rect x="30" y="60" width="6" height="6" fill="#fbbf24" opacity="0.7" rx="0.5" />
                    <rect x="17" y="75" width="6" height="6" fill="#fbbf24" opacity="0.6" rx="0.5" />
                    <rect x="52" y="50" width="6" height="6" fill="#fbbf24" opacity="0.8" rx="0.5" />
                    <rect x="62" y="50" width="6" height="6" fill="#fbbf24" opacity="0.7" rx="0.5" />
                </>
            )}
        </svg>
    );
}

interface AnimatedSimpleFactoryProps extends SimpleFactoryProps {
    delay?: number;
}

/**
 * Animated version that fades in
 */
export function AnimatedSimpleFactory({ delay = 0, ...props }: AnimatedSimpleFactoryProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4, delay }}
        >
            <SimpleFactory {...props} />
        </motion.div>
    );
}
