import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocationManager } from '@/components/LocationManager';
import type { OffGridArea } from '@/lib/postcode';
import { readTone } from '@/lib/tone';
import { OFF_GRID_HOME_COPY } from '@/lib/voice/statesCopy';

interface OffGridNoticeProps {
  area: OffGridArea;
  postcode: string;
  onChangePostcode: (value: string) => void;
}

/**
 * Home notice when the saved postcode is not on the GB grid. Settings has no
 * location section, so the button opens the same location picker as the
 * header pill.
 */
export function OffGridNotice({ area, postcode, onChangePostcode }: OffGridNoticeProps) {
  const body = readTone() === 'cheeky' ? OFF_GRID_HOME_COPY.bodyCheeky : OFF_GRID_HOME_COPY.body;
  return (
    <div
      role="status"
      className="mx-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start gap-3 text-sm text-amber-800 dark:text-amber-200"
    >
      <AlertTriangle
        className="w-5 h-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-500"
        aria-hidden="true"
      />
      <div className="space-y-2">
        <p className="font-semibold">{OFF_GRID_HOME_COPY[area]}</p>
        <p>{body}</p>
        <LocationManager
          value={postcode}
          onChange={onChangePostcode}
          trigger={
            <Button variant="outline" className="h-11">
              {OFF_GRID_HOME_COPY.action}
            </Button>
          }
        />
      </div>
    </div>
  );
}
