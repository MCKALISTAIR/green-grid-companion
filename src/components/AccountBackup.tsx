import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudOff, LogOut, Mail, RefreshCw, ChevronDown, ChevronUp, ArrowRightLeft, Trash2, Download } from 'lucide-react';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { APP_SCHEME } from '@/config';
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

// Storage key for previous anonymous user ID
const ANON_USER_ID_KEY = 'octopus-anon-user-id';

interface AccountBackupProps {
  isSyncing?: boolean;
  lastSyncedAt?: Date | null;
  onSyncNow?: () => void;
  formatLastSync?: (date: Date | null) => string;
}

export function AccountBackup({ isSyncing, lastSyncedAt, onSyncNow, formatLastSync }: AccountBackupProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<'google' | 'apple' | null>(null);
  const migrationAttemptedRef = useRef(false);

  const defaultFormatLastSync = (date: Date | null) => {
    if (!date) return 'Not yet synced';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const formatFn = formatLastSync || defaultFormatLastSync;

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const previousUser = user;
      setUser(session?.user ?? null);

      // Handle sign-in event - attempt data migration
      if (event === 'SIGNED_IN' && session?.user && !migrationAttemptedRef.current) {
        migrationAttemptedRef.current = true;

        // Check if there's a stored anonymous user ID to migrate from
        const storedAnonId = localStorage.getItem(ANON_USER_ID_KEY);

        if (storedAnonId && storedAnonId !== session.user.id) {
          // Attempt to migrate data from the anonymous session
          try {
            const { data, error } = await supabase.functions.invoke('octopus-energy', {
              body: { action: 'migrate-data', previousUserId: storedAnonId }
            });

            if (!error && data?.migrated) {
              const { credentials, meters, consumption_records, footprint_records } = data.migrated;
              if (credentials || meters > 0) {
                toast.success(
                  `Restored your Octopus data: ${meters} meter(s), ${footprint_records} footprint records`
                );
              }
            }
          } catch (err) {
            console.error('Data migration failed:', err);
          }

          // Clear the stored anon ID after migration attempt
          localStorage.removeItem(ANON_USER_ID_KEY);
        }
      }

      // Store anonymous user ID when signing out
      if (event === 'SIGNED_OUT' && previousUser?.id) {
        localStorage.setItem(ANON_USER_ID_KEY, previousUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [user]);

  const handleSignIn = async (provider: 'google' | 'apple') => {
    setLoading(true);

    // Store current user ID before sign-in for potential migration
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user?.id) {
      localStorage.setItem(ANON_USER_ID_KEY, currentSession.user.id);
    }

    try {
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let redirectUri: string;
      
      if (Capacitor.isNativePlatform()) {
        redirectUri = `${APP_SCHEME}://auth/callback`;
      } else if (isLocalhost) {
        // Localhost can't be used as OAuth redirect — use the preview URL instead
        redirectUri = 'https://gridsense-app.lovable.app';
      } else {
        redirectUri = window.location.origin;
      }

      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: redirectUri,
      });

      if (error) {
        toast.error(`Sign in failed: ${error.message}`);
      }
    } catch (err) {
      toast.error('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    migrationAttemptedRef.current = false; // Reset for next sign-in
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
    } catch (err) {
      toast.error('Sign out failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-account');

      if (error) {
        toast.error('Account deletion failed. Please try again.');
        console.error('Delete account error:', error);
        return;
      }

      // Clear all local storage
      localStorage.clear();

      // Sign out locally (server account is already deleted)
      await supabase.auth.signOut({ scope: 'local' });

      toast.success('Your account and all data have been permanently deleted.');
      setShowDeleteDialog(false);
    } catch (err) {
      console.error('Delete account error:', err);
      toast.error('Account deletion failed. Please try again.');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmText('');
    }
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-data');

      if (error) {
        toast.error('Data export failed. Please try again.');
        console.error('Export error:', error);
        return;
      }

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gridsense-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Your data export has been downloaded.');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('Data export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSwitchProvider = (target: 'google' | 'apple') => {
    setSwitchTarget(target);
    setShowSwitchDialog(true);
  };

  const confirmSwitchProvider = async () => {
    if (!switchTarget || !user) return;
    setShowSwitchDialog(false);
    setLoading(true);

    try {
      // Store current user ID for data migration
      localStorage.setItem(ANON_USER_ID_KEY, user.id);
      migrationAttemptedRef.current = false;

      // Sign out first
      await supabase.auth.signOut();

      // Sign in with the new provider
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      let redirectUri: string;
      
      if (Capacitor.isNativePlatform()) {
        redirectUri = `${APP_SCHEME}://auth/callback`;
      } else if (isLocalhost) {
        redirectUri = 'https://gridsense-app.lovable.app';
      } else {
        redirectUri = window.location.origin;
      }

      const { error } = await lovable.auth.signInWithOAuth(switchTarget, {
        redirect_uri: redirectUri,
      });

      if (error) {
        toast.error(`Switch failed: ${error.message}`);
        localStorage.removeItem(ANON_USER_ID_KEY);
      }
      // On redirect, the onAuthStateChange SIGNED_IN handler will trigger migration
    } catch (err) {
      toast.error('Provider switch failed. Please try again.');
      localStorage.removeItem(ANON_USER_ID_KEY);
    } finally {
      setLoading(false);
      setSwitchTarget(null);
    }
  };

  // Determine the most recently used provider by checking the identity with the latest updated_at
  const getActiveProvider = (): string => {
    const identities = user?.identities;
    if (identities && identities.length > 0) {
      // Sort by last_sign_in_at or updated_at descending to find the most recently used
      const sorted = [...identities].sort((a, b) => {
        const aTime = new Date(a.last_sign_in_at || a.updated_at || 0).getTime();
        const bTime = new Date(b.last_sign_in_at || b.updated_at || 0).getTime();
        return bTime - aTime;
      });
      return sorted[0]?.provider || 'email';
    }
    return user?.app_metadata?.provider || 'email';
  };

  const activeProvider = getActiveProvider();
  const alternateProvider: 'google' | 'apple' = activeProvider === 'apple' ? 'google' : 'apple';
  const alternateProviderName = alternateProvider === 'google' ? 'Google' : 'Apple';

  // Get the sign-in provider display info
  const getProvider = (): { name: string; icon: React.ReactNode } => {
    if (activeProvider === 'google') {
      return {
        name: 'Google',
        icon: (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        ),
      };
    }

    if (activeProvider === 'apple') {
      return {
        name: 'Apple',
        icon: (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
        ),
      };
    }

    return { name: 'Email', icon: <Mail className="w-3.5 h-3.5" /> };
  };

  const providerInfo = getProvider();

  if (user) {
    return (
      <Card className="p-3">
        {/* Compact header - always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-primary/10 rounded-full">
              <Cloud className="w-4 h-4 text-primary" />
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate max-w-[180px]">{user.email}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                  {isSyncing ? (
                    <>
                      <RefreshCw className="w-2.5 h-2.5 mr-1 animate-spin" />
                      Syncing
                    </>
                  ) : (
                    'Synced'
                  )}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {providerInfo.icon}
                <span>via {providerInfo.name}</span>
                <span className="mx-1">•</span>
                <span>{formatFn(lastSyncedAt ?? null)}</span>
              </div>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Expandable section */}
        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onSyncNow}
                disabled={isSyncing}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleSignOut}
                disabled={loading}
              >
                <LogOut className="w-3.5 h-3.5 mr-1.5" />
                Sign Out
              </Button>
            </div>
            {/* Primary Actions Group */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={handleExportData}
                disabled={loading || isExporting}
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                {isExporting ? 'Exporting...' : 'Export Data'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleSwitchProvider(alternateProvider)}
                disabled={loading}
              >
                <ArrowRightLeft className="w-3.5 h-3.5 mr-2" />
                Switch Account
              </Button>
            </div>

            {/* Destructive Actions Group */}
            <div className="pt-2 mt-1 border-t border-border/50">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 px-1 font-medium">Danger Zone</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted"
                  onClick={handleSignOut}
                  disabled={loading}
                >
                  <LogOut className="w-3.5 h-3.5 mr-2" />
                  Sign Out
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={loading || isDeleting}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Switch Provider Confirmation Dialog */}
        <AlertDialog open={showSwitchDialog} onOpenChange={setShowSwitchDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Switch to {alternateProviderName}?</AlertDialogTitle>
              <AlertDialogDescription>
                Your energy data (Octopus meters, consumption history, carbon footprint, and Tesla data) will be transferred to your new {alternateProviderName} account. You'll be signed out and redirected to sign in with {alternateProviderName}.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmSwitchProvider}>
                Switch to {alternateProviderName}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Account Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) setDeleteConfirmText('');
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>This will <strong>permanently delete</strong> all your data including:</p>
                  <ul className="list-disc pl-5 space-y-1 text-sm">
                    <li>Octopus Energy credentials and meter data</li>
                    <li>Energy consumption and carbon footprint history</li>
                    <li>Tesla integration and charging sessions</li>
                    <li>Saved locations and preferences</li>
                    <li>Your authentication account</li>
                  </ul>
                  <p className="font-medium">This action cannot be undone.</p>
                  <div className="pt-2">
                    <label className="text-sm text-muted-foreground">
                      Type <span className="font-mono font-bold">DELETE</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                      placeholder="DELETE"
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      autoComplete="off"
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete Account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-muted rounded-full">
          <CloudOff className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium">Backup Your Data</h3>
          <p className="text-sm text-muted-foreground">Sign in to sync across devices</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Your Octopus Energy data is currently stored locally. Sign in to back it up and restore it on any device.
      </p>

      <div className="space-y-2">
        <Button
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={() => handleSignIn('google')}
          disabled={loading}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </Button>

        <Button
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={() => handleSignIn('apple')}
          disabled={loading}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Continue with Apple
        </Button>
      </div>
    </Card>
  );
}
