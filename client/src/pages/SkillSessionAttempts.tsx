import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, RotateCcw, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

/* -------------------------------- Types -------------------------------- */

interface EvaluationResult {
    clarity: number;
    correctness: number;
    depth: number;
    missingConcepts: string[];
    reaction: 'impressed' | 'neutral' | 'confused' | 'skeptical';
    feedback?: string;
    improvementSuggestions?: string[];
}

/* ------------------------------- Component ------------------------------- */

export const SkillSessionAttempts: React.FC = () => {
    const { id: sessionId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [session, setSession] = useState<any | null>(null);
    const [attempts, setAttempts] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);

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

    const avg =
        evaluation
            ? ((evaluation.clarity + evaluation.correctness + evaluation.depth) / 3).toFixed(1)
            : '—';

    return (
        <div className="max-w-6xl mx-auto px-6 py-4 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-8">

                {/* ================= LEFT ================= */}
                <div className="space-y-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/dashboard')}
                        className="gap-2 text-muted-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>

                    <div>
                        <h1 className="text-2xl font-semibold">{session?.skillName}</h1>
                        <p className="text-sm text-muted-foreground">
                            {session?.difficulty} · Session review
                        </p>
                    </div>

                    {/* Attempts */}
                    <div className="border rounded-md bg-background overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-muted/30">
                            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Attempts
                            </h3>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => navigate(`/dashboard/session/${sessionId}/record`)}
                            >
                                <RotateCcw className="h-3 w-3 mr-1" />
                                New
                            </Button>
                        </div>

                        {hasAttempts ? (
                            attempts.map((a, i) => {
                                const score = a.evaluation
                                    ? ((a.evaluation.clarity + a.evaluation.correctness + a.evaluation.depth) / 3).toFixed(1)
                                    : '—';

                                return (
                                    <button
                                        key={a.answer._id}
                                        onClick={() => setSelectedIndex(i)}
                                        className={cn(
                                            'w-full px-3 py-2 text-sm flex justify-between items-center border-t',
                                            i === selectedIndex
                                                ? 'bg-primary/10'
                                                : 'hover:bg-muted/50'
                                        )}
                                    >
                                        <span>Take {attempts.length - i}</span>
                                        <span className="text-muted-foreground">{score}</span>
                                    </button>
                                );
                            })
                        ) : (
                            <div className="p-6 text-center space-y-3">
                                <Mic className="h-8 w-8 mx-auto text-muted-foreground/40" />
                                <p className="text-sm font-medium">No attempts yet</p>
                                <p className="text-xs text-muted-foreground">
                                    Record your first explanation to get feedback.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* ================= RIGHT ================= */}
                <main className="space-y-6">

                    {!hasAttempts ? (
                        <div className="h-full border rounded-lg flex flex-col items-center justify-center text-center p-10 bg-muted/20">
                            <h2 className="text-lg font-semibold mb-2">
                                No evaluation yet
                            </h2>
                            <p className="text-sm text-muted-foreground max-w-sm mb-6">
                                Once you record an attempt, we’ll analyze your explanation for
                                clarity, correctness, and depth.
                            </p>
                            <Button
                                size="lg"
                                onClick={() => navigate(`/dashboard/session/${sessionId}/record`)}
                            >
                                Record your first take
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Evaluation Summary */}
                            <section className="border rounded-lg p-6 bg-card">
                                <div className="flex justify-between">
                                    <div>
                                        <h2 className="text-lg font-semibold">Evaluation summary</h2>
                                        <p className="text-sm text-muted-foreground">
                                            Interviewer feedback & scoring
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-muted-foreground uppercase">Overall</div>
                                        <div className="text-3xl font-bold text-primary">{avg}/10</div>
                                    </div>
                                </div>

                                <div className="mt-6 grid grid-cols-3 gap-4">
                                    <ScoreCard label="Clarity" value={evaluation?.clarity} />
                                    <ScoreCard label="Correctness" value={evaluation?.correctness} />
                                    <ScoreCard label="Depth" value={evaluation?.depth} />
                                </div>
                            </section>

                            {/* Transcript */}
                            <section className="border rounded-md">
                                <div className="px-6 py-3 border-b text-sm font-medium">
                                    Your answer
                                </div>
                                <pre className="p-6 text-sm whitespace-pre-wrap bg-muted/30">
                                    {selectedAttempt?.answer.rawText ||
                                        selectedAttempt?.answer.transcript}
                                </pre>
                            </section>

                            <Button
                                size="lg"
                                onClick={() => navigate(`/dashboard/session/${sessionId}/record`)}
                            >
                                Try another take
                            </Button>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};

/* ------------------------------ Helpers ------------------------------ */

const ScoreCard = ({ label, value }: { label: string; value?: number }) => (
    <div className="border rounded-lg p-4 text-center bg-card/50">
        <div className="h-12 w-12 rounded-full mx-auto flex items-center justify-center text-lg font-bold bg-primary text-white">
            {value}
        </div>
        <p className="text-xs mt-3 uppercase tracking-wide text-muted-foreground">
            {label}
        </p>
    </div>
);

export default SkillSessionAttempts;
