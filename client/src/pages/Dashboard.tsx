
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, BrainCircuit, Mic, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import api from '@/lib/api';

interface OverviewItem {
    skill: string;
    averageClarity: number;
    averageCorrectness: number;
    averageDepth: number;
    totalMissingConcepts: string[];
    sessionCount: number;
}

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const user = useSelector((state: RootState) => state.auth.user);
    const [stats, setStats] = useState({
        sessions: 0,
        skillsPracticed: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            if (user?._id) {
                try {
                    const res = await api.get(`/users/me/overview`);
                    if (res.data.success) {
                        const overview: OverviewItem[] = res.data.overview;
                        // Calculate total sessions and unique skills
                        const totalSessions = overview.reduce((acc: number, item: OverviewItem) => acc + item.sessionCount, 0);
                        const uniqueSkills = overview.length;
                        setStats({ sessions: totalSessions, skillsPracticed: uniqueSkills });
                    }
                } catch (error) {
                    console.error("Failed to fetch dashboard stats", error);
                }
            }
        };
        fetchStats();
    }, [user]);

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
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Mic className="h-48 w-48 text-primary" />
                    </div>
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

            {/* Recent Activity / Progress Placeholder */}
            <div className="pt-4">
                <h3 className="text-lg font-semibold text-foreground mb-4">Recent Progress</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Placeholder Cards for coming soon features */}
                    <Card className="border-dashed border-2 bg-muted/50">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center space-y-2">
                            <Trophy className="h-8 w-8 text-muted-foreground/50" />
                            <p className="text-sm font-medium text-muted-foreground">More detailed analytics coming soon</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
