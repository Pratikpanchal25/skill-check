
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
    Shuffle,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface Skill {
    _id: string;
    name: string;
    category: string;
}

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export const SkillCheck: React.FC = () => {
    const navigate = useNavigate();
    const user = useSelector((state: RootState) => state.auth.user);

    const [loading, setLoading] = useState(false);
    const [skills, setSkills] = useState<Skill[]>([]);
    const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
    const [difficulty, setDifficulty] = useState<Difficulty>('beginner');
    const [isCustomTopic, setIsCustomTopic] = useState(false);
    const [customTopicName, setCustomTopicName] = useState('');

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                const res = await api.get('/skills');
                if (res.data.success) {
                    setSkills(res.data.skills);
                    if (res.data.skills.length > 0) {
                        setSelectedSkill(res.data.skills[0]);
                    } else {
                        setIsCustomTopic(true);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch skills', error);
                setIsCustomTopic(true);
            }
        };
        fetchSkills();
    }, []);

    const handleStartSession = async () => {
        let skillToUse = selectedSkill;

        if (isCustomTopic) {
            if (!customTopicName.trim()) {
                toast.error('Please enter a custom topic name');
                return;
            }
            setLoading(true);
            try {
                const skillRes = await api.post('/skills', {
                    name: customTopicName.trim(),
                    category: 'backend'
                });
                if (skillRes.data.success) {
                    skillToUse = skillRes.data.skill || skillRes.data.data.skill;
                }
            } catch (error) {
                console.error('Failed to create custom skill', error);
                toast.error('Failed to create custom topic');
                setLoading(false);
                return;
            }
        }

        if (!skillToUse) return;

        if (!user || !user._id) {
            toast.error('Please log in again.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/sessions', {
                skillId: skillToUse._id,
                mode: 'explain',
                inputType: 'voice',
                difficulty,
                userId: user._id,
            });
            if (res.data.success && res.data.data?.session) {
                navigate(`/dashboard/session/${res.data.data.session._id}`);
            }
        } catch (error) {
            console.error('Failed to start session', error);
            toast.error('Failed to start session');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="space-y-12 animate-in fade-in duration-500">
                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">Start Skill Check</h1>
                    <p className="text-muted-foreground text-lg">
                        Explain a technical concept in your words. We evaluate clarity, correctness, and depth.
                    </p>
                </div>

                {/* Topic Selection */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2 text-foreground">
                        Choose a Topic
                    </h2>
                    <div className="flex flex-wrap gap-3">
                        <Button
                            variant="outline"
                            size="icon"
                            className="rounded-full h-11 w-11 text-primary border-primary/20 bg-primary/10 hover:bg-primary/20"
                            onClick={() => {
                                setIsCustomTopic(false);
                                const random = skills[Math.floor(Math.random() * skills.length)];
                                if (random) setSelectedSkill(random);
                            }}
                        >
                            <Shuffle className="h-4 w-4" />
                        </Button>
                        {skills?.map((skill) => (
                            <button
                                key={skill._id}
                                onClick={() => {
                                    setIsCustomTopic(false);
                                    setSelectedSkill(skill);
                                }}
                                className={cn(
                                    "px-6 py-2.5 rounded-full text-sm font-medium transition-all border",
                                    !isCustomTopic && selectedSkill?._id === skill._id
                                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                        : "bg-card text-foreground border-border hover:border-primary/50 hover:bg-muted/50"
                                )}
                            >
                                {skill.name}
                            </button>
                        ))}
                        <button
                            onClick={() => setIsCustomTopic(true)}
                            className={cn(
                                "px-6 py-2.5 rounded-full text-sm font-medium border transition-all",
                                isCustomTopic
                                    ? "bg-primary text-primary-foreground border-primary shadow-md scale-105"
                                    : "border-dashed border-muted-foreground/50 text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
                            )}
                        >
                            Custom Topic
                        </button>
                    </div>

                    {isCustomTopic && (
                        <div className="max-w-sm pt-2 animate-in slide-in-from-top-2 duration-300">
                            <Label className="text-xs font-bold text-muted-foreground uppercase mb-1.5 block">Custom Skill Name</Label>
                            <Input
                                placeholder="e.g. Redis, Kubernetes, React Hooks..."
                                value={customTopicName}
                                onChange={(e) => setCustomTopicName(e.target.value)}
                                className="h-12 rounded-xl bg-muted/50 border-input focus:bg-background text-foreground"
                            />
                        </div>
                    )}
                </div>

                {/* Difficulty Selection */}
                <div className="space-y-6">
                    <h2 className="text-xl font-semibold text-foreground">Select Difficulty</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'beginner', title: 'Beginner', desc: '(Fundamental concepts)' },
                            { id: 'intermediate', title: 'Intermediate', desc: '(Practical application)' },
                            { id: 'advanced', title: 'Advanced', desc: '(Deep dive & architecture)' }
                        ].map((level) => (
                            <Card
                                key={level.id}
                                onClick={() => setDifficulty(level.id as Difficulty)}
                                className={cn(
                                    "cursor-pointer transition-all border-2",
                                    difficulty === level.id
                                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                                        : "border-border hover:border-primary/30"
                                )}
                            >
                                <div className="p-6">
                                    <h3 className="font-bold text-lg text-foreground">{level.title}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">{level.desc}</p>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* Instructions */}
                <Card className="bg-muted/30 border-border">
                    <div className="p-6 space-y-4">
                        <h3 className="font-bold text-foreground">Instructions</h3>
                        <ul className="space-y-3 text-muted-foreground">
                            <li className="flex items-center gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border text-xs font-bold text-foreground">1</span>
                                Select your topic & difficulty
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border text-xs font-bold text-foreground">2</span>
                                Record your explanation (up to 5 min)
                            </li>
                            <li className="flex items-center gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-card border border-border text-xs font-bold text-foreground">3</span>
                                Get instant AI feedback & insights
                            </li>
                        </ul>
                    </div>
                </Card>

                {/* Footer Actions */}
                <div className="flex items-center justify-end gap-4 pt-4">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')}>Back</Button>
                    <Button
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 rounded-xl h-12 shadow-lg shadow-primary/20"
                        onClick={handleStartSession}
                        disabled={loading || (!isCustomTopic && !selectedSkill) || (isCustomTopic && !customTopicName.trim())}
                    >
                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Start Skill Check"}
                    </Button>
                </div>
            </div>
        </div>
    );
};
