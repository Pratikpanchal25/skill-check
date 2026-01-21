
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { fetchActivities, fetchSkills, invalidateActivities, invalidateOverview } from '@/store/slices/dataSlice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Loader2,
    ArrowLeft,
    Mic,
    Sparkles,
    Clock,
    Lock,
    Target,
    Zap,
    BookOpen,
    CheckCircle2,
    Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

const difficultyConfig = {
    beginner: {
        icon: BookOpen,
        color: 'green',
        label: 'Beginner',
        description: 'Fundamental concepts',
        bgClass: 'bg-green-500/10 text-green-600 dark:text-green-400',
        borderClass: 'border-green-500/50',
        activeClass: 'bg-green-500/10 border-green-500'
    },
    intermediate: {
        icon: Target,
        color: 'yellow',
        label: 'Intermediate',
        description: 'Practical application',
        bgClass: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
        borderClass: 'border-yellow-500/50',
        activeClass: 'bg-yellow-500/10 border-yellow-500'
    },
    advanced: {
        icon: Zap,
        color: 'red',
        label: 'Advanced',
        description: 'Deep dive & architecture',
        bgClass: 'bg-red-500/10 text-red-600 dark:text-red-400',
        borderClass: 'border-red-500/50',
        activeClass: 'bg-red-500/10 border-red-500'
    }
};

