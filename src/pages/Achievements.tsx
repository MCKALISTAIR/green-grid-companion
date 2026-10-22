import { useState } from 'react';
import { useAchievements } from '@/hooks/useAchievements';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';

export default function AchievementsPage() {
  const { achievements } = useAchievements();

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const totalCount = achievements.length;
  const [openId, setOpenId] = useState<string | null>(null);
  const progressPercent = Math.round((unlockedCount / totalCount) * 100);

  return (
    <div className="page-shell page-shell--fit">
      <div className="page-shell-inner space-y-6">
        <PageHeader title="Trophy Room" />

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 py-6 text-center space-y-2">
            <div className="text-4xl font-bold font-mono tabular-nums text-primary">
              <span aria-hidden="true">
                {unlockedCount}
                <span className="text-xl text-muted-foreground font-semibold">/{totalCount}</span>
              </span>
              <span className="sr-only">
                {unlockedCount} of {totalCount} achievements unlocked
              </span>
            </div>
            <Progress
              value={progressPercent}
              className="h-2 mt-4 max-w-xs mx-auto"
              aria-label={`${unlockedCount} of ${totalCount} achievements unlocked`}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {achievements.map((achievement, idx) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04, ease: 'easeOut' as const }}
              whileHover={{ y: -2 }}
            >
              <Card
                className={`overflow-hidden h-full transition-all duration-300 ${
                  achievement.unlocked
                    ? 'border-primary/15 ring-1 ring-primary/10'
                    : 'bg-muted/30 border-dashed'
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left p-4 flex gap-4 items-start min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-[inherit]"
                  aria-expanded={openId === achievement.id}
                  onClick={() =>
                    setOpenId((cur) => (cur === achievement.id ? null : achievement.id))
                  }
                >
                  <div
                    className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                      achievement.unlocked
                        ? 'bg-primary/10'
                        : 'bg-muted text-muted-foreground grayscale'
                    }`}
                  >
                    {achievement.unlocked ? (
                      <motion.span
                        whileHover={{ rotate: [0, -12, 12, 0], scale: 1.15 }}
                        transition={{ duration: 0.35 }}
                        className="cursor-default select-none"
                      >
                        {achievement.icon}
                      </motion.span>
                    ) : (
                      <Lock className="w-5 h-5" />
                    )}
                  </div>
                  <div className="space-y-1.5 flex-1 w-full">
                    <div className="flex items-center justify-between gap-2">
                      <h3
                        className={`font-semibold ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}
                      >
                        {achievement.title}
                      </h3>
                      {achievement.unlocked && (
                        <Badge
                          variant="secondary"
                          className="bg-primary/10 text-primary hover:bg-primary/15"
                        >
                          Unlocked
                        </Badge>
                      )}
                    </div>
                    {/* Copy cut: how-to-earn shows on tap; screen readers always get it. */}
                    <p
                      className={
                        openId === achievement.id
                          ? 'text-sm text-muted-foreground leading-snug'
                          : 'sr-only'
                      }
                    >
                      {achievement.description}
                    </p>
                  </div>
                </button>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
