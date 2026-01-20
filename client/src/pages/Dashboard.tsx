import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BrainCircuit, Mic, Trophy } from 'lucide-react';
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

    const [stats, setStats] = useState({ sessions: 0, skillsPracticed: 0 });
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!user?._id) return;

            try {
                const [overviewRes, activityRes] = await Promise.all([
                    api.get(`/users/me/overview`),
                    api.get(`/users/me/activity`)
                ]);

                if (overviewRes.data.success === 1) {
                    const overview: OverviewItem[] = overviewRes.data.data.overview;
                    const sessions = overview.reduce((a, i) => a + i.sessionCount, 0);
                    setStats({ sessions, skillsPracticed: overview.length });
                }

                if (activityRes.data.success === 1) {
                    setActivities(activityRes.data.data.activities || []);
                }
            } catch (err) {
                console.error('Dashboard fetch failed', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const formatDate = (dateString: string) =>
        new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));

    return (
        <div className="h-screen bg-background overflow-hidden">
            {/* Header */}
            <div className="border-b border-border/30 px-6 py-5">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-3xl font-bold text-foreground">
                        Hi, {user?.name}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                        Let’s check what you actually understand.
                    </p>
                </div>
            </div>

            {/* Main Grid */}
            <div className="max-w-7xl mx-auto h-[calc(100vh-96px)] grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 px-6 py-6">
                
                {/* LEFT COLUMN */}
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="flex gap-3">
                        <StatCard
                            label="Sessions"
                            value={stats.sessions}
                            icon={<Mic className="h-4 w-4" />}
                            color="blue"
                        />
                        <StatCard
                            label="Skills"
                            value={stats.skillsPracticed}
                            icon={<BrainCircuit className="h-4 w-4" />}
                            color="green"
                        />
                    </div>

                    {/* Explain Concept */}
                    <div className="border border-border/50 rounded-xl bg-card p-6">
                        <h2 className="text-xl font-semibold mb-2">
                            Explain a Concept
                        </h2>
                        <p className="text-sm text-muted-foreground mb-5">
                            Pick a technical topic and explain it in your own words.
                            Our AI evaluates clarity, correctness, and depth.
                        </p>
                        <Button
                            onClick={() => navigate('/dashboard/skillcheck')}
                            className="w-full"
                        >
                            Start Skillcheck
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="flex flex-col h-full">
                    {/* <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Recent Sessions
                        </h3>
                        <span className="text-xs text-muted-foreground">
                            {activities.length} total
                        </span>
                    </div> */}

                    <div className="flex flex-col overflow-y-auto border border-border/50 rounded-xl bg-card divide-y divide-border/30">
                        {loading ? (
                            <div className="flex justify-center py-16">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            </div>
                        ) : activities.length ? (
                            activities.map(activity => (
                                <button
                                    key={activity.id}
                                    onClick={() => navigate(activity.evaluated ? `/dashboard/session/${activity.id}` : `/dashboard/session/${activity.id}/record`)}
                                    className="w-full px-4 py-3 flex justify-between items-center text-left hover:bg-muted/40 transition"
                                >
                                    <div className="flex gap-3 min-w-0">
                                        <div
                                            className={cn(
                                                'p-2 rounded-md',
                                                activity.evaluated
                                                    ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                                    : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                            )}
                                        >
                                            <Mic className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium truncate">
                                                {activity.skill}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {activity.mode} • {formatDate(activity.createdAt)}
                                            </p>
                                        </div>
                                    </div>

                                    {activity.evaluated ? (
                                        <span className="text-sm font-bold text-primary">
                                            {activity.score?.toFixed(1) ?? 0}/10
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-bold uppercase bg-muted px-2 py-1 rounded">
                                            Pending
                                        </span>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-6">
                                <Trophy className="h-8 w-8 text-muted-foreground/30 mb-3" />
                                <p className="font-medium text-sm">No sessions yet</p>
                                <p className="text-xs text-muted-foreground mb-4">
                                    Start your first skill check to see progress here.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ---------- Small Helper ---------- */
const StatCard = ({
    label,
    value,
    icon,
    color
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: 'blue' | 'green';
}) => (
    <div className="flex-1 flex items-center gap-3 border border-border/50 bg-card px-4 py-3 rounded-lg">
        <div
            className={cn(
                'p-1.5 rounded-md',
                color === 'blue'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'bg-green-500/10 text-green-600 dark:text-green-400'
            )}
        >
            {icon}
        </div>
        <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {label}
            </p>
            <p className="text-lg font-bold leading-none">{value}</p>
        </div>
    </div>
);
