import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Star, Trash2, Pencil, Check, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useSavedLocations, SavedLocation } from '@/hooks/useSavedLocations';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export default function ManageLocations() {
  const {
    savedLocations,
    recentLocations,
    removeLocation,
    updateLocationName,
    clearRecentLocations,
  } = useSavedLocations();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearRecentDialog, setShowClearRecentDialog] = useState(false);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === savedLocations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(savedLocations.map((loc) => loc.id)));
    }
  };

  const startEditing = (location: SavedLocation) => {
    setEditingId(location.id);
    setEditValue(location.name);
  };

  const saveEdit = () => {
    if (editingId && editValue.trim()) {
      updateLocationName(editingId, editValue.trim());
      toast.success('Location name updated');
    }
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const deleteSelected = () => {
    selectedIds.forEach((id) => removeLocation(id));
    toast.success(`Deleted ${selectedIds.size} location${selectedIds.size > 1 ? 's' : ''}`);
    setSelectedIds(new Set());
    setShowDeleteDialog(false);
  };

  const handleClearRecent = () => {
    clearRecentLocations();
    toast.success('Recent locations cleared');
    setShowClearRecentDialog(false);
  };

  return (
    <div className="page-shell page-shell--fit">
      <div className="page-shell-inner space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-11 w-11 shrink-0">
            <Link to="/settings" aria-label="Back to settings">
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Manage Locations</h1>
            <p className="text-muted-foreground text-sm">Edit names and delete saved locations</p>
          </div>
        </div>

        {/* Saved Locations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              Saved Locations
            </h2>
            {savedLocations.length > 0 && (
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedIds.size === savedLocations.length ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>

          {savedLocations.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-card/60 px-4 py-8 text-center">
              <MapPin className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium text-foreground">No saved locations yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Save places from Home to see them here.
              </p>
            </div>
          ) : (
            <motion.div className="space-y-2" layout>
              <AnimatePresence initial={false} mode="popLayout">
                {savedLocations.map((location) => (
                  <motion.div
                    key={location.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    whileHover={{ y: -1, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    transition={{ type: 'spring' as const, stiffness: 500, damping: 30 }}
                    className="flex items-center gap-3 p-3 bg-card border rounded-lg"
                  >
                    <Checkbox
                      checked={selectedIds.has(location.id)}
                      onCheckedChange={() => toggleSelection(location.id)}
                    />

                    {editingId === location.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                          }}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={saveEdit}
                          aria-label="Save name"
                        >
                          <Check className="w-4 h-4 text-primary" aria-hidden="true" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={cancelEdit}
                          aria-label="Cancel editing"
                        >
                          <X className="w-4 h-4 text-destructive" aria-hidden="true" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{location.name}</p>
                          <p className="text-sm text-muted-foreground">{location.postcode}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => startEditing(location)}
                          aria-label={`Edit ${location.name}`}
                        >
                          <Pencil className="w-4 h-4" aria-hidden="true" />
                        </Button>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Bulk Delete Button */}
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {selectedIds.size} Location{selectedIds.size > 1 ? 's' : ''}
              </Button>
            </motion.div>
          )}
        </div>

        {/* Recent Locations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Recent Searches
            </h2>
            {recentLocations.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setShowClearRecentDialog(true)}
              >
                Clear All
              </Button>
            )}
          </div>

          {recentLocations.length === 0 ? (
            <div className="rounded-2xl border border-border/50 bg-card/60 px-4 py-6 text-center">
              <Clock className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
              <p className="font-medium text-foreground">No recent searches</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Locations you look up from Home will show up here.
              </p>
            </div>
          ) : (
            <motion.div className="flex flex-wrap gap-2" layout>
              <AnimatePresence initial={false}>
                {recentLocations.map((postcode) => (
                  <motion.div
                    key={postcode}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring' as const, stiffness: 500, damping: 25 }}
                    className="px-3 py-1.5 bg-muted rounded-full text-sm font-medium cursor-default"
                  >
                    {postcode}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Locations</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {selectedIds.size} location
              {selectedIds.size > 1 ? 's' : ''}? You can&apos;t undo this.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteSelected}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Recent Dialog */}
      <AlertDialog open={showClearRecentDialog} onOpenChange={setShowClearRecentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Recent Searches</AlertDialogTitle>
            <AlertDialogDescription>Clear all your recent searches?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearRecent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
