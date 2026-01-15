import { MapPin, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RegionSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

// UK regions with their sample postcodes
const regions = [
  { name: 'North Scotland', postcode: 'AB' },
  { name: 'South Scotland', postcode: 'EH' },
  { name: 'North West England', postcode: 'M' },
  { name: 'North East England', postcode: 'NE' },
  { name: 'Yorkshire', postcode: 'LS' },
  { name: 'North Wales & Merseyside', postcode: 'LL' },
  { name: 'South Wales', postcode: 'CF' },
  { name: 'West Midlands', postcode: 'B' },
  { name: 'East Midlands', postcode: 'NG' },
  { name: 'East England', postcode: 'CB' },
  { name: 'South West England', postcode: 'BS' },
  { name: 'South England', postcode: 'SO' },
  { name: 'London', postcode: 'SW' },
  { name: 'South East England', postcode: 'BN' },
];

export function RegionSelector({ value, onChange }: RegionSelectorProps) {
  const selectedRegion = regions.find(r => r.postcode === value);
  
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-auto gap-2 bg-card/80 backdrop-blur-sm border-border/50 shadow-md">
        <MapPin className="w-4 h-4 text-primary" />
        <SelectValue placeholder="Select region">
          {selectedRegion?.name || 'Select region'}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="bg-card border-border">
        {regions.map((region) => (
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