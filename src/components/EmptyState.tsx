import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface EmptyStateProps {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
    fullScreen?: boolean;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    fullScreen = false
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center ${fullScreen ? 'min-h-[60vh]' : 'py-12'}`}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="mb-6"
            >
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                    <Icon className="w-10 h-10 text-muted-foreground/60" />
                </div>
            </motion.div>

            <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="space-y-2"
            >
                <h3 className="text-xl font-semibold text-foreground">{title}</h3>
                <p className="text-muted-foreground max-w-sm leading-relaxed">
                    {description}
                </p>
            </motion.div>

            {action && (
                <motion.div
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 }}
                    className="mt-6"
                >
                    {action}
                </motion.div>
            )}
        </div>
    );
}
