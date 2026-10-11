import { useState } from 'react';
import { motion } from 'framer-motion';
import { NotificationSettings } from '@/components/NotificationSettings';
import { OctopusIntegration } from '@/components/OctopusIntegration';
import { AccountBackup } from '@/components/AccountBackup';
import { YearWrapped } from '@/components/YearWrapped';
import { useOctopusEnergy } from '@/hooks/useOctopusEnergy';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import { useEnergyFacts } from '@/hooks/useEnergyFacts';
import { useSceneDirector } from '@/hooks/useSceneDirector';
import { useSettings } from '@/hooks/useSettings';
import { useProductTour } from '@/hooks/useProductTour';
import { useCarbonData } from '@/hooks/useCarbonData';
import { useAppLocation } from '@/contexts/LocationContext';
import { useOffline } from '@/hooks/useOffline';
import { useSceneType } from '@/hooks/useSceneType';
import {
  settingsContainerVariants,
  settingsItemVariants,
} from '@/components/settings/settingsMotion';
import { SettingsBadgesSection } from '@/components/settings/SettingsBadgesSection';
import { SettingsHouseholdSection } from '@/components/settings/SettingsHouseholdSection';
import { SettingsDesktopCompanion } from '@/components/settings/SettingsDesktopCompanion';
import { SettingsPreferencesSection } from '@/components/settings/SettingsPreferencesSection';
import { SettingsResourcesSection } from '@/components/settings/SettingsResourcesSection';
import { SettingsSupportSection } from '@/components/settings/SettingsSupportSection';
import { SettingsDataSyncSection } from '@/components/settings/SettingsDataSyncSection';
import { SettingsDebugSection } from '@/components/settings/SettingsDebugSection';
import { SettingsFooter } from '@/components/settings/SettingsFooter';
import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsSectionHeading } from '@/components/settings/SettingsSectionHeading';

export default function Settings() {
  const [showYearWrapped, setShowYearWrapped] = useState(false);
  const { isLinked } = useOctopusEnergy();
  const { hasNewVersion } = useVersionCheck();
  const { tone, setTone } = useEnergyFacts();
  const { unlocked, handleVersionTap } = useSceneDirector();
  const {
    houseType,
    setHouseType,
    customAnnualKwh,
    setCustomAnnualKwh,
    showGridFrequency,
    setShowGridFrequency,
    isSyncing,
    lastSyncedAt,
    syncNow,
  } = useSettings();
  const { replayTour } = useProductTour();
  const { postcode } = useAppLocation();
  const {
    lastUpdated: gridLastUpdated,
    refetch: refetchGrid,
    isBackgroundFetching: isGridFetching,
  } = useCarbonData(postcode);
  const { isOffline } = useOffline();
  const {
    preference: scenePreference,
    setPreference: setScenePreference,
    autoDetected,
  } = useSceneType();

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Not yet synced';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isMac = typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh');

  return (
    <div className="page-shell page-shell--fit">
      <motion.div
        className="page-shell-inner space-y-8"
        variants={settingsContainerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={settingsItemVariants}>
          <PageHeader
            title="Settings"
            description="Notifications, meter link, and preferences."
          />
        </motion.div>

        <motion.div variants={settingsItemVariants} className="space-y-4">
          <SettingsSectionHeading>Account</SettingsSectionHeading>
          <AccountBackup
            isSyncing={isSyncing}
            lastSyncedAt={lastSyncedAt}
            onSyncNow={syncNow}
            formatLastSync={formatLastSync}
          />
        </motion.div>

        <motion.div variants={settingsItemVariants}>
          <OctopusIntegration />
        </motion.div>

        <motion.div variants={settingsItemVariants}>
          <NotificationSettings />
        </motion.div>

        <SettingsBadgesSection />

        <SettingsHouseholdSection
          houseType={houseType}
          setHouseType={setHouseType}
          customAnnualKwh={customAnnualKwh}
          setCustomAnnualKwh={setCustomAnnualKwh}
        />

        {isMac && <SettingsDesktopCompanion />}

        <SettingsPreferencesSection
          tone={tone}
          setTone={setTone}
          showGridFrequency={showGridFrequency}
          setShowGridFrequency={setShowGridFrequency}
          scenePreference={scenePreference}
          setScenePreference={setScenePreference}
          autoDetected={autoDetected}
          replayTour={replayTour}
        />

        <SettingsResourcesSection
          hasNewVersion={hasNewVersion}
          onShowYearWrapped={() => setShowYearWrapped(true)}
        />

        <SettingsSupportSection />

        <SettingsFooter
          isLinked={isLinked}
          unlocked={unlocked}
          onVersionClick={handleVersionTap}
        />

        <SettingsDataSyncSection
          gridLastUpdated={gridLastUpdated}
          refetchGrid={refetchGrid}
          isGridFetching={isGridFetching}
          isOffline={isOffline}
        />

        {/* "Trigger Error" test tools: dev builds, or after unlocking Director Mode. */}
        {(import.meta.env.DEV || unlocked) && <SettingsDebugSection />}
      </motion.div>

      <YearWrapped
        open={showYearWrapped}
        onOpenChange={setShowYearWrapped}
        year={new Date().getFullYear()}
      />
    </div>
  );
}
