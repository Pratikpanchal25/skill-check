
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchOverview } from '@/store/slices/dataSlice';
import { Button } from '@/components/ui/button';
import { User, Mail, Briefcase, Calendar, ShieldCheck, ArrowLeft, Mic, TrendingUp, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export const Profile: React.FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    
    // Get overview from Redux store
    const { overview, overviewLoading: loading } = useSelector((state: RootState) => state.data);

    useEffect(() => {
        if (user?._id) {
            dispatch(fetchOverview());
        }
    }, [user, dispatch]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Intl.DateTimeFormat('en-US', {
            month: 'long',
            year: 'numeric',
            day: 'numeric'
        }).format(new Date(dateString));
    };

    const totalSessions = overview.reduce((acc, item) => acc + item.sessionCount, 0);
    const topSkill = [...overview].sort((a, b) =>
        (b.averageClarity + b.averageCorrectness + b.averageDepth) -
        (a.averageClarity + a.averageCorrectness + a.averageDepth)
    )[0];

    return (
        <div className="bg-background h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="border-b border-border/30 px-6 py-5 shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(-1)}
                            className="group flex items-center gap-2 text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Back
                        </Button>
                        <div className="h-6 w-px bg-border/50" />
                        <h1 className="text-xl font-semibold text-foreground">
                            Profile
                        </h1>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/dashboard/manage-account')}
                        className="flex items-center gap-2"
                    >
                        <Settings className="h-4 w-4" />
                        Manage Account
                    </Button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6 px-6 py-6 flex-1 min-h-0 w-full">
                
                {/* LEFT COLUMN - Profile Info */}
                <div className="flex flex-col gap-6">
                    {/* Profile Card */}
                    <div className="border border-border/50 rounded-xl bg-card p-6">
                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center border border-border mb-4">
                                <User className="h-10 w-10 text-foreground/70" />
                            </div>
                            <h2 className="text-xl font-semibold">{user?.name}</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {user?.role === 'engineer' ? 'Software Engineer' : 'Student'}
                            </p>
                        </div>
                        
                        <div className="space-y-4">
                            <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email} />
                            <InfoItem icon={<Briefcase className="h-4 w-4" />} label="Role" value={user?.role} className="capitalize" />
                            <InfoItem icon={<Calendar className="h-4 w-4" />} label="Member Since" value={formatDate(user?.createdAt)} />
                            <InfoItem icon={<ShieldCheck className="h-4 w-4" />} label="Status" value="Active Account" />
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="border border-border/50 rounded-xl bg-card p-6 flex-1">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                            Quick Stats
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <StatCard
                                label="Sessions"
                                value={totalSessions.toString()}
                                icon={<Mic className="h-4 w-4" />}
                                color="blue"
                            />
                            <StatCard
                                label="Skills"
                                value={overview.length.toString()}
                                icon={<TrendingUp className="h-4 w-4" />}
                                color="green"
                            />
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - Performance */}
                <div className="flex flex-col gap-6 min-h-0">
                    {/* Top Skill Highlight */}
                    {topSkill && (
                        <div className="border border-border/50 rounded-xl bg-card p-6 shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold">Top Proficiency</h3>
                                <span className="text-xs text-muted-foreground">{topSkill.sessionCount} sessions</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-lg bg-primary/10">
                                    <TrendingUp className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{topSkill.skill}</p>
                                    <p className="text-sm text-muted-foreground">
                                        Average: {((topSkill.averageClarity + topSkill.averageCorrectness + topSkill.averageDepth) / 3).toFixed(1)}/10
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Skill Proficiency */}
                    <div className="border border-border/50 rounded-xl bg-card flex flex-col flex-1 min-h-0 overflow-hidden">
                        <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-sm font-semibold">Skill Proficiency</h3>
                                <p className="text-xs text-muted-foreground mt-1">Your performance across all skills</p>
                            </div>
                            <button onClick={() => navigate(-1)} className="text-xs font-medium text-primary hover:underline">
                                View Sessions
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 min-h-0 thin-scrollbar">
                            {loading ? (
                                <div className="py-12 flex justify-center">
                                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                </div>
                            ) : overview.length > 0 ? (
                                <div className="space-y-6">
                                    {overview.map((item) => (
                                        <div key={item.skill} className="group">
                                            <div className="flex justify-between items-end mb-3">
                                                <div>
                                                    <h4 className="text-base font-medium text-foreground">{item.skill}</h4>
                                                    <p className="text-xs text-muted-foreground">{item.sessionCount} sessions</p>
                                                </div>
                                                <span className="text-sm font-bold text-foreground/80">
                                                    {((item.averageClarity + item.averageCorrectness + item.averageDepth) / 3).toFixed(1)}/10
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <MinimalProgress label="Clarity" value={item.averageClarity} />
                                                <MinimalProgress label="Accuracy" value={item.averageCorrectness} />
                                                <MinimalProgress label="Depth" value={item.averageDepth} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-muted-foreground">
                                    <Mic className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
                                    <p className="text-sm font-medium">No assessment data found</p>
                                    <p className="text-xs mt-1">Start a session to see your stats.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ icon, label, value, className }: { icon: React.ReactNode, label: string, value?: string, className?: string }) => (
    <div className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
        <div className="text-muted-foreground">{icon}</div>
        <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn("text-sm font-medium text-foreground truncate", className)}>{value || '---'}</p>
        </div>
    </div>
);

const StatCard = ({
    label,
    value,
    icon,
    color
}: {
    label: string;
    value: string;
    icon: React.ReactNode;
    color: 'blue' | 'green';
}) => (
    <div className="flex items-center gap-3 p-3 border border-border/50 rounded-lg bg-muted/20">
        <div
            className={cn(
                'p-2 rounded-md',
                color === 'blue'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'bg-green-500/10 text-green-600 dark:text-green-400'
            )}
        >
            {icon}
        </div>
        <div>
            <p className="text-lg font-bold leading-none">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </div>
    </div>
);

const MinimalProgress = ({ label, value }: { label: string, value: number }) => (
    <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{label}</span>
            <span className="font-medium">{value.toFixed(1)}</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
                className="h-full bg-primary/60 transition-all duration-700 ease-out"
                style={{ width: `${value * 10}%` }}
            />
        </div>
    </div>
);
