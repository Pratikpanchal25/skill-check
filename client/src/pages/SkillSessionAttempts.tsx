import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Loader2,
    RotateCcw,
    Mic,
    Sparkles,
    Trophy,
    Lightbulb,
    MessageSquare,
    CheckCircle2,
    TrendingUp,
    Volume2,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

/* -------------------------------- Types -------------------------------- */

interface EvaluationResult {
    clarity: number;
    correctness: number;
    depth: number;
    delivery?: number;
    missingConcepts: string[];
    reaction: 'impressed' | 'neutral' | 'confused' | 'skeptical';
    feedback?: string;
    improvementSuggestions?: string[];
    deliveryFeedback?: string;
}

/* ------------------------------- Component ------------------------------- */

export const SkillSessionAttempts: React.FC = () => {
    const { id: sessionId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [session, setSession] = useState<any | null>(null);
    const [attempts, setAttempts] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [reEvaluating, setReEvaluating] = useState(false);

    useEffect(() => {
        if (!sessionId) return;

        (async () => {
            try {
                const res = await api.get(`/sessions/${sessionId}/summary`);
                const summary = res.data?.data?.summary;
                if (!summary) throw new Error();

                setSession(summary.session);
                setAttempts(summary.attempts || []);
            } catch {
                navigate('/dashboard/skillcheck');
            } finally {
                setLoading(false);
            }
        })();
    }, [sessionId, navigate]);

    if (loading) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
        );
    }

    const hasAttempts = attempts.length > 0;
    const selectedAttempt = hasAttempts ? attempts[selectedIndex] : null;
    const evaluation: EvaluationResult | null = selectedAttempt?.evaluation ?? null;

    // Check if evaluation is pending (failed to complete - all scores are 0)
    const isEvaluationPending = (evalResult: EvaluationResult | null) => {
        if (!evalResult) return true; // No evaluation = pending
        // If all scores are 0, evaluation failed
        return evalResult.clarity === 0 && evalResult.correctness === 0 && evalResult.depth === 0;
    };

    const isPending = isEvaluationPending(evaluation);

    // Calculate average including delivery if available
    const calculateAverageNumber = (evalResult: EvaluationResult | null) => {
        if (!evalResult) return null;
        const scores = [evalResult.clarity, evalResult.correctness, evalResult.depth];
        if (typeof evalResult.delivery === 'number') scores.push(evalResult.delivery);
        return scores.reduce((a, b) => a + b, 0) / scores.length;
    };

    const calculateAverage = (evalResult: EvaluationResult | null) => {
        const n = calculateAverageNumber(evalResult);
        return n == null ? '—' : n.toFixed(1);
    };

    const avgNumber = calculateAverageNumber(evaluation);
    const avg = calculateAverage(evaluation);

    const dimensions = evaluation
        ? ([
            { key: 'clarity', label: 'Clarity', score: evaluation.clarity, color: 'blue' as const },
            { key: 'correctness', label: 'Correctness', score: evaluation.correctness, color: 'green' as const },
            { key: 'depth', label: 'Depth', score: evaluation.depth, color: 'purple' as const },
            ...(typeof evaluation.delivery === 'number'
                ? ([{ key: 'delivery', label: 'Delivery', score: evaluation.delivery, color: 'orange' as const }] as const)
                : [])
        ] as const)
        : null;

    const focusKey = dimensions
        ? dimensions.reduce((min, cur) => (cur.score < min.score ? cur : min)).key
        : null;

    const getReactionEmoji = (score: number) => {
        if (score >= 8) return '🤩';
        if (score >= 6) return '😊';
        if (score >= 4) return '😐';
        return '😕';
    };

    const getReactionText = (score: number) => {
        if (score >= 8) return 'Impressive!';
        if (score >= 6) return 'Good Job!';
        if (score >= 4) return 'Keep Trying';
        return 'Needs Work';
    };

    const handleReEvaluate = async (answerId: string) => {
        if (!sessionId) return;
        setReEvaluating(true);
        try {
            const res = await api.post(`/sessions/${sessionId}/evaluate`, { answerId });
            if (res.data.success === 1) {
                const evaluation = res.data.data?.evaluation;
                const isFailure = evaluation && evaluation.clarity === 0 && evaluation.correctness === 0 && evaluation.depth === 0;

                if (res.data.data?.evaluationPending || isFailure) {
                    toast.error('Evaluation failed. Please try again later.');
                } else {
                    toast.success('Re-evaluation complete!');
                }

                // Always refresh the page data to show the latest state (even if failed)
                const summaryRes = await api.get(`/sessions/${sessionId}/summary`);
                const summary = summaryRes.data?.data?.summary;
                if (summary) {
                    setSession(summary.session);
                    setAttempts(summary.attempts || []);
                }
            }
        } catch (error) {
            console.error('Re-evaluation failed:', error);
            toast.error('Re-evaluation failed. Please try again.');
        } finally {
            setReEvaluating(false);
        }
    };

    return (
        <div className="bg-background lg:overflow-hidden lg:h-full flex flex-col">
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
                        <div>
                            <h1 className="text-xl font-semibold text-foreground">{session?.skillName}</h1>
                            <p className="text-xs text-muted-foreground">{session?.difficulty} · Session review</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Scroll Area (so scroll works on empty space too) */}
            <div className="flex-1 lg:min-h-0 lg:overflow-y-auto overscroll-contain [scrollbar-gutter:stable] hidden-scrollbar">
                {/* Main Grid - 2 Columns */}
                <div className="max-w-6xl mx-auto w-full flex flex-col lg:flex-row gap-6 px-6 py-6 pb-10">

                    {/* ================= LEFT COLUMN - Attempts Sidebar (Static) ================= */}
                    <div className="w-full lg:w-[320px] shrink-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
                        {/* Attempts Card */}
                        <div className="border border-border/50 rounded-xl bg-card">
                            <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    Attempts
                                </h3>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 px-3 text-xs cursor-pointer"
                                    onClick={() => navigate(`/dashboard/session/${sessionId}/record`)}
                                >
                                    <RotateCcw className="h-3 w-3 mr-1.5" /> New Take
                                </Button>
                            </div>

                            <div className="p-3 max-h-100 overflow-y-auto">
                                {hasAttempts ? (
                                    <div className="space-y-2">
                                        {attempts.map((a, i) => {
                                            const attemptIsPending = isEvaluationPending(a.evaluation);
                                            const score = calculateAverage(a.evaluation);

                                            return (
                                                <button
                                                    key={a.answer._id}
                                                    onClick={() => setSelectedIndex(i)}
                                                    className={cn(
                                                        "w-full text-left px-4 py-3 rounded-lg transition-all cursor-pointer",
                                                        i === selectedIndex
                                                            ? attemptIsPending
                                                                ? "bg-yellow-500/10 border border-yellow-500/30"
                                                                : "bg-primary/10 border border-primary/30"
                                                            : "hover:bg-muted/50 border border-transparent"
                                                    )}
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-sm font-medium">Take {attempts.length - i}</span>
                                                        {attemptIsPending ? (
                                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                                                                Pending
                                                            </span>
                                                        ) : (
                                                            <span className="text-sm font-bold text-primary">
                                                                {score}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {new Date(a.answer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {!attemptIsPending && ` · ${a.answer.rawText?.split(' ').length || 0} words`}
                                                    </p>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="py-12 text-center space-y-4">
                                        <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto">
                                            <Mic className="h-8 w-8 text-muted-foreground/60" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-muted-foreground">No attempts yet</p>
                                            <p className="text-xs text-muted-foreground/70 mt-1">
                                                Record your first explanation
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Quick Stats Card */}
                        {hasAttempts && (
                            <div className="border border-border/50 rounded-xl bg-card p-5">
                                <h3 className="text-sm font-semibold text-foreground mb-4">
                                    Session Stats
                                </h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Total Attempts</span>
                                        <span className="font-semibold">{attempts.length}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Best Score</span>
                                        <span className="font-semibold text-primary">
                                            {Math.max(...attempts.map(a => {
                                                if (!a.evaluation) return 0;
                                                const scores = [a.evaluation.clarity, a.evaluation.correctness, a.evaluation.depth];
                                                if (typeof a.evaluation.delivery === 'number') scores.push(a.evaluation.delivery);
                                                return scores.reduce((sum, s) => sum + s, 0) / scores.length;
                                            })).toFixed(1)}/10
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Skill</span>
                                        <span className="font-medium">{session?.skillName}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ================= RIGHT COLUMN - Evaluation Content ================= */}
                    <div className="flex-1 min-w-0 space-y-6 pr-3">

                        {!hasAttempts ? (
                            <div className="border border-dashed border-border rounded-xl bg-linear-to-br from-card to-primary/5 flex flex-col items-center justify-center py-24">
                                <div className="relative mb-8">
                                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                                    <div className="relative p-5 bg-primary/10 rounded-2xl">
                                        <Mic className="h-12 w-12 text-primary" />
                                    </div>
                                </div>
                                <h2 className="text-2xl font-semibold mb-3">Ready to Start?</h2>
                                <p className="text-muted-foreground text-center max-w-md mb-8">
                                    Record your explanation and get AI-powered feedback on clarity, correctness, depth, and voice delivery.
                                </p>
                                <Button
                                    size="lg"
                                    onClick={() => navigate(`/dashboard/session/${sessionId}/record`)}
                                    className="px-10"
                                >
                                    <Mic className="h-4 w-4 mr-2" />
                                    Record Your First Take
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Hero Score Card */}
                                <div className="border border-border/50 rounded-xl bg-linear-to-br from-card via-card to-primary/5 overflow-hidden">
                                    <div className="px-4 sm:px-8 py-6 sm:py-8 border-b border-border/30 bg-linear-to-r from-transparent via-primary/5 to-transparent">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
                                            <div className="flex items-center gap-4 sm:gap-5">
                                                <div className="text-4xl sm:text-6xl">
                                                    {isPending ? '⚠️' : (evaluation ? getReactionEmoji(avgNumber ?? 0) : '🎯')}
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Evaluation Result</p>
                                                    <p className="text-xl sm:text-3xl font-bold text-foreground">
                                                        {isPending ? 'Evaluation Failed' : (evaluation ? getReactionText(avgNumber ?? 0) : 'Pending')}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-left sm:text-right pl-14 sm:pl-0">
                                                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Overall Score</p>
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-4xl sm:text-5xl font-bold text-primary">
                                                        {isPending ? '-' : avg}
                                                    </span>
                                                    <span className="text-lg sm:text-xl text-muted-foreground">/10</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Score Breakdown */}
                                    <div className="p-4 sm:p-8">
                                        <div className={cn(
                                            "grid gap-3 sm:gap-6 mb-8",
                                            typeof evaluation?.delivery === 'number' 
                                                ? "grid-cols-2 sm:grid-cols-4" 
                                                : "grid-cols-2 sm:grid-cols-3"
                                        )}>
                                            <ScoreCard label="Clarity" value={evaluation?.clarity} color="blue" />
                                            <ScoreCard label="Correctness" value={evaluation?.correctness} color="green" />
                                            <ScoreCard label="Depth" value={evaluation?.depth} color="purple" />
                                            {typeof evaluation?.delivery === 'number' && (
                                                <ScoreCard label="Delivery" value={evaluation.delivery} color="orange" />
                                            )}
                                        </div>

                                        {/* Balance Meter (no duplicate numbers) */}
                                        {dimensions && (
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                                        Balance vs average
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Lowest metric is marked as <span className="text-amber-500 font-medium">Focus</span>
                                                    </p>
                                                </div>
                                                <div className="space-y-4">
                                                    {dimensions.map((d) => (
                                                        <ScoreBar
                                                            key={d.key}
                                                            label={d.label}
                                                            score={d.score}
                                                            color={d.color}
                                                            delta={avgNumber == null ? null : d.score - avgNumber}
                                                            highlight={d.key === focusKey}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Buttons */}
                                        <div className="mt-8 pt-6 border-t border-border/30 space-y-3">
                                            {isPending && selectedAttempt && (
                                                <Button
                                                    size="lg"
                                                    className="w-full"
                                                    onClick={() => handleReEvaluate(selectedAttempt.answer._id)}
                                                    disabled={reEvaluating}
                                                >
                                                    {reEvaluating ? (
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="h-4 w-4 mr-2" />
                                                    )}
                                                    Re-evaluate This Recording
                                                </Button>
                                            )}
                                            {!isPending && (
                                                <Button
                                                    size="lg"
                                                    className="w-full"
                                                    onClick={() => navigate(`/dashboard/session/${sessionId}/record`)}
                                                >
                                                    <RotateCcw className="h-4 w-4 mr-2" />
                                                    Retake This Explanation
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Error Card for Pending Evaluation */}
                                {isPending && (
                                    <div className="border border-yellow-500/30 rounded-xl bg-yellow-500/5 p-6 text-center">
                                        <div className="inline-flex items-center justify-center p-3 bg-yellow-500/10 rounded-full mb-4">
                                            <RefreshCw className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold text-yellow-600 dark:text-yellow-400 mb-2">
                                            Evaluation Failed
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            We couldn't evaluate your recording at this time due to a server error.
                                            Your recording has been saved - please click "Re-evaluate" to try again.
                                        </p>
                                    </div>
                                )}

                                {/* Delivery Feedback Section - only show when not pending */}
                                {!isPending && evaluation?.deliveryFeedback && typeof evaluation.delivery === 'number' && (
                                    <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
                                        <div className="px-6 py-4 border-b border-border/30 bg-linear-to-r from-orange-500/5 to-transparent">
                                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-orange-500/10">
                                                    <Volume2 className="h-4 w-4 text-orange-500" />
                                                </div>
                                                Voice Delivery Feedback
                                            </h3>
                                        </div>
                                        <div className="p-6">
                                            <blockquote className="text-foreground/90 leading-relaxed italic border-l-4 border-orange-500/30 pl-5 py-3 bg-orange-500/5 rounded-r-lg">
                                                "{evaluation.deliveryFeedback}"
                                            </blockquote>
                                        </div>
                                    </div>
                                )}

                                {/* Feedback Section - only show when not pending */}
                                {!isPending && evaluation?.feedback && (
                                    <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
                                        <div className="px-6 py-4 border-b border-border/30 bg-linear-to-r from-primary/5 to-transparent">
                                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-primary/10">
                                                    <MessageSquare className="h-4 w-4 text-primary" />
                                                </div>
                                                Detailed Feedback
                                            </h3>
                                        </div>
                                        <div className="p-6">
                                            <blockquote className="text-foreground/90 leading-relaxed italic border-l-4 border-primary/30 pl-5 py-3 bg-muted/20 rounded-r-lg">
                                                "{evaluation.feedback}"
                                            </blockquote>
                                        </div>
                                    </div>
                                )}

                                {/* Analysis Grid - only show when not pending */}
                                {!isPending && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                        {/* Missing Concepts */}
                                        <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
                                            <div className="px-6 py-4 border-b border-border/30 bg-linear-to-r from-red-500/5 to-transparent">
                                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-red-500/10">
                                                        <Sparkles className="h-4 w-4 text-red-500" />
                                                    </div>
                                                    Areas to Improve
                                                    {evaluation?.missingConcepts && evaluation.missingConcepts.length > 0 && (
                                                        <span className="ml-auto text-xs bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                                                            {evaluation.missingConcepts.length} gaps
                                                        </span>
                                                    )}
                                                </h3>
                                            </div>
                                            <div className="p-5 max-h-70 overflow-y-auto thin-scrollbar">
                                                {evaluation?.missingConcepts && evaluation.missingConcepts.length > 0 ? (
                                                    <ul className="space-y-3">
                                                        {evaluation.missingConcepts.map((concept, i) => (
                                                            <li key={i} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-lg group hover:bg-red-500/10 transition-colors">
                                                                <div className="mt-0.5 h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">{i + 1}</span>
                                                                </div>
                                                                <span className="text-sm text-foreground/80 leading-relaxed">{concept}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                                        <div className="p-3 rounded-full bg-green-500/10 mb-3">
                                                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                                                        </div>
                                                        <p className="text-sm font-medium text-green-600 dark:text-green-400">Excellent coverage!</p>
                                                        <p className="text-xs text-muted-foreground mt-1">No major gaps identified</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Improvement Suggestions */}
                                        <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
                                            <div className="px-6 py-4 border-b border-border/30 bg-linear-to-r from-primary/5 to-transparent">
                                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-primary/10">
                                                        <Lightbulb className="h-4 w-4 text-primary" />
                                                    </div>
                                                    Next Steps
                                                    {evaluation?.improvementSuggestions && evaluation.improvementSuggestions.length > 0 && (
                                                        <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                            {evaluation.improvementSuggestions.length} tips
                                                        </span>
                                                    )}
                                                </h3>
                                            </div>
                                            <div className="p-5 max-h-70 overflow-y-auto thin-scrollbar">
                                                {evaluation?.improvementSuggestions && evaluation.improvementSuggestions.length > 0 ? (
                                                    <ul className="space-y-3">
                                                        {evaluation.improvementSuggestions.map((suggestion, i) => (
                                                            <li key={i} className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/10 rounded-lg group hover:bg-primary/10 transition-colors">
                                                                <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                                                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                                                                </div>
                                                                <span className="text-sm text-foreground/80 leading-relaxed">{suggestion}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-10 text-center">
                                                        <div className="p-3 rounded-full bg-primary/10 mb-3">
                                                            <Trophy className="h-8 w-8 text-primary" />
                                                        </div>
                                                        <p className="text-sm font-medium text-primary">Great job!</p>
                                                        <p className="text-xs text-muted-foreground mt-1">Keep up the excellent work</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Your Response */}
                                <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
                                    <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
                                        <h3 className="text-sm font-semibold flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-muted">
                                                <Mic className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            Your Response
                                        </h3>
                                        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                            {selectedAttempt?.answer.rawText?.split(' ').length || 0} words
                                        </span>
                                    </div>
                                    <div className="p-6 bg-muted/10 max-h-88 overflow-y-auto">
                                        <div className="relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-primary via-primary/50 to-transparent rounded-full" />
                                            <p className="text-sm text-foreground/80 leading-relaxed pl-5 font-mono whitespace-pre-wrap">
                                                {selectedAttempt?.answer.rawText || selectedAttempt?.answer.transcript}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ------------------------------ Helpers ------------------------------ */

const ScoreCard = ({ label, value, color }: { label: string; value?: number; color: 'blue' | 'green' | 'purple' | 'orange' }) => {
    const colors = {
        blue: {
            bg: 'bg-blue-500/10',
            text: 'text-blue-600 dark:text-blue-400',
            border: 'border-blue-500/20',
            ring: 'ring-blue-500/20'
        },
        green: {
            bg: 'bg-green-500/10',
            text: 'text-green-600 dark:text-green-400',
            border: 'border-green-500/20',
            ring: 'ring-green-500/20'
        },
        purple: {
            bg: 'bg-purple-500/10',
            text: 'text-purple-600 dark:text-purple-400',
            border: 'border-purple-500/20',
            ring: 'ring-purple-500/20'
        },
        orange: {
            bg: 'bg-orange-500/10',
            text: 'text-orange-600 dark:text-orange-400',
            border: 'border-orange-500/20',
            ring: 'ring-orange-500/20'
        }
    };

    const getScoreLevel = (s: number) => {
        if (s >= 8) return 'Excellent';
        if (s >= 6) return 'Good';
        if (s >= 4) return 'Fair';
        return 'Needs Work';
    };

    return (
        <div className={cn(
            "relative border rounded-xl p-3 sm:p-6 text-center transition-all hover:scale-[1.02]",
            colors[color].border,
            colors[color].bg
        )}>
            <div className={cn(
                "w-14 h-14 sm:w-20 sm:h-20 rounded-full mx-auto mb-2 sm:mb-4 flex items-center justify-center ring-2 sm:ring-4",
                "bg-background",
                colors[color].ring
            )}>
                <span className={cn("text-xl sm:text-3xl font-bold", colors[color].text)}>{value ?? 0}</span>
            </div>
            <p className={cn("text-sm sm:text-base font-semibold mb-0.5 sm:mb-1", colors[color].text)}>{label}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">{value ? getScoreLevel(value) : '—'}</p>
        </div>
    );
};

const ScoreBar = ({
    label,
    score,
    color,
    delta,
    highlight
}: {
    label: string;
    score: number;
    color: 'blue' | 'green' | 'purple' | 'orange';
    delta?: number | null;
    highlight?: boolean;
}) => {
    const colors = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        orange: 'bg-orange-500'
    };

    const bgColors = {
        blue: 'bg-blue-500/20',
        green: 'bg-green-500/20',
        purple: 'bg-purple-500/20',
        orange: 'bg-orange-500/20'
    };

    const deltaText =
        typeof delta === 'number' && Number.isFinite(delta)
            ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1)} vs avg`
            : null;

    return (
        <div className="flex items-center gap-2 sm:gap-4">
            <span className="text-xs text-muted-foreground w-20 sm:w-24 shrink-0">{label}</span>

            <div className={cn("flex-1 h-2 rounded-full overflow-hidden", bgColors[color])}>
                <div
                    className={cn("h-full rounded-full transition-all duration-1000 ease-out", colors[color])}
                    style={{ width: `${Math.max(0, Math.min(10, score)) * 10}%` }}
                />
            </div>

            {highlight ? (
                <span className="text-[10px] sm:text-[11px] font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                    Focus
                </span>
            ) : (
                <span
                    className={cn(
                        "text-[10px] sm:text-[11px] font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full border shrink-0",
                        deltaText
                            ? delta! >= 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            : "bg-muted text-muted-foreground border-border"
                    )}
                >
                    {deltaText ?? '—'}
                </span>
            )}
        </div>
    );
};

export default SkillSessionAttempts;
