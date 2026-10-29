import { Badge } from '@/components/ui/badge';

/**
 * Shared explainer body for Green Score — popovers, first-run tips, History overlay education.
 */
export function GreenScoreExplainerContent() {
  return (
    <div className="space-y-3">
      <div>
        <h4 className="font-semibold text-sm mb-2">How it&apos;s calculated</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Your Green Score is the share of your metered kWh used during low-carbon intensity periods
          (very low + low). Timing demand into clean windows raises it — not just using less.
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-2">Score ratings</h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">70%+</span>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20 text-[10px] h-5"
            >
              Excellent
            </Badge>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">50–69%</span>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20 text-[10px] h-5"
            >
              Good
            </Badge>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">30–49%</span>
            <Badge variant="outline" className="text-[10px] h-5">
              Fair
            </Badge>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Below 30%</span>
            <Badge variant="outline" className="text-[10px] h-5">
              Growing
            </Badge>
          </div>
        </div>
      </div>
      <div>
        <h4 className="font-semibold text-sm mb-2">Improve your score</h4>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
          <li>Check the forecast for clean overnight windows</li>
          <li>Run appliances during sunny, windy days</li>
          <li>Check Power Planner for best windows</li>
          <li>On History, watch yellow usage bars vs dirty intensity spikes</li>
        </ul>
      </div>
    </div>
  );
}
