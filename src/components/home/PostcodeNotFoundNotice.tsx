import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LocationManager } from '@/components/LocationManager';
import { POSTCODE_NOT_FOUND_COPY } from '@/lib/voice/statesCopy';

interface PostcodeNotFoundNoticeProps {
  postcode: string;
  onChangePostcode: (value: string) => void;
}

/**
 * Home notice when the saved postcode doesn't exist. Same words in both tones.
 * Fix postcode opens the location picker directly (Settings has no location
 * section), as the off-grid notice does.
 */
export function PostcodeNotFoundNotice({
  postcode,
  onChangePostcode,
}: PostcodeNotFoundNoticeProps) {
  return (
    <div
      role="status"
      data-testid="postcode-not-found"
      className="mx-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg flex items-start gap-3 text-sm text-amber-800 dark:text-amber-200 animate-in fade-in"
    >
      <AlertTriangle
        className="w-5 h-5 shrink-0 mt-0.5 text-amber-700 dark:text-amber-500"
        aria-hidden="true"
      />
      <div className="space-y-2">
        <p className="font-semibold">{POSTCODE_NOT_FOUND_COPY.title(postcode)}</p>
        <p>{POSTCODE_NOT_FOUND_COPY.body}</p>
        <LocationManager
          value={postcode}
          onChange={onChangePostcode}
          trigger={
            <Button variant="outline" className="h-11">
              {POSTCODE_NOT_FOUND_COPY.action}
            </Button>
          }
        />
      </div>
    </div>
  );
}
