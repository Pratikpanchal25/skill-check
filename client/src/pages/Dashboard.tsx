
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, BrainCircuit, Mic, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface OverviewItem {
    skill: string;
    averageClarity: number;
    averageCorrectness: number;
    averageDepth: number;
    totalMissingConcepts: string[];
    sessionCount: number;
}

interface ActivityItem {
    id: string;
    skill: string;
    mode: string;
    createdAt: string;
    evaluated: boolean;
    score: number | null;
}

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const user = useSelector((state: RootState) => state.auth.user);
    const [stats, setStats] = useState({
        sessions: 0,
        skillsPracticed: 0
    });
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (user?._id) {
                try {
                    const [overviewRes, activityRes] = await Promise.all([
                        api.get(`/users/me/overview`),
                        api.get(`/users/me/activity`)
                    ]);

                    if (overviewRes.data.success === 1) {
                        const overview: OverviewItem[] = overviewRes.data.data.overview;
                        const totalSessions = overview.reduce((acc: number, item: OverviewItem) => acc + item.sessionCount, 0);
                        const uniqueSkills = overview.length;
                        setStats({ sessions: totalSessions, skillsPracticed: uniqueSkills });
                    }

                    if (activityRes.data.success === 1 && activityRes.data.data?.activities) {
                        setActivities(activityRes.data.data.activities);
                    }
                } catch (error) {
                    console.error("Failed to fetch dashboard data", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchData();
    }, [user]);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Hi, {user?.name}</h1>
                    <p className="text-muted-foreground text-lg">Let’s check what you actually understand.</p>
                </div>
                <div className="flex gap-4">
                    {/* Light Stats - Minimal */}
                    <div className="bg-card text-card-foreground px-4 py-2 rounded-lg border shadow-sm flex items-center space-x-3">
                        <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md">
                            <Mic className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sessions</p>
                            <p className="text-lg font-bold leading-none">{stats.sessions}</p>
                        </div>
                    </div>
                    <div className="bg-card text-card-foreground px-4 py-2 rounded-lg border shadow-sm flex items-center space-x-3">
                        <div className="p-1.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-md">
                            <BrainCircuit className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Skills</p>
                            <p className="text-lg font-bold leading-none">{stats.skillsPracticed}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Primary Action Card */}
                <Card className="md:col-span-2 border-primary/20 bg-primary/5 dark:bg-primary/10 relative overflow-hidden group">
                    <CardHeader>
                        <CardTitle className="text-2xl text-primary">Explain a Concept</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                        <p className="text-foreground/80 max-w-lg text-lg">
                            Pick a technical topic and explain it in your own words.
                            Our AI will evaluate your clarity, correctness, and depth.
                        </p>
                        <Button
                            size="lg"
                            className="shadow-lg shadow-primary/20 dark:text-white"
                            onClick={() => navigate('/dashboard/skillcheck')}
                        >
                            Start Skillcheck <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Secondary Actions */}
                <div className="space-y-6">
                    <Card className="h-full hover:border-primary/50 transition-colors cursor-pointer group">
                        <CardContent className="p-6 flex flex-col items-start h-full justify-between">
                            <div className="space-y-4">
                                <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl w-fit group-hover:bg-indigo-500/20 transition-colors">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-foreground text-lg">Daily Skill Drill</h3>
                                    <p className="text-sm text-muted-foreground mt-1">Quick 5-minute check on core concepts.</p>
                                </div>
                            </div>
                            <Button variant="outline" className="w-full mt-6 justify-between group-hover:border-primary/50 group-hover:text-primary">
                                Start Drill <ArrowRight className="h-4 w-4" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Recent Activity Section */}
            <div className="space-y-4">

                <div className="grid grid-cols-1 gap-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                    ) : activities.length > 0 ? (
                        activities.map((activity) => (
                            <Card
                                key={activity.id}
                                className="hover:border-primary/30 transition-all cursor-pointer group"
                                onClick={() => navigate(`/dashboard/session/${activity.id}`)}
                            >
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            activity.evaluated ? "bg-green-500/10 text-green-600" : "bg-yellow-500/10 text-yellow-600"
                                        )}>
                                            <Mic className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-foreground">{activity.skill}</h4>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <span className="capitalize">{activity.mode}</span>
                                                <span>•</span>
                                                <span>{formatDate(activity.createdAt)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        {activity.evaluated ? (
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-primary">{activity.score ? activity.score.toFixed(1) : '0'}/10</p>
                                                <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Score</p>
                                            </div>
                                        ) : (
                                            <div className="bg-muted px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Pending
                                            </div>
                                        )}
                                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <Card className="border-dashed border-2 bg-muted/30">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                                <Trophy className="h-8 w-8 text-muted-foreground/30" />
                                <div className="space-y-1">
                                    <p className="font-medium text-foreground">No sessions yet</p>
                                    <p className="text-sm text-muted-foreground">Start your first skill check to see progress here.</p>
                                </div>
                                <Button size="sm" className="mt-2" onClick={() => navigate('/dashboard/skillcheck')}>
                                    Get Started
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};
