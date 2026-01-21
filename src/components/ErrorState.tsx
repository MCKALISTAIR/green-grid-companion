import { AlertCircle, CloudOff, RefreshCw, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface ErrorStateProps {
    title?: string;
    description?: string;
    retry?: () => void;
    fullScreen?: boolean;
}

export function ErrorState({
    title = "Connection Lost",
    description = "We couldn't connect to the grid. Please check your internet connection.",
    retry,
    fullScreen = false
}: ErrorStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-6 text-center ${fullScreen ? 'min-h-[80vh]' : 'h-full py-12'}`}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative mb-6"
            >
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                    <CloudOff className="w-12 h-12 text-muted-foreground/50" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-destructive rounded-full p-2 border-4 border-background">
                    <AlertCircle className="w-6 h-6 text-destructive-foreground" />
                </div>
            </motion.div>

            <h3 className="text-xl font-bold mb-2 text-foreground">{title}</h3>
            <p className="text-muted-foreground max-w-[300px] mb-6 leading-relaxed">
                {description}
            </p>

            {retry && (
                <Button onClick={retry} size="lg" className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                </Button>
            )}
        </div>
    );
}
