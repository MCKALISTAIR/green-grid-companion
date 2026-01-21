import * as React from 'react';
import { Check, ChevronsUpDown, MapPin, Navigation, Search } from 'lucide-react';
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
import { searchLocation, getRegionFromCoordinates } from '@/lib/location';

interface RegionSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RegionSelector({ value, onChange }: RegionSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [loadingLocation, setLoadingLocation] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const { toast } = useToast();

  const selectedRegion = UK_REGIONS.find((r) => r.postcode === value);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const result = await searchLocation(searchQuery);

      if (result) {
        onChange(result.regionPostcode);
        setOpen(false);
        toast({
          title: `Found ${result.name}`,
          description: `Setting region to ${result.regionName}`,
        });
      } else {
        toast({
          title: 'Location not found',
          description: `Could not find a region matching "${searchQuery}"`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Search failed', error);
      toast({
        title: 'Search failed',
        description: 'Something went wrong while searching.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

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

          const result = await getRegionFromCoordinates(latitude, longitude);

          if (result) {
            onChange(result.regionPostcode);
            setOpen(false);
            toast({
              title: 'Location Updated',
              description: `Set region to ${result.regionName}`,
            });
          } else {
            toast({
              title: 'Region not found',
              description: 'Could not match your location to a supported region.',
              variant: 'destructive',
            });
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

  const filteredRegions = UK_REGIONS.filter(region =>
    region.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    region.postcode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) setSearchQuery('');
    }}>
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
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search regions..."
            aria-label="Search regions"
            value={searchQuery}
            onValueChange={setSearchQuery}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          <CommandList>
            <CommandEmpty className="py-2 px-2 text-sm">
              {isSearching ? (
                <span className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Search className="w-4 h-4 animate-pulse" /> Searching...
                </span>
              ) : searchQuery ? (
                <div className="flex flex-col gap-2">
                  <p className="text-muted-foreground text-center pb-2">No direct region match.</p>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleSearch}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search for "{searchQuery}"
                  </Button>
                </div>
              ) : (
                "No region found."
              )}
            </CommandEmpty>

            {!searchQuery && (
              <>
                <CommandGroup>
                  <CommandItem onSelect={handleMyLocation} className="cursor-pointer text-primary font-medium">
                    <Navigation className={cn("mr-2 h-4 w-4", loadingLocation && "animate-spin")} />
                    {loadingLocation ? 'Detecting location...' : 'Use my current location'}
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            <CommandGroup heading="Regions">
              {filteredRegions.map((region) => (
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