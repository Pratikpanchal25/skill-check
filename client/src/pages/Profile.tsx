
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Mail, Briefcase, Calendar, ShieldCheck, Award, ChevronRight, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';

interface OverviewItem {
    skill: string;
    averageClarity: number;
    averageCorrectness: number;
    averageDepth: number;
    totalMissingConcepts: string[];
    sessionCount: number;
}

export const Profile: React.FC = () => {
    const user = useSelector((state: RootState) => state.auth.user);
    const navigate = useNavigate();
    const [overview, setOverview] = useState<OverviewItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfileData = async () => {
            if (user?._id) {
                try {
                    const res = await api.get(`/users/me/overview`);
                    if (res.data.success === 1) {
                        setOverview(res.data.data.overview);
                    }
                } catch (error) {
                    console.error("Failed to fetch profile overview", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchProfileData();
    }, [user]);

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
        <div className="max-w-7xl mx-auto space-y-12 py-12 px-6 animate-in fade-in duration-500">
            <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="group flex items-center gap-2 text-muted-foreground hover:text-foreground -ml-4"
            >
                <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                Back to Dashboard
            </Button>
            {/* Minimal High-End Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-10">
                    <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border border-border shadow-sm">
                        <User className="h-12 w-12 text-foreground/70" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-semibold tracking-tight text-foreground">{user?.name}</h1>
                        <p className="text-lg text-muted-foreground flex items-center gap-2 mt-1.5">
                            {user?.role === 'engineer' ? 'Software Engineer' : 'Student'} • {user?.email}
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="rounded-xl h-12 px-8 text-sm font-semibold border-2"
                    onClick={() => navigate('/dashboard/manage-account')}
                >
                    Manage Account
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {/* Left: About/Account Info */}
                <div className="md:col-span-1 space-y-8">
                    <section className="space-y-4">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Account Information</h3>
                        <div className="space-y-5">
                            <InfoItem icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email} />
                            <InfoItem icon={<Briefcase className="h-4 w-4" />} label="Role" value={user?.role} className="capitalize" />
                            <InfoItem icon={<Calendar className="h-4 w-4" />} label="Member Since" value={formatDate(user?.createdAt)} />
                            <InfoItem icon={<ShieldCheck className="h-4 w-4" />} label="Status" value="Active Account" />
                        </div>
                    </section>

                    <Card className="rounded-xl border border-border bg-muted/30 shadow-none">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2.5 bg-background rounded-lg border border-border">
                                <Award className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-foreground">Pro Skills</p>
                                <p className="text-[10px] text-muted-foreground">Level 4 Creator</p>
                            </div>
                            <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Key Performance Metrics */}
                <div className="md:col-span-2 space-y-10 text-foreground">
                    {/* Stats Summary Grid */}
                    <div className="grid grid-cols-3 gap-10 border-y border-border py-12">
                        <StatBox label="Total Checks" value={totalSessions.toString()} />
                        <StatBox label="Validated" value={overview.length.toString()} />
                        <StatBox label="Top Proficiency" value={topSkill?.skill || '---'} />
                    </div>

                    {/* Skill-by-Skill Performance */}
                    <section className="space-y-10">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold uppercase tracking-widest text-muted-foreground">Skill Proficiency</h3>
                            <Link to="/dashboard" className="text-sm font-semibold text-primary hover:underline">View All Sessions</Link>
                        </div>

                        {loading ? (
                            <div className="py-12 flex justify-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            </div>
                        ) : overview.length > 0 ? (
                            <div className="space-y-6">
                                {overview.map((item) => (
                                    <div
                                        key={item.skill}
                                        className="group"
                                    >
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <h4 className="text-xl font-medium text-foreground">{item.skill}</h4>
                                                <p className="text-xs text-muted-foreground mt-1">{item.sessionCount} total sessions recorded</p>
                                            </div>
                                            <div className="text-sm font-bold text-foreground/80">
                                                Average Score: {((item.averageClarity + item.averageCorrectness + item.averageDepth) / 3).toFixed(1)}/10
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4">
                                            <MinimalProgress label="Clarity" value={item.averageClarity} />
                                            <MinimalProgress label="Accuracy" value={item.averageCorrectness} />
                                            <MinimalProgress label="Depth" value={item.averageDepth} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 text-center border rounded-xl bg-muted/10 text-muted-foreground text-sm italic">
                                No assessment data found. Start a session to see your stats.
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ icon, label, value, className }: { icon: React.ReactNode, label: string, value?: string, className?: string }) => (
    <div className="flex items-center gap-5">
        <div className="text-muted-foreground/60 scale-125">{icon}</div>
        <div className="min-w-0">
            <p className="text-[11px] font-bold text-muted-foreground/50 uppercase tracking-tight leading-none mb-1.5">{label}</p>
            <p className={cn("text-base font-medium text-foreground truncate", className)}>{value || '---'}</p>
        </div>
    </div>
);

const StatBox = ({ label, value }: { label: string, value: string }) => (
    <div className="text-center space-y-2 border-r border-border last:border-0">
        <p className="text-4xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
    </div>
);

const MinimalProgress = ({ label, value }: { label: string, value: number }) => (
    <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-tight text-muted-foreground/60">
            <span>{label}</span>
            <span>{value.toFixed(1)}</span>
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden shadow-inner">
            <div
                className="h-full bg-foreground/10 group-hover:bg-primary/40 transition-all duration-700 ease-out"
                style={{ width: `${value * 10}%` }}
            />
        </div>
    </div>
);
