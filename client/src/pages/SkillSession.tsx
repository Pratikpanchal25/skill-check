
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
    Brain,
    Mic,
    StopCircle,
    Sparkles,
    RotateCcw,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface EvaluationResult {
    clarity: number;
    correctness: number;
    depth: number;
    missingConcepts: string[];
    reaction: 'impressed' | 'neutral' | 'confused' | 'skeptical';
}

interface Session {
    _id: string;
    skillId: {
        _id: string;
        name: string;
    };
    difficulty: string;
    status: string;
}

export const SkillSession: React.FC = () => {
    const { id: sessionId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    const [step, setStep] = useState(1); // 1: recording, 2: evaluation

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await api.get(`/sessions/${sessionId}`);
                if (res.data.success && res.data.data?.session) {
                    setSession(res.data.data.session);
                    if (res.data.data.session.status === 'completed') {
                        // If already completed, maybe fetch evaluation?
                        // For now just stay on recording or allow re-recording
                    }
                }
            } catch (error) {
                console.error('Failed to fetch session', error);
                toast.error('Failed to load session');
                navigate('/dashboard/skillcheck');
            } finally {
                setLoading(false);
            }
        };

        if (sessionId) fetchSession();
    }, [sessionId, navigate]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast.error('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmitEvaluation = async () => {
        if (!audioBlob || !sessionId) return;
        setLoading(true);
        try {
            await api.post(`/sessions/${sessionId}/answer`, {
                rawText: "Sample transcript of the recorded audio for " + session?.skillId?.name,
                voiceMetrics: {
                    duration: recordingTime,
                    pauseCount: 2,
                    avgPauseDuration: 1.5,
                    fillerWordCount: 3
                }
            });

            const res = await api.post(`/sessions/${sessionId}/evaluate`);
            if (res.data.success && res.data.data?.evaluation?.result) {
                setEvaluation(res.data.data.evaluation.result);
                setStep(2);
            }
        } catch (error) {
            console.error('Evaluation failed', error);
            toast.error('Evaluation failed');
        } finally {
            setLoading(false);
        }
    };

    if (loading && !session) {
        return (
            <div className="h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {step === 1 && (
                <div className="flex flex-col items-center justify-center space-y-12 py-12 animate-in slide-in-from-bottom-8 duration-500">
                    <div className="text-center space-y-4">
                        <div className="inline-block p-3 bg-blue-100 rounded-2xl text-blue-600 mb-2">
                            <Brain className="h-8 w-8" />
                        </div>
                        <h2 className="text-3xl font-bold">Explaining {session?.skillId?.name}</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Go ahead! Explain the concepts, architecture, and use cases you know.
                        </p>
                    </div>

                    {/* Recording Visualizer Block */}
                    <div className="relative flex flex-col items-center space-y-8 bg-blue-50/30 w-full max-w-xl p-12 rounded-[2.5rem] border border-blue-100/50">
                        <div className="text-5xl font-mono font-bold text-slate-800">
                            {formatTime(recordingTime)}
                        </div>

                        <div className="flex items-center gap-6">
                            {!audioBlob ? (
                                <Button
                                    size="lg"
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={cn(
                                        "h-24 w-24 rounded-full border-4 shadow-xl active:scale-95 transition-all text-white",
                                        isRecording
                                            ? "bg-red-500 hover:bg-red-600 border-red-200 animate-pulse"
                                            : "bg-blue-600 hover:bg-blue-700 border-blue-200"
                                    )}
                                >
                                    {isRecording ? <StopCircle className="h-10 w-10 fill-white" /> : <Mic className="h-10 w-10" />}
                                </Button>
                            ) : (
                                <div className="flex gap-4">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        className="h-16 px-8 rounded-2xl border-2"
                                        onClick={() => { setAudioBlob(null); setRecordingTime(0); }}
                                    >
                                        <RotateCcw className="mr-2 h-5 w-5" /> Retake
                                    </Button>
                                    <Button
                                        size="lg"
                                        className="h-16 px-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                                        onClick={handleSubmitEvaluation}
                                        disabled={loading}
                                    >
                                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Get Evaluation"}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {isRecording && (
                            <div className="absolute -bottom-4 bg-white px-4 py-1 rounded-full border border-slate-200 shadow-sm text-xs font-bold text-red-500 flex items-center gap-2 animate-bounce">
                                <span className="h-2 w-2 rounded-full bg-red-500" /> Recording Live
                            </div>
                        )}
                    </div>
                </div>
            )}

            {step === 2 && evaluation && (
                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                    <Card className="border-blue-100 shadow-2xl overflow-hidden rounded-[2.5rem]">
                        <div className="bg-linear-to-b from-blue-50 to-white p-12 text-center space-y-6">
                            <div className="text-7xl mb-4">
                                {evaluation.reaction === 'impressed' ? '🤩' : evaluation.reaction === 'neutral' ? '😐' : evaluation.reaction === 'confused' ? '😕' : '🤨'}
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold">Interviewer Reaction</h2>
                                <p className="text-blue-600 font-bold uppercase tracking-widest text-sm">
                                    "{evaluation.reaction}!"
                                </p>
                            </div>
                        </div>
                        <CardContent className="p-12 pt-0 space-y-12">
                            {/* Scoreboard */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <ScoreCard label="Clarity" score={evaluation.clarity} color="blue" />
                                <ScoreCard label="Correctness" score={evaluation.correctness} color="green" />
                                <ScoreCard label="Depth" score={evaluation.depth} color="purple" />
                            </div>

                            {/* Missing Concepts */}
                            <div className="bg-slate-50/50 rounded-4xl p-8 border border-slate-100">
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-yellow-500" />
                                    Concepts to Dive Deeper Into
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {evaluation.missingConcepts.map((concept, i) => (
                                        <span key={i} className="px-5 py-2 bg-white rounded-xl text-slate-700 font-medium shadow-sm border border-slate-100">
                                            {concept}
                                        </span>
                                    ))}
                                    {evaluation.missingConcepts.length === 0 && (
                                        <p className="text-muted-foreground italic">You covered all the core concepts perfectly!</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-center flex-col md:flex-row gap-4">
                                <Button variant="outline" size="lg" className="rounded-xl px-12 h-14" onClick={() => navigate('/dashboard')}>
                                    Dashboard
                                </Button>
                                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-12 h-14" onClick={() => navigate('/dashboard/skillcheck')}>
                                    Try Another Concept
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

const ScoreCard = ({ label, score, color }: { label: string, score: number, color: 'blue' | 'green' | 'purple' }) => {
    const colors = {
        blue: 'text-blue-600 bg-blue-50 border-blue-100',
        green: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        purple: 'text-purple-600 bg-purple-50 border-purple-100'
    };

    return (
        <div className={cn("p-8 rounded-4xl border text-center space-y-2 shadow-sm", colors[color])}>
            <p className="text-4xl font-black">{score}/10</p>
            <p className="font-bold uppercase tracking-widest text-[10px] opacity-70">{label}</p>
        </div>
    );
};