export const SkillCheck: React.FC = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();
    const user = useSelector((state: RootState) => state.auth.user);
    
    // Get skills from Redux store
    const { skills, skillsLoading, activities } = useSelector((state: RootState) => state.data);

    const [loading, setLoading] = useState(false);
    const [selectedSkill, setSelectedSkill] = useState<{ _id: string; name: string; category?: string } | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
    const [isCustomTopic, setIsCustomTopic] = useState(false);
    const [customTopicName, setCustomTopicName] = useState('');

    useEffect(() => {
        dispatch(fetchSkills());
    }, [dispatch]);

    useEffect(() => {
        // Used only to prevent duplicate in-progress sessions.
        // Cached by dataSlice, so this won't spam the API.
        if (user?._id) dispatch(fetchActivities(false));
    }, [user?._id, dispatch]);

    // Set first skill as selected when skills load
    useEffect(() => {
        if (skills.length > 0 && !selectedSkill) {
            setSelectedSkill(skills[0]);
        } else if (skills.length === 0 && !skillsLoading) {
            setIsCustomTopic(true);
        }
    }, [skills, skillsLoading, selectedSkill]);

    const handleStartSession = async () => {
        let skillToUse: { _id?: string; name: string } | null = selectedSkill;

        if (isCustomTopic) {
            if (!customTopicName.trim()) {
                toast.error('Please enter a custom topic name');
                return;
            }
            skillToUse = { name: customTopicName.trim() };
        }

        if (!skillToUse) return;

        const normalized = skillToUse.name.trim().toLowerCase();
        const existingPending = activities.reduce<{ id: string; createdAt: string; evaluated: boolean } | null>((acc, a) => {
            if (a.skill.trim().toLowerCase() !== normalized) return acc;
            if (a.evaluated) return acc;
            if (!acc) return { id: a.id, createdAt: a.createdAt, evaluated: a.evaluated };
            return Date.parse(a.createdAt) > Date.parse(acc.createdAt)
                ? { id: a.id, createdAt: a.createdAt, evaluated: a.evaluated }
                : acc;
        }, null);

        if (existingPending) {
            toast.error(`You already have an in-progress session for “${skillToUse.name}”.`);
            return;
        }

        if (!user || !user._id) {
            toast.error('Please log in again.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/sessions', {
                skillName: skillToUse.name,
                mode: 'explain',
                inputType: 'voice',
                difficulty,
                userId: user._id,
            });
            if (res.data.success === 1 && res.data.data?.session) {
                // Invalidate cache so dashboard refetches with new session
                dispatch(invalidateActivities());
                dispatch(invalidateOverview());
                navigate(`/dashboard/session/${res.data.data.session._id}`);
            }
        } catch (error) {
            console.error('Failed to start session', error);
            toast.error('Failed to start session');
        } finally {
            setLoading(false);
        }
    };

    const selectedTopicName = isCustomTopic ? customTopicName : selectedSkill?.name;
    const isReady = (isCustomTopic && customTopicName.trim()) || (!isCustomTopic && selectedSkill);

    const normalizedSelectedTopic = (selectedTopicName ?? '').trim().toLowerCase();
    const existingPendingSession = normalizedSelectedTopic
        ? activities.reduce<{ id: string; createdAt: string } | null>((acc, a) => {
              if (a.skill.trim().toLowerCase() !== normalizedSelectedTopic) return acc;
              if (a.evaluated) return acc;
              if (!acc) return { id: a.id, createdAt: a.createdAt };
              return Date.parse(a.createdAt) > Date.parse(acc.createdAt) ? { id: a.id, createdAt: a.createdAt } : acc;
          }, null)
        : null;

    const startDisabledReason = existingPendingSession
        ? 'You already have an in-progress session for this topic.'
        : !isReady
            ? 'Pick a topic to continue.'
            : null;

    return (
        <div className="bg-background overflow-hidden">
            {/* Header */}
            <div className="border-b border-border/30 px-6 py-5">
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
                            New Skill Check
                        </h1>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 px-6 py-6 items-stretch">
                
                {/* LEFT COLUMN - Configuration */}
                <div className="space-y-6">
                    {/* Topic Selection */}
                    <div className="border border-border/50 rounded-xl bg-card">
                        <div className="px-6 py-4 border-b border-border/30">
                            <h3 className="text-sm font-semibold">Select Topic</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Choose a technical topic to explain
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-wrap gap-2">
                                {skills?.map((skill) => (
                                    <button
                                        key={skill._id}
                                        onClick={() => {
                                            setIsCustomTopic(false);
                                            setSelectedSkill(skill);
                                        }}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-sm font-medium transition-all border cursor-pointer",
                                            !isCustomTopic && selectedSkill?._id === skill._id
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-muted/30 text-foreground border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer"
                                        )}
                                    >
                                        {skill.name}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setIsCustomTopic(true)}
                                    className={cn(
                                        "px-4 py-2 rounded-lg text-sm font-medium border transition-all flex items-center gap-2 cursor-pointer",
                                        isCustomTopic
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "border-dashed border-muted-foreground/50 text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                                    )}
                                >
                                    <Plus className="h-3 w-3" />
                                    Custom Topic
                                </button>
                            </div>

                            {isCustomTopic && (
                                <div className="mt-4 pt-4 border-t border-border/30 animate-in slide-in-from-top-2 duration-300">
                                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                                        Enter custom topic name
                                    </Label>
                                    <Input
                                        placeholder="e.g. Redis, Kubernetes, React Hooks..."
                                        value={customTopicName}
                                        onChange={(e) => setCustomTopicName(e.target.value)}
                                        className="bg-muted/30 border-border focus:bg-background"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Difficulty Selection */}
                    <div className="border border-border/50 rounded-xl bg-card">
                        <div className="px-6 py-4 border-b border-border/30">
                            <h3 className="text-sm font-semibold">Select Difficulty</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Choose based on your experience level
                            </p>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {(Object.keys(difficultyConfig) as Difficulty[]).map((level) => {
                                    const config = difficultyConfig[level];
                                    const Icon = config.icon;
                                    const isSelected = difficulty === level;
                                    
                                    return (
                                        <button
                                            key={level}
                                            onClick={() => setDifficulty(level)}
                                            className={cn(
                                                "relative p-4 rounded-lg border-2 transition-all text-left cursor-pointer",
                                                isSelected
                                                    ? config.activeClass
                                                    : "border-border hover:border-muted-foreground/30"
                                            )}
                                        >
                                            {isSelected && (
                                                <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
                                            )}
                                            <div className={cn("p-2 rounded-md w-fit mb-3", config.bgClass)}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <h4 className="font-semibold text-sm">{config.label}</h4>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {config.description}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Tips Card */}
                    <div className="border border-border/50 rounded-xl bg-muted/20 p-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold mb-1">Pro Tips</h4>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>• Speak clearly and at a moderate pace</li>
                                    <li>• Structure your explanation with intro, main points, and conclusion</li>
                                    <li>• Use examples to illustrate concepts</li>
                                    <li>• Don't worry about being perfect - focus on clarity</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN - Summary & Actions */}
                <div className="flex flex-col gap-6">
                    {/* Session Preview Card */}
                    <div className="border border-border/50 rounded-xl bg-card p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Mic className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">Session Preview</h2>
                                <p className="text-xs text-muted-foreground">Your configuration</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            {/* Topic Preview */}
                            <div className="flex items-center justify-between py-3 border-b border-border/30">
                                <span className="text-sm text-muted-foreground">Topic</span>
                                <span className="text-sm font-medium text-foreground">
                                    {selectedTopicName || 'Select a topic'}
                                </span>
                            </div>
                            
                            {/* Difficulty Preview */}
                            <div className="flex items-center justify-between py-3 border-b border-border/30">
                                <span className="text-sm text-muted-foreground">Difficulty</span>
                                <div className="flex items-center gap-2">
                                    <div className={cn("p-1 rounded", difficultyConfig[difficulty].bgClass)}>
                                        {React.createElement(difficultyConfig[difficulty].icon, { className: "h-3 w-3" })}
                                    </div>
                                    <span className="text-sm font-medium">{difficultyConfig[difficulty].label}</span>
                                </div>
                            </div>
                            
                            {/* Duration */}
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm text-muted-foreground">Duration</span>
                                <div className="flex items-center gap-2">
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-sm font-medium">Up to 5 min</span>
                                </div>
                            </div>
                        </div>

                        {/* Start Button */}
                        <Button
                            className="w-full mt-6"
                            size="lg"
                            onClick={handleStartSession}
                            disabled={loading || !isReady || Boolean(existingPendingSession)}
                            title={startDisabledReason ?? undefined}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            ) : (
                                <Sparkles className="h-4 w-4 mr-2" />
                            )}
                            {loading ? 'Starting...' : 'Start Skill Check'}
                        </Button>

                        {existingPendingSession && (
                            <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 p-1.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                        <Lock className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            Session already in progress
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            You can’t start another session for this topic until you finish the current one.
                                        </p>
                                        <div className="mt-3">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8"
                                                onClick={() => navigate(`/dashboard/session/${existingPendingSession.id}/record`)}
                                            >
                                                Continue Session
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* How it works */}
                    <div className="border border-border/50 rounded-xl bg-card p-6 flex-1">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                            How it works
                        </h3>
                        <ul className="space-y-4">
                            <li className="flex items-start gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                    1
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Choose your topic</p>
                                    <p className="text-xs text-muted-foreground">Select from popular skills or add a custom one</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                    2
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Record your explanation</p>
                                    <p className="text-xs text-muted-foreground">Explain the concept in your own words</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                                    3
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Get AI feedback</p>
                                    <p className="text-xs text-muted-foreground">Receive detailed insights on clarity, correctness & depth</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};
