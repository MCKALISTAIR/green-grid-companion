import * as React from 'react';
import {
  Check,
  ChevronsUpDown,
  MapPin,
  Navigation,
  Star,
  Plus,
  Trash2,
  Clock,
  Search,
} from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogTrigger,
  useIsSheetLayout,
} from '@/components/ui/responsive-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UK_REGIONS } from '@/lib/carbonApi';
import { toast } from 'sonner';
import { useSavedLocations } from '@/hooks/useSavedLocations';
import { searchLocation, getRegionFromCoordinates } from '@/lib/location';
import { setGenericSharedRegion } from '@/lib/sharedPrefs';
import { logger } from '@/lib/logger';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

interface LocationManagerProps {
  value: string;
  onChange: (value: string) => void;
  showPostcode?: boolean;
  trigger?: React.ReactNode;
}

export function LocationManager({
  value,
  onChange,
  showPostcode = true,
  trigger,
}: LocationManagerProps) {
  // Phones: the picker is a bottom sheet (motion spec §2.3); desktop keeps the popover.
  const sheet = useIsSheetLayout();
  const PickerRoot = (sheet ? ResponsiveDialog : Popover) as React.ElementType;
  const PickerTrigger = (sheet ? ResponsiveDialogTrigger : PopoverTrigger) as React.ElementType;
  const PickerContent = (sheet ? ResponsiveDialogContent : PopoverContent) as React.ElementType;
  const [open, setOpen] = React.useState(false);
  const [loadingLocation, setLoadingLocation] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [locationName, setLocationName] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

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

    // Sync to iOS Widget via App Group
    // We need the RegionID (number), not the postcode.
    // Let's find the region from the postcode or just pass the postcode if the widget supports it?
    // The widget logic I wrote expects "regionId" (Int) for URL construction.
    // I need to map postcode -> regionId here.
    const region = UK_REGIONS.find((r) => r.postcode === postcode);
    if (region) {
      // region.activeRegionId (or similar?)
      // UK_REGIONS has `id`? Let's check `carbonApi.ts`.
      // Assuming it has an ID, let's pass it.
      setGenericSharedRegion(String(region.id));
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const result = await searchLocation(searchQuery);

      if (result) {
        handleSelectLocation(result.regionPostcode);
        toast.success(`Found ${result.name}`, {
          description: `Setting region to ${result.regionName}`,
        });
      } else {
        toast.error('Location not found', {
          description: `No region matches "${searchQuery}"`,
        });
      }
    } catch (error) {
      logger.error('Location search failed', { error, query: searchQuery });
      toast.error('Search failed', {
        description: 'Something went wrong while searching.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleMyLocation = async () => {
    setLoadingLocation(true);
    try {
      let latitude: number;
      let longitude: number;

      if (Capacitor.isNativePlatform()) {
        const position = await Geolocation.getCurrentPosition({ timeout: 8000 });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } else if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } else {
        throw new Error('Geolocation not supported');
      }

      // Use our robust location utility
      const result = await getRegionFromCoordinates(latitude, longitude);

      if (result) {
        handleSelectLocation(result.regionPostcode);
        toast.success('Location Updated', {
          description: `Set region to ${result.regionName}`,
        });
      } else {
        toast.error('Region not found', {
          description: "Couldn't match you to a GB region.",
        });
      }
    } catch (error) {
      logger.error('Geolocation error', { error });
      toast.error("Couldn't find you", {
        description: "Couldn't find your region. Pick one instead.",
      });
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSaveLocation = () => {
    if (!locationName.trim()) {
      toast.error('Name required', {
        description: 'Give this location a name.',
      });
      return;
    }

    saveLocation(locationName, value);
    setSaveDialogOpen(false);
    setLocationName('');
    toast.success('Location Saved', {
      description: `Saved "${locationName}".`,
    });
  };

  const handleRemoveSaved = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeLocation(id);
    toast.info('Location Removed', {
      description: `Removed "${name}".`,
    });
  };

  // Filter recent locations to only show valid ones not already saved
  const recentToShow = recentLocations
    .filter((pc) => !savedLocations.some((sl) => sl.postcode === pc))
    .slice(0, 3);

  // Filter regions based on search for the standard list
  const filteredRegions = UK_REGIONS.filter(
    (region) =>
      region.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      region.postcode.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <>
      <PickerRoot
        open={open}
        onOpenChange={(isOpen: boolean) => {
          setOpen(isOpen);
          if (!isOpen) setSearchQuery(''); // Reset search on close
        }}
        {...(sheet ? { detents: 'tall' as const } : {})}
      >
        <PickerTrigger asChild>
          {trigger ? (
            trigger
          ) : (
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
                    {savedLocation?.name || selectedRegion?.name || value || 'Select location'}
                  </span>
                  {showPostcode && (selectedRegion || value) && (
                    <span className="text-xs text-muted-foreground truncate">
                      {selectedRegion?.postcode || value}
                    </span>
                  )}
                </div>
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
            </Button>
          )}
        </PickerTrigger>
        <PickerContent
          className="w-[320px] p-0 bg-card border-border backdrop-blur-xl"
          {...(sheet ? { sheetClassName: 'bg-background' } : {})}
        >
          {sheet && (
            <ResponsiveDialogTitle className="sr-only">Choose location</ResponsiveDialogTitle>
          )}
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Postcode, town or region…"
              aria-label="Search locations"
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
                    <p className="text-muted-foreground text-center pb-2">
                      No direct region match.
                    </p>
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
                  "Can't find that place"
                )}
              </CommandEmpty>

              {/* Current Location */}
              {!searchQuery && (
                <CommandGroup>
                  <CommandItem
                    onSelect={handleMyLocation}
                    className="cursor-pointer text-primary font-medium"
                  >
                    <Navigation className={cn('mr-2 h-4 w-4', loadingLocation && 'animate-spin')} />
                    {loadingLocation ? 'Finding you…' : 'Use my current location'}
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Saved Locations - Filtered if searching */}
              {savedLocations.length > 0 &&
                (!searchQuery ||
                  savedLocations.some((l) =>
                    l.name.toLowerCase().includes(searchQuery.toLowerCase()),
                  )) && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Saved Locations">
                      {savedLocations
                        .filter(
                          (l) =>
                            !searchQuery ||
                            l.name.toLowerCase().includes(searchQuery.toLowerCase()),
                        )
                        .map((loc) => {
                          const region = UK_REGIONS.find((r) => r.postcode === loc.postcode);
                          return (
                            <CommandItem
                              key={loc.id}
                              value={`${loc.name} ${loc.postcode}`}
                              onSelect={() => handleSelectLocation(loc.postcode)}
                              className="cursor-pointer group"
                            >
                              <Star
                                className={cn(
                                  'mr-2 h-4 w-4 text-primary',
                                  value === loc.postcode ? 'fill-primary' : '',
                                )}
                              />
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
              {!searchQuery && recentToShow.length > 0 && (
                <>
                  <CommandSeparator />
                  <CommandGroup heading="Recent">
                    {recentToShow.map((postcode) => {
                      const region = UK_REGIONS.find((r) => r.postcode === postcode);
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
              {!searchQuery && value && !isLocationSaved(value) && (
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
                      Save "{selectedRegion?.name || value}" as...
                    </CommandItem>
                  </CommandGroup>
                </>
              )}

              <CommandSeparator />
              <CommandGroup heading="Regions">
                {filteredRegions.map((region) => (
                  <CommandItem
                    key={region.postcode}
                    value={region.name}
                    onSelect={() => handleSelectLocation(region.postcode)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === region.postcode ? 'opacity-100' : 'opacity-0',
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
        </PickerContent>
      </PickerRoot>

      {/* Save Location Dialog */}
      <ResponsiveDialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <ResponsiveDialogContent className="sm:max-w-[340px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Save Location</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Give it a name, like &quot;Home&quot;, &quot;Work&quot; or &quot;Mum&apos;s
              house&quot;.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="location-name">Name</Label>
              <Input
                id="location-name"
                placeholder="e.g. Home"
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
              Region: {selectedRegion?.name || 'Local Region'} ({value})
            </p>
          </div>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLocation}>Save</Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
