import { MapPin, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { UK_REGIONS } from '@/lib/carbonApi';

interface RegionSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RegionSelector({ value, onChange }: RegionSelectorProps) {
  const selectedRegion = UK_REGIONS.find(r => r.postcode === value);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-auto max-w-[180px] gap-2 bg-card/80 backdrop-blur-sm border-border/50 shadow-md">
        <MapPin className="w-4 h-4 text-primary shrink-0" />
        <SelectValue placeholder="Select region" className="truncate">
          <span className="truncate">{selectedRegion?.name || 'Select region'}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        {UK_REGIONS.map((region) => (
          <SelectItem
            key={region.postcode}
            value={region.postcode}
            className="focus:bg-accent"
          >
            <div className="flex items-center gap-2">
              <span>{region.name}</span>
              <span className="text-xs text-muted-foreground">({region.postcode})</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}