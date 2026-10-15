import { X, Trophy, PartyPopper } from 'lucide-react';
import { FuelRecord } from '@/hooks/useFuelStreaks';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface FuelRecordCelebrationProps {
  record: FuelRecord;
  onDismiss: () => void;
}

export function FuelRecordCelebration({ record, onDismiss }: FuelRecordCelebrationProps) {
  const fuelName = record.fuel.charAt(0).toUpperCase() + record.fuel.slice(1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      className="relative overflow-hidden rounded-xl bg-gradient-to-br from-chart-4/20 via-chart-5/20 to-chart-4/10 border border-chart-4/30 p-4 shadow-lg"
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-chart-4/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-chart-5/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-chart-4/20 rounded-full shrink-0">
              <Trophy className="w-5 h-5 text-chart-4" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-chart-4 flex items-center gap-2">
                New {fuelName}-Free Record!
                <PartyPopper className="w-4 h-4" />
              </h3>
              <p className="text-sm text-foreground/80">
                The UK grid has gone{' '}
                <span className="font-bold text-chart-4">
                  {record.newRecord}
                  {record.exceededLookback ? '+' : ''} days
                </span>{' '}
                without using {fuelName.toLowerCase()}.
              </p>
              {record.previousRecord > 0 && (
                <p className="text-xs text-muted-foreground">
                  Previous record: {record.previousRecord} days
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
            aria-label={`Dismiss ${fuelName}-free record`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

interface FuelRecordListProps {
  records: FuelRecord[];
  onDismiss: (fuel: string) => void;
}

export function FuelRecordList({ records, onDismiss }: FuelRecordListProps) {
  if (records.length === 0) return null;

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {records.map((record) => (
          <FuelRecordCelebration
            key={record.fuel}
            record={record}
            onDismiss={() => onDismiss(record.fuel)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
