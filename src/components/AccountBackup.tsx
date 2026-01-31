import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Cloud, CloudOff, LogOut, Mail } from 'lucide-react';
import { lovable } from '@/integrations/lovable/index';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';

// Storage key for previous anonymous user ID
const ANON_USER_ID_KEY = 'octopus-anon-user-id';

export function AccountBackup() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const migrationAttemptedRef = useRef(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      
      // Store user ID for potential migration later
      if (session?.user?.id) {
        const storedAnonId = localStorage.getItem(ANON_USER_ID_KEY);
        if (!storedAnonId) {
          // First time signing in - this user might have had anon data
          // We'll store their ID for future reference
        }
      }
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
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
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

  if (user) {
    return (
      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Cloud className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">Data Backup Active</h3>
              <p className="text-sm text-muted-foreground">Your data syncs across devices</p>
            </div>
          </div>
          <Badge variant="secondary">
            Synced
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm truncate">{user.email}</span>
        </div>

        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleSignOut}
          disabled={loading}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
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
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
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
            <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
          </svg>
          Continue with Apple
        </Button>
      </div>
    </Card>
  );
}
