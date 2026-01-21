import * as React from 'react';
import { Check, ChevronsUpDown, MapPin, Navigation, Star, Plus, Trash2, Clock } from 'lucide-react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UK_REGIONS } from '@/lib/carbonApi';
import { useToast } from '@/hooks/use-toast';
import { useSavedLocations } from '@/hooks/useSavedLocations';

interface LocationManagerProps {
  value: string;
  onChange: (value: string) => void;
  showPostcode?: boolean;
}

export function LocationManager({ value, onChange, showPostcode = true }: LocationManagerProps) {
  const [open, setOpen] = React.useState(false);
  const [loadingLocation, setLoadingLocation] = React.useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [locationName, setLocationName] = React.useState('');
  const { toast } = useToast();

  const {
    savedLocations,
    recentLocations,
    saveLocation,
    removeLocation,
    addRecentLocation,
    isLocationSaved,
    getSavedLocationByPostcode,
  } = useSavedLocations();

  const selectedRegion = UK_REGIONS.find((r) => r.postcode === value);
  const savedLocation = getSavedLocationByPostcode(value);

  const handleSelectLocation = (postcode: string) => {
    onChange(postcode);
    addRecentLocation(postcode);
    setOpen(false);
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
          const response = await fetch(
            `https://api.postcodes.io/postcodes?lon=${longitude}&lat=${latitude}`
          );

          if (!response.ok) throw new Error('Failed to fetch location data');

          const data = await response.json();
          const result = data.result?.[0];

          if (result) {
            const outcode = result.outcode;
            const matchedRegion = UK_REGIONS.find(r => outcode.startsWith(r.postcode));

            if (matchedRegion) {
              handleSelectLocation(matchedRegion.postcode);
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
      () => {
        setLoadingLocation(false);
        toast({
          title: 'Location Access Denied',
          description: 'Please enable location access to use this feature.',
          variant: 'destructive',
        });
      }
    );
  };

  const handleSaveLocation = () => {
    if (!locationName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this location.',
        variant: 'destructive',
      });
      return;
    }

    saveLocation(locationName, value);
    setSaveDialogOpen(false);
    setLocationName('');
    toast({
      title: 'Location Saved',
      description: `"${locationName}" has been saved.`,
    });
  };

  const handleRemoveSaved = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeLocation(id);
    toast({
      title: 'Location Removed',
      description: `"${name}" has been removed.`,
    });
  };

  // Filter recent locations to only show valid ones not already saved
  const recentToShow = recentLocations
    .filter(pc => !savedLocations.some(sl => sl.postcode === pc))
    .slice(0, 3);

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select location"
            className="w-auto max-w-[220px] justify-between bg-card/80 backdrop-blur-sm border-border/50 shadow-md h-10"
          >
            <div className="flex items-center gap-2 truncate">
              {savedLocation ? (
                <Star className="w-4 h-4 text-primary shrink-0 fill-primary" aria-hidden="true" />
              ) : (
                <MapPin className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
              )}
              <div className="flex flex-col items-start truncate">
                <span className="truncate text-sm font-medium">
                  {savedLocation?.name || selectedRegion?.name || 'Select location'}
                </span>
                {showPostcode && selectedRegion && (
                  <span className="text-xs text-muted-foreground truncate">
                    {selectedRegion.postcode}
                  </span>
                )}
              </div>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0 bg-card border-border backdrop-blur-xl">
          <Command>
            <CommandInput placeholder="Search locations..." aria-label="Search locations" />
            <CommandList>
              <CommandEmpty>No location found.</CommandEmpty>

              {/* Current Location */}
              <CommandGroup>
                <CommandItem onSelect={handleMyLocation} className="cursor-pointer text-primary font-medium">
                  <Navigation className={cn("mr-2 h-4 w-4", loadingLocation && "animate-spin")} />
                  {loadingLocation ? 'Detecting location...' : 'Use my current location'}
                </CommandItem>
              </CommandGroup>

              {/* Saved Locations */}
              {savedLocations.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Saved Locations">
                    {savedLocations.map((loc) => {
                      const region = UK_REGIONS.find(r => r.postcode === loc.postcode);
                      return (
                        <CommandItem
                          key={loc.id}
                          value={`${loc.name} ${loc.postcode}`}
                          onSelect={() => handleSelectLocation(loc.postcode)}
                          className="cursor-pointer group"
                        >
                          <Star className={cn(
                            'mr-2 h-4 w-4 text-primary',
                            value === loc.postcode ? 'fill-primary' : ''
                          )} />
                          <div className="flex flex-col flex-1">
                            <span className="font-medium">{loc.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {region?.name} · {loc.postcode}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleRemoveSaved(loc.id, loc.name, e)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}

              {/* Recent Locations */}
              {recentToShow.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Recent">
                    {recentToShow.map((postcode) => {
                      const region = UK_REGIONS.find(r => r.postcode === postcode);
                      if (!region) return null;
                      return (
                        <CommandItem
                          key={postcode}
                          value={`recent ${region.name}`}
                          onSelect={() => handleSelectLocation(postcode)}
                          className="cursor-pointer"
                        >
                          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span>{region.name}</span>
                            <span className="text-xs text-muted-foreground">{postcode}</span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}

              {/* Save Current Location */}
              {value && !isLocationSaved(value) && (
                <>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        setOpen(false);
                        setSaveDialogOpen(true);
                      }}
                      className="cursor-pointer text-primary"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Save "{selectedRegion?.name}" as...
                    </CommandItem>
                  </CommandGroup>
                </>
              )}

              <CommandSeparator />
              <CommandGroup heading="All Regions">
                {UK_REGIONS.map((region) => (
                  <CommandItem
                    key={region.postcode}
                    value={region.name}
                    onSelect={() => handleSelectLocation(region.postcode)}
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

      {/* Save Location Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[340px]">
          <DialogHeader>
            <DialogTitle>Save Location</DialogTitle>
            <DialogDescription>
              Give this location a name (e.g., "Home", "Work", "Mum's house")
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="location-name">Name</Label>
              <Input
                id="location-name"
                placeholder="e.g., Home"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSaveLocation();
                  }
                }}
                autoFocus
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Region: {selectedRegion?.name} ({value})
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLocation}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
