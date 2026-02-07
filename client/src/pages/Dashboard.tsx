import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BrainCircuit, Mic, TrendingUp, AlertCircle, Lightbulb } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchDashboardData } from '@/store/slices/dataSlice';
import { cn } from '@/lib/utils';
import {
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Area,
    ComposedChart
} from 'recharts';

/* -------------------------------- Component -------------------------------- */

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const user = useSelector((state: RootState) => state.auth.user);

    // Get data from Redux store
    const {
        overview,
        activities,
        overviewFetchedAt,
        activitiesFetchedAt,
        overviewLoading,
        activitiesLoading
    } = useSelector((state: RootState) => state.data);

    const notFetchedYet = Boolean(user?._id) && (!overviewFetchedAt || !activitiesFetchedAt);
    const loading = overviewLoading || activitiesLoading || notFetchedYet;
    const stats = {
        sessions: activities.length,
        skillsPracticed: overview.length
    };

    useEffect(() => {
        if (user?._id) dispatch(fetchDashboardData());
    }, [user?._id, dispatch]);

    const formatDate = (dateString: string) =>
        new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(new Date(dateString));

    const getScoreColor = (score: number) => {
        if (score >= 8) return 'text-green-500';
        if (score >= 6) return 'text-blue-500';
        if (score >= 4) return 'text-yellow-500';
        return 'text-red-500';
    };

    // Skill colors for multi-line graph
    const skillColors = [
        '#3b82f6',  // blue
        '#22c55e',  // green
        '#f59e0b',  // amber
        '#8b5cf6',  // violet
        '#ef4444',  // red
        '#06b6d4',  // cyan
        '#ec4899',  // pink
    ];

    // Calculate progress data grouped by skill
    const evaluatedActivities = activities
        .filter(a => a.evaluated && a.score !== null)
        .reverse();

    // Get unique skills
    const uniqueSkills = [...new Set(evaluatedActivities.map(a => a.skill))];

    // Create chart data in Recharts format - each date has scores for all skills
    const chartDataMap = new Map<string, { date: string;[key: string]: number | string }>();

    evaluatedActivities.forEach(activity => {
        const dateKey = new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (!chartDataMap.has(dateKey)) {
            chartDataMap.set(dateKey, { date: dateKey });
        }
        const entry = chartDataMap.get(dateKey)!;
        entry[activity.skill] = Number(activity.score ?? 0);
    });

    const chartData = Array.from(chartDataMap.values());

    const graphHeight = 280;

    return (
        <div className="bg-background lg:h-full flex flex-col lg:overflow-hidden">
            {/* Header */}
            <div className="px-8 py-6 max-w-7xl mx-auto w-full shrink-0">
                <h1 className="text-3xl font-bold text-foreground">
                    Hi, {user?.name}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Let's check what you actually understand.
                </p>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-8 pb-6 flex-1 lg:min-h-0 w-full lg:overflow-y-auto lg:overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:h-full">

                    {/* Left Column */}
                    <div className="flex flex-col gap-6 min-h-0">
                        {/* Stats Row */}
                        <div className="flex gap-4 shrink-0">
                            <div className="flex-1 border border-border/50 rounded-xl bg-card px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Mic className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Sessions</p>
                                        <p className="text-2xl font-bold">{stats.sessions}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 border border-border/50 rounded-xl bg-card px-5 py-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                                        <BrainCircuit className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Skills</p>
                                        <p className="text-2xl font-bold">{stats.skillsPracticed}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Explain a Concept Card */}
                        <div className="border border-border/50 rounded-xl bg-card p-6 shrink-0">
                            <h3 className="text-lg font-semibold mb-2">Explain a Concept</h3>
                            <p className="text-sm text-muted-foreground mb-5">
                                Pick a technical topic and explain it in your own words. Our AI evaluates clarity, correctness, depth, and delivery.
                            </p>
                            <Button onClick={() => navigate('/dashboard/skillcheck')} className="w-full cursor-pointer">
                                Start Skillcheck
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>

                        {/* Recent Sessions */}
                        <div className="border border-border/50 rounded-xl bg-card overflow-hidden flex-1 flex flex-col min-h-0">
                            <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between shrink-0">
                                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Sessions</h3>
                                <button
                                    onClick={() => navigate('/dashboard/sessions')}
                                    className="text-xs text-primary hover:underline cursor-pointer"
                                >
                                    View All ({activities.length})
                                </button>
                            </div>
                            <div className="divide-y divide-border/30 overflow-y-auto flex-1">
                                {loading ? (
                                    <div className="flex justify-center py-12">
                                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                    </div>
                                ) : activities.length ? (
                                    activities.slice(0, 6).map(activity => (
                                        <button
                                            key={activity.id}
                                            onClick={() => navigate(activity.evaluated ? `/dashboard/session/${activity.id}` : `/dashboard/session/${activity.id}/record`)}
                                            className="w-full px-5 py-3 flex justify-between items-center text-left hover:bg-muted/40 transition cursor-pointer"
                                        >
                                            <div className="flex gap-3 min-w-0">
                                                <div className={cn(
                                                    'p-2 rounded-lg shrink-0',
                                                    activity.evaluated
                                                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                                        : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                                                )}>
                                                    <Mic className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium">{activity.skill}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {activity.mode} • {formatDate(activity.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                            {activity.evaluated ? (
                                                <span className={cn("text-sm font-bold", getScoreColor(activity.score ?? 0))}>
                                                    {Number(activity.score ?? 0).toFixed(1)}/10
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-1 rounded">
                                                    Pending
                                                </span>
                                            )}
                                        </button>
                                    ))
                                ) : (
                                    <div className="py-12 text-center px-4">
                                        <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-3">
                                            <Mic className="h-6 w-6 text-muted-foreground/50" />
                                        </div>
                                        <p className="font-medium text-sm">No sessions yet</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Start your first skill check
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className="flex flex-col gap-6 min-h-0 lg:min-h-0">
                        {/* Progress Graph */}
                        <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
                            <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-blue-500/10">
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold">Progress Over Time</h3>
                                        <p className="text-xs text-muted-foreground">Score trends by skill</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5">
                                {evaluatedActivities.length >= 2 ? (
                                    <div className="space-y-4">
                                        {/* Chart */}
                                        <div style={{ height: graphHeight }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                    <defs>
                                                        {uniqueSkills.slice(0, 5).map((skill, i) => (
                                                            <linearGradient key={skill} id={`gradient-${skill}`} x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor={skillColors[i % skillColors.length]} stopOpacity={0.3} />
                                                                <stop offset="95%" stopColor={skillColors[i % skillColors.length]} stopOpacity={0} />
                                                            </linearGradient>
                                                        ))}
                                                    </defs>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                                                    <XAxis
                                                        dataKey="date"
                                                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                                        tickLine={false}
                                                        axisLine={{ stroke: 'hsl(var(--border))' }}
                                                    />
                                                    <YAxis
                                                        domain={[0, 10]}
                                                        tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                                                        tickLine={false}
                                                        axisLine={{ stroke: 'hsl(var(--border))' }}
                                                        ticks={[0, 2, 4, 6, 8, 10]}
                                                    />
                                                    <Tooltip
                                                        contentStyle={{
                                                            backgroundColor: 'hsl(var(--card))',
                                                            border: '1px solid hsl(var(--border))',
                                                            borderRadius: '8px',
                                                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                                                        }}
                                                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: 4 }}
                                                        itemStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                                                        formatter={(value: number | string | undefined) => [`${Number(value ?? 0).toFixed(1)}/10`, '']}
                                                    />
                                                    <Legend
                                                        wrapperStyle={{ paddingTop: 16 }}
                                                        iconType="circle"
                                                        iconSize={8}
                                                        formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                                                    />
                                                    {uniqueSkills.slice(0, 5).map((skill, i) => (
                                                        <React.Fragment key={skill}>
                                                            <Area
                                                                type="monotone"
                                                                dataKey={skill}
                                                                stroke="none"
                                                                fill={`url(#gradient-${skill})`}
                                                                connectNulls
                                                            />
                                                            <Line
                                                                type="monotone"
                                                                dataKey={skill}
                                                                stroke={skillColors[i % skillColors.length]}
                                                                strokeWidth={2.5}
                                                                dot={{ fill: 'hsl(var(--background))', stroke: skillColors[i % skillColors.length], strokeWidth: 2, r: 4 }}
                                                                activeDot={{ r: 6, stroke: skillColors[i % skillColors.length], strokeWidth: 2, fill: 'hsl(var(--background))' }}
                                                                connectNulls
                                                            />
                                                        </React.Fragment>
                                                    ))}
                                                </ComposedChart>
                                            </ResponsiveContainer>
                                        </div>

                                        {/* Stats row */}
                                        <div className="flex items-center gap-4 pt-4 border-t border-border/30">
                                            <div className="flex-1 text-center">
                                                <p className="text-lg font-bold text-primary">
                                                    {(evaluatedActivities.reduce((acc, a) => acc + Number(a.score ?? 0), 0) / evaluatedActivities.length).toFixed(1)}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">Avg Score</p>
                                            </div>
                                            <div className="w-px h-8 bg-border/50" />
                                            <div className="flex-1 text-center">
                                                <p className="text-lg font-bold text-green-500">
                                                    {Math.max(...evaluatedActivities.map(a => Number(a.score ?? 0))).toFixed(1)}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">Best</p>
                                            </div>
                                            <div className="w-px h-8 bg-border/50" />
                                            <div className="flex-1 text-center">
                                                <p className="text-lg font-bold text-muted-foreground">
                                                    {evaluatedActivities.length}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">Sessions</p>
                                            </div>
                                            <div className="w-px h-8 bg-border/50" />
                                            <div className="flex-1 text-center">
                                                <p className="text-lg font-bold text-blue-500">
                                                    {uniqueSkills.length}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground">Skills</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <div className="p-4 rounded-full bg-muted/50 mb-4">
                                            <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
                                        </div>
                                        <p className="text-base font-medium text-muted-foreground">Not enough data yet</p>
                                        <p className="text-sm text-muted-foreground mt-1">Complete at least 2 sessions to see your progress chart</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Skills to Improve Card */}
                        <div className="border border-border/50 rounded-xl bg-card overflow-hidden lg:flex-1 min-h-75 lg:min-h-0 flex flex-col">
                            <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-orange-500/10">
                                        <Lightbulb className="h-4 w-4 text-orange-500" />
                                    </div>
                                    <h3 className="text-sm font-semibold">Focus Areas</h3>
                                </div>
                                <span className="text-xs text-muted-foreground">Based on your sessions</span>
                            </div>
                            <div className="p-5 flex-1 overflow-y-auto thin-scrollbar">
                                {(() => {
                                    // Get skills sorted by lowest average score
                                    const skillsToImprove = [...overview]
                                        .map(item => ({
                                            skill: item.skill,
                                            avgScore: (item.averageClarity + item.averageCorrectness + item.averageDepth) / 3,
                                            missingConcepts: item.totalMissingConcepts || [],
                                            sessions: item.sessionCount
                                        }))
                                        .sort((a, b) => a.avgScore - b.avgScore)
                                        .slice(0, 3);

                                    if (skillsToImprove.length === 0) {
                                        return (
                                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                                <div className="p-3 rounded-full bg-muted/50 mb-3">
                                                    <Lightbulb className="h-6 w-6 text-muted-foreground/50" />
                                                </div>
                                                <p className="text-sm font-medium text-muted-foreground">No data yet</p>
                                                <p className="text-xs text-muted-foreground mt-1">Complete sessions to see focus areas</p>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="space-y-4">
                                            {skillsToImprove.map((item, i) => (
                                                <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-sm font-medium">{item.skill}</span>
                                                        <span className={cn("text-xs font-bold", getScoreColor(item.avgScore))}>
                                                            {item.avgScore.toFixed(1)}/10
                                                        </span>
                                                    </div>
                                                    {item.missingConcepts.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {item.missingConcepts.slice(0, 3).map((concept, j) => (
                                                                <span key={j} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                                                                    <AlertCircle className="h-2.5 w-2.5" />
                                                                    {concept}
                                                                </span>
                                                            ))}
                                                            {item.missingConcepts.length > 3 && (
                                                                <span className="text-[10px] text-muted-foreground">+{item.missingConcepts.length - 3} more</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground">Practice more to identify gaps</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
