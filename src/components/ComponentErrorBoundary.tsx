import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import * as Sentry from "@sentry/react";
import { logger } from "@/lib/logger";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    name?: string; // e.g. "Chart", "Map"
    className?: string;
}

interface State {
    hasError: boolean;
}

export class ComponentErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(_: Error): State {
        return { hasError: true };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error(`Component boundary error: ${this.props.name || 'Unknown'}`, {
            error,
            componentName: this.props.name,
            componentStack: errorInfo.componentStack,
        });
    }

    private handleRetry = () => {
        this.setState({ hasError: false });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Card className={`p-6 flex flex-col items-center justify-center text-center bg-muted/30 border-dashed ${this.props.className}`}>
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-3">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                        {this.props.name || 'Component'} Unavailable
                    </p>
                    <p className="text-xs text-muted-foreground mb-3 max-w-[200px]">
                        We couldn't load this section.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={this.handleRetry}
                        className="h-8 text-xs"
                    >
                        <RefreshCw className="w-3 h-3 mr-2" />
                        Retry
                    </Button>
                </Card>
            );
        }

        return this.props.children;
    }
}
