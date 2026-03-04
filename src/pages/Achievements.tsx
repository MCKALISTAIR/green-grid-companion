import { useAchievements } from '@/hooks/useAchievements';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Trophy, Lock } from 'lucide-react';

export default function AchievementsPage() {
    const { achievements } = useAchievements();

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const totalCount = achievements.length;
    const progressPercent = Math.round((unlockedCount / totalCount) * 100);

    return (
        <div className="min-h-screen bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
            <div className="p-4 space-y-6 pt-[calc(max(env(safe-area-inset-top),59px)+2rem)]">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        Trophy Room
                    </h1>
                    <p className="text-muted-foreground mt-1">Unlock achievements by exploring and using green energy.</p>
                </div>

                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4 py-6 text-center space-y-2">
                        <div className="text-4xl font-black text-primary">
                            {unlockedCount} <span className="text-xl text-muted-foreground font-semibold">/ {totalCount}</span>
                        </div>
                        <div className="text-sm font-medium text-muted-foreground">Achievements Unlocked</div>
                        <Progress value={progressPercent} className="h-2 mt-4 max-w-xs mx-auto" />
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {achievements.map((achievement) => (
                        <Card
                            key={achievement.id}
                            className={`overflow-hidden transition-all duration-300 ${achievement.unlocked
                                    ? 'bg-card border-border shadow-sm ring-1 ring-primary/10'
                                    : 'bg-muted/30 border-dashed opacity-75'
                                }`}
                        >
                            <CardContent className="p-4 flex gap-4 items-start">
                                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-2xl shadow-inner ${achievement.unlocked
                                        ? 'bg-primary/10'
                                        : 'bg-muted text-muted-foreground/50 grayscale'
                                    }`}>
                                    {achievement.unlocked ? achievement.icon : <Lock className="w-5 h-5" />}
                                </div>
                                <div className="space-y-1.5 flex-1 w-full">
                                    <div className="flex items-center justify-between">
                                        <h3 className={`font-semibold ${achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            {achievement.title}
                                        </h3>
                                        {achievement.unlocked && (
                                            <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20">
                                                Unlocked
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground/80 leading-snug">
                                        {achievement.description}
                                    </p>

                                    {/* Progress Bar for multi-step achievements */}
                                    {!achievement.unlocked && achievement.maxProgress && achievement.maxProgress > 1 && (
                                        <div className="pt-2">
                                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1 font-medium">
                                                <span>Progress</span>
                                                <span>{achievement.progress || 0} / {achievement.maxProgress}</span>
                                            </div>
                                            <Progress
                                                value={((achievement.progress || 0) / achievement.maxProgress) * 100}
                                                className="h-1.5"
                                            />
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
