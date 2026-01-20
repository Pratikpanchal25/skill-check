import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Trophy, ArrowLeft, MessageSquare, Sparkles, Lightbulb, Mic, CheckCircle2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface EvaluationResult {
    clarity: number;
    correctness: number;
    depth: number;
    missingConcepts: string[];
    reaction: 'impressed' | 'neutral' | 'confused' | 'skeptical';
    feedback?: string;
    improvementSuggestions?: string[];
}

export const SkillSessionAttempts: React.FC = () => {
    const { id: sessionId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [session, setSession] = useState<any | null>(null);
    const [attempts, setAttempts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    const [selectedAttemptIndex, setSelectedAttemptIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchSessionSummary = async () => {
            if (!sessionId) return;
            try {
                const res = await api.get(`/sessions/${sessionId}/summary`);
                if (res.data.success === 1 && res.data.data?.summary) {
                    const { session, attempts } = res.data.data.summary;
                    setSession(session);
                    setAttempts(attempts);
                    if (attempts.length > 0) {
                        setEvaluation(attempts[0].evaluation);
                        setSelectedAttemptIndex(0);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch session summary', error);
                navigate('/dashboard/skillcheck');
            } finally {
                setLoading(false);
            }
        };

        fetchSessionSummary();
    }, [sessionId, navigate]);

    if (loading && !session) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            <div className="space-y-6 animate-in fade-in duration-500 pb-20">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/dashboard')}
                    className="group flex items-center gap-2 text-muted-foreground hover:text-foreground -ml-4"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    Back to Dashboard
                </Button>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div className="lg:col-span-1 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Trophy className="h-4 w-4" /> Attempts
                            </h3>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-primary hover:text-primary/10 hover:bg-primary/5 font-bold text-xs"
                                onClick={() => navigate(`/dashboard/session/${sessionId}/record`)}
                            >
                                <RotateCcw className="h-3 w-3 mr-1" /> New Take
                            </Button>
                        </div>
                        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                            {attempts && attempts.length > 0 ? attempts.map((attempt, index) => (
                                <Card
                                    key={attempt.answer._id}
                                    className={cn(
                                        "cursor-pointer transition-all border relative group overflow-hidden",
                                        selectedAttemptIndex === index
                                            ? "border-primary bg-primary/5 shadow-sm"
                                            : "border-border/40 hover:border-primary/20 hover:bg-muted/30"
                                    )}
                                    onClick={() => {
                                        setSelectedAttemptIndex(index);
                                        setEvaluation(attempt.evaluation);
                                    }}
                                >
                                    <CardContent className="p-3">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <div className="space-y-0.5">
                                                <span className="text-[10px] font-bold text-muted-foreground/80 block uppercase tracking-tight">TAKE #{attempts.length - index}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {attempt.evaluation && (
                                                    <div className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded border border-primary/10">
                                                        {((attempt.evaluation.correctness + attempt.evaluation.clarity + attempt.evaluation.depth) / 3).toFixed(1)}
                                                    </div>
                                                )}
                                                <p className="text-[9px] text-muted-foreground/60 font-medium">
                                                    {new Date(attempt.answer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-foreground/70 line-clamp-2 leading-relaxed italic">"{attempt.answer.rawText || attempt.answer.transcript}"</p>
                                    </CardContent>
                                </Card>
                            )) : (
                                <p className="text-sm text-muted-foreground italic text-center py-8">No attempts recorded</p>
                            )}
                        </div>
                    </div>

                    <div className="lg:col-span-3">
                        {evaluation ? (
                            <div className="space-y-6 animate-in zoom-in-95 duration-500">
                                <Card className="border-border shadow-xl overflow-hidden rounded-3xl bg-card/50 backdrop-blur-xl">
                                    <div className="bg-linear-to-b from-primary/5 via-primary/0 to-transparent p-10 text-center space-y-4">
                                        <div className="text-6xl mb-2 drop-shadow-sm animate-bounce duration-2000">
                                            {evaluation.reaction === 'impressed' ? '🤩' : evaluation.reaction === 'neutral' ? '😐' : evaluation.reaction === 'confused' ? '😕' : '🤨'}
                                        </div>
                                        <div className="space-y-1">
                                            <h2 className="text-3xl font-bold tracking-tight text-foreground lowercase italic">"{evaluation.reaction}!"</h2>
                                            <p className="text-muted-foreground font-medium text-sm">The interviewer's immediate reaction</p>
                                        </div>
                                    </div>
                                    <CardContent className="p-10 pt-0 space-y-10">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <ScoreCard label="Clarity" score={evaluation.clarity} color="blue" />
                                            <ScoreCard label="Correctness" score={evaluation.correctness} color="green" />
                                            <ScoreCard label="Depth" score={evaluation.depth} color="purple" />
                                        </div>

                                        <div className="space-y-6">
                                            {evaluation.feedback && (
                                                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 relative overflow-hidden group">
                                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                                        <MessageSquare className="h-24 w-24 text-primary" />
                                                    </div>
                                                    <div className="relative">
                                                        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 mb-3 flex items-center gap-2">
                                                            <MessageSquare className="h-3 w-3" /> Interviewer Feedback
                                                        </h3>
                                                        <p className="text-base text-foreground/90 leading-relaxed font-medium italic">"{evaluation.feedback}"</p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-muted/10 border border-border/40 rounded-2xl p-6">
                                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                                                        <Sparkles className="h-3 w-3 text-yellow-500" /> Key Gaps Identified
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {evaluation.missingConcepts.length > 0 ? (
                                                            evaluation.missingConcepts.map((concept, i) => (
                                                                <div key={i} className="flex items-start gap-3 p-3 bg-card/50 rounded-xl border border-border/20">
                                                                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-red-400 shrink-0" />
                                                                    <span className="text-sm text-foreground/80 font-medium">{concept}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="flex items-center gap-3 p-4 bg-green-500/5 rounded-xl border border-green-500/10">
                                                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                                                                <p className="text-sm text-green-600 font-medium">Excellent! No major concept gaps found.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="bg-muted/10 border border-border/40 rounded-2xl p-6">
                                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                                                        <Lightbulb className="h-3 w-3 text-primary" /> Roadmap to Mastery
                                                    </h3>
                                                    <div className="space-y-3">
                                                        {evaluation.improvementSuggestions && evaluation.improvementSuggestions.length > 0 ? (
                                                            evaluation.improvementSuggestions.map((suggestion, i) => (
                                                                <div key={i} className="flex items-start gap-3 p-3 bg-card/50 rounded-xl border border-border/20">
                                                                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/40 shrink-0" />
                                                                    <span className="text-sm text-foreground/80 font-medium">{suggestion}</span>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                                                                <Sparkles className="h-5 w-5 text-primary" />
                                                                <p className="text-sm text-primary/70 font-medium">Continue following your current learning path!</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-muted/20 rounded-2xl p-8 border border-border/40">
                                                <h3 className="font-bold text-[10px] uppercase tracking-widest mb-4 flex items-center gap-2 text-foreground/50">
                                                    <Mic className="h-3 w-3" /> Your Explanation Transcript
                                                </h3>
                                                <div className="bg-card/30 rounded-xl p-6 text-[14px] text-foreground/80 leading-relaxed italic border border-border/20 shadow-inner">
                                                    "{attempts[selectedAttemptIndex!]?.answer.rawText || attempts[selectedAttemptIndex!]?.answer.transcript}"
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-center flex-col md:flex-row gap-4">
                                            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-12 h-12 text-sm font-bold shadow-lg shadow-primary/10" onClick={() => navigate(`/dashboard/session/${sessionId}/record`)}>
                                                Try Another Take
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            <Card className="h-full border-dashed border-2 flex flex-col items-center justify-center py-32 rounded-[3rem] bg-muted/10 space-y-6">
                                <div className="p-6 bg-primary/5 rounded-full ring-8 ring-primary/5 animate-pulse">
                                    <Sparkles className="h-16 w-16 text-primary" />
                                </div>
                                <div className="space-y-3 text-center">
                                    <h3 className="text-3xl font-black text-foreground">Evaluation Pending</h3>
                                    <p className="text-muted-foreground max-w-sm mx-auto text-lg leading-relaxed">We're still analyzing your technical accuracy and clarity. This usually takes 5-10 seconds.</p>
                                </div>
                                <div className="flex gap-4">
                                    <Button className="rounded-2xl px-10 h-14 font-black shadow-lg shadow-primary/20" onClick={() => window.location.reload()}>
                                        Refresh Results
                                    </Button>
                                    <Button variant="outline" className="rounded-2xl px-10 h-14 font-bold border-2" onClick={() => navigate('/dashboard')}>Go Help Others</Button>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ScoreCard = ({ label, score, color }: { label: string, score: number, color: 'blue' | 'green' | 'purple' }) => {
    const colors = {
        blue: 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50',
        green: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/50'
    } as any;

    return (
        <div className={cn("p-6 rounded-2xl border text-center space-y-1", colors[color])}>
            <p className="text-3xl font-bold tracking-tight">{score}/10</p>
            <p className="font-bold uppercase tracking-widest text-[9px] opacity-60 italic">{label}</p>
        </div>
    );
};

export default SkillSessionAttempts;
