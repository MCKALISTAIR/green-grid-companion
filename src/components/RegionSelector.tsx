import * as React from 'react';
import { Check, ChevronsUpDown, MapPin, Navigation } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { UK_REGIONS } from '@/lib/carbonApi';
import { useToast } from '@/hooks/use-toast';

interface RegionSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RegionSelector({ value, onChange }: RegionSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [loadingLocation, setLoadingLocation] = React.useState(false);
  const { toast } = useToast();

  const selectedRegion = UK_REGIONS.find((r) => r.postcode === value);

  const handleMyLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation not supported',
        description: 'Your browser does not support geolocation.',
        variant: 'destructive',
      });
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Use postcodes.io free API to get postcode from coordinates
          const response = await fetch(
            `https://api.postcodes.io/postcodes?lon=${longitude}&lat=${latitude}`
          );

          if (!response.ok) throw new Error('Failed to fetch location data');

          const data = await response.json();
          // Get outward code (e.g. SW from SW1A 1AA) or just use the full postcode to match roughly
          const result = data.result?.[0];

          if (result) {
            // Try to find a region match. 
            // The API returns 'outcode' like 'SW1A'. UK_REGIONS uses strict prefixes like 'SW'.
            // We need to match the start.
            const outcode = result.outcode; // e.g. "SW1A"

            // Find the best matching region prefix
            // e.g. if we have SW1A, we want 'SW'. If we have 'EH1', we want 'EH'.
            // Simple approach: check if any region postcode is a prefix of the outcode.
            const matchedRegion = UK_REGIONS.find(r => outcode.startsWith(r.postcode));

            if (matchedRegion) {
              onChange(matchedRegion.postcode);
              setOpen(false);
              toast({
                title: 'Location Updated',
                description: `Set region to ${matchedRegion.name}`,
              });
            } else {
              toast({
                title: 'Region not found',
                description: 'Could not match your location to a supported region.',
                variant: 'destructive',
              });
            }
          }
        } catch (error) {
          console.error('Location error:', error);
          toast({
            title: 'Location Error',
            description: 'Failed to detect your region. Please select manually.',
            variant: 'destructive',
          });
        } finally {
          setLoadingLocation(false);
        }
      },
      (error) => {
        setLoadingLocation(false);
        toast({
          title: 'Location Access Denied',
          description: 'Please enable location access to use this feature.',
          variant: 'destructive',
        });
      }
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select region"
          className="w-auto max-w-[200px] justify-between bg-card/80 backdrop-blur-sm border-border/50 shadow-md h-10"
        >
          <div className="flex items-center gap-2 truncate">
            <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">
              {selectedRegion?.name || 'Select region'}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-card border-border backdrop-blur-xl">
        <Command>
          <CommandInput placeholder="Search regions..." aria-label="Search regions" />
          <CommandList>
            <CommandEmpty>No region found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={handleMyLocation} className="cursor-pointer text-primary font-medium">
                <Navigation className={cn("mr-2 h-4 w-4", loadingLocation && "animate-spin")} />
                {loadingLocation ? 'Detecting location...' : 'Use my current location'}
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Regions">
              {UK_REGIONS.map((region) => (
                <CommandItem
                  key={region.postcode}
                  value={region.name}
                  onSelect={() => {
                    onChange(region.postcode);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === region.postcode ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{region.name}</span>
                    <span className="text-xs text-muted-foreground">{region.postcode}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}