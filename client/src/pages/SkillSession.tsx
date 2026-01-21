
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
    Brain,
    Mic,
    StopCircle,
    Sparkles,
    RotateCcw,
    Loader2,
    Trophy,
    ArrowLeft,
    Lightbulb,
    MessageSquare,
    CheckCircle2
} from 'lucide-react';
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

interface Session {
    _id: string;
    skillName: string;
    difficulty: string;
    status: string;
}

interface Attempt {
    answer: {
        _id: string;
        rawText: string;
        transcript?: string;
        createdAt: string;
    };
    evaluation: EvaluationResult | null;
}

interface SpeechRecognitionEvent {
    results: {
        length: number;
        [key: number]: {
            [key: number]: {
                transcript: string;
            };
        };
    };
}

interface SpeechRecognitionInstance {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: (event: SpeechRecognitionEvent) => void;
    start: () => void;
    stop: () => void;
}

export const SkillSession: React.FC = () => {
    const { id: sessionId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [session, setSession] = useState<Session | null>(null);
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    const [selectedAttemptIndex, setSelectedAttemptIndex] = useState<number | null>(null);
    const [step, setStep] = useState(1);
    const [transcript, setTranscript] = useState("");
    const [pauseCount, setPauseCount] = useState(0);
    const [avgPauseDuration, setAvgPauseDuration] = useState(0);
    const [fillerWordCount, setFillerWordCount] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const silenceStartRef = useRef<number | null>(null);
    const totalPauseTimeRef = useRef<number>(0);
    const pauseCountRef = useRef<number>(0);
    const isRecordingRef = useRef<boolean>(false);
    const isCurrentlyPausedRef = useRef<boolean>(false);

    useEffect(() => {
        const fetchSessionSummary = async () => {
            try {
                const res = await api.get(`/sessions/${sessionId}/summary`);
                if (res.data.success === 1 && res.data.data?.summary) {
                    const { session, attempts } = res.data.data.summary;
                    setSession(session);
                    setAttempts(attempts);

                    if (attempts.length > 0) {
                        setEvaluation(attempts[0].evaluation);
                        setStep(2);
                        setSelectedAttemptIndex(0);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch session summary', error);
                toast.error('Failed to load session');
                navigate('/dashboard/skillcheck');
            } finally {
                setLoading(false);
            }
        };

        if (sessionId) fetchSessionSummary();
    }, [sessionId, navigate]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Setup MediaRecorder
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

            // Setup Speech Recognition
            const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognitionConstructor) {
                const recognition = new SpeechRecognitionConstructor() as SpeechRecognitionInstance;
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event: SpeechRecognitionEvent) => {
                    let currentTranscript = "";
                    for (let i = 0; i < event.results.length; i++) {
                        currentTranscript += event.results[i][0].transcript;
                    }
                    setTranscript(currentTranscript);

                    // Count filler words
                    const fillers = ['um', 'uh', 'like', 'so', 'actually', 'basically', 'right'];
                    const words = currentTranscript.toLowerCase().split(/\s+/);
                    const count = words.filter(word => fillers.includes(word)).length;
                    setFillerWordCount(count);
                };

                recognition.start();
                recognitionRef.current = recognition;
            }

            // Setup Audio Analysis for Pauses
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);

            audioContextRef.current = audioContext;
            analyserRef.current = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            silenceStartRef.current = null;
            totalPauseTimeRef.current = 0;
            pauseCountRef.current = 0;

            const checkSilence = () => {
                if (!isRecordingRef.current) return;

                analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / bufferLength;

                // Threshold for silence (can be adjusted)
                if (average < 10) {
                    if (silenceStartRef.current === null) {
                        silenceStartRef.current = Date.now();
                    } else {
                        const silenceDuration = Date.now() - silenceStartRef.current;
                        // If silent for > 500ms, consider it a potential pause
                        if (silenceDuration > 500 && !isCurrentlyPausedRef.current) {
                            isCurrentlyPausedRef.current = true;
                            pauseCountRef.current += 1;
                            setPauseCount(pauseCountRef.current);
                        }
                    }
                } else {
                    if (silenceStartRef.current !== null && isCurrentlyPausedRef.current) {
                        const pauseDuration = (Date.now() - silenceStartRef.current) / 1000;
                        totalPauseTimeRef.current += pauseDuration;
                        setAvgPauseDuration(totalPauseTimeRef.current / pauseCountRef.current);
                    }
                    silenceStartRef.current = null;
                    isCurrentlyPausedRef.current = false;
                }

                requestAnimationFrame(checkSilence);
            };

            isRecordingRef.current = true;
            isCurrentlyPausedRef.current = false;
            checkSilence();

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
            isRecordingRef.current = false;

            if (timerRef.current) clearInterval(timerRef.current);
            if (recognitionRef.current) recognitionRef.current.stop();
            if (audioContextRef.current) audioContextRef.current.close();
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
            const answerRes = await api.post(`/sessions/${sessionId}/answer`, {
                rawText: transcript || "Node.js is a JavaScript runtime built on Chrome's V8 engine. It uses an event-driven, non-blocking I/O model making it lightweight and efficient. Node.js excels at building scalable network applications, REST APIs, and real-time services like chat applications using its single-threaded event loop architecture.",
                voiceMetrics: {
                    duration: recordingTime,
                    pauseCount: pauseCount,
                    avgPauseDuration: parseFloat(avgPauseDuration.toFixed(1)),
                    fillerWordCount: fillerWordCount
                }
            });

            const answerId = answerRes.data.data.answer._id;

            const res = await api.post(`/sessions/${sessionId}/evaluate`, { answerId });
            if (res.data.success === 1 && res.data.data?.evaluation) {
                // Refresh summary to get updated attempts list
                const summaryRes = await api.get(`/sessions/${sessionId}/summary`);
                if (summaryRes.data.success === 1 && summaryRes.data.data?.summary) {
                    const { attempts: updatedAttempts } = summaryRes.data.data.summary;
                    setAttempts(updatedAttempts);
                    setEvaluation(updatedAttempts[0].evaluation);
                    setSelectedAttemptIndex(0);
                    setStep(2);
                }
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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="bg-background overflow-hidden">
            {step === 1 && (
                <div className="animate-in slide-in-from-bottom-8 duration-500">
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
                                    Recording Session
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-7xl mx-auto px-6 py-12">
                        <div className="flex flex-col items-center justify-center space-y-10">
                            <div className="text-center space-y-4">
                                <div className="inline-block p-3 bg-primary/10 rounded-xl text-primary mb-2">
                                    <Brain className="h-8 w-8" />
                                </div>
                                <h2 className="text-3xl font-bold text-foreground">Explaining {session?.skillName}</h2>
                                <p className="text-muted-foreground max-w-md mx-auto">
                                    Go ahead! Explain the concepts, architecture, and use cases you know.
                                </p>
                            </div>

                            {/* Recording Visualizer Block */}
                            <div className="relative flex flex-col items-center space-y-8 border border-border/50 bg-card w-full max-w-xl p-12 rounded-xl shadow-sm">
                                <div className="flex flex-col items-center gap-4 w-full">
                                    <div className="text-5xl font-mono font-bold text-foreground">
                                        {formatTime(recordingTime)}
                                    </div>

                                    {isRecording && (
                                        <AudioVisualizer
                                            analyser={analyserRef.current}
                                            isRecording={isRecording}
                                        />
                                    )}
                                </div>

                                <div className="flex items-center gap-6">
                                    {!audioBlob ? (
                                        <Button
                                            size="lg"
                                            onClick={isRecording ? stopRecording : startRecording}
                                            className={cn(
                                                "h-24 w-24 rounded-full border-4 shadow-xl active:scale-95 transition-all text-white",
                                                isRecording
                                                    ? "bg-red-500 hover:bg-red-600 border-red-200 dark:border-red-900 animate-pulse"
                                                    : "bg-primary hover:bg-primary/90 border-primary/30"
                                            )}
                                        >
                                            {isRecording ? <StopCircle className="h-10 w-10 fill-white" /> : <Mic className="h-10 w-10" />}
                                        </Button>
                                    ) : (
                                        <div className="flex gap-4">
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                className="h-14 px-6 rounded-lg"
                                                onClick={() => {
                                                    setAudioBlob(null);
                                                    setRecordingTime(0);
                                                    setTranscript("");
                                                    setPauseCount(0);
                                                    setAvgPauseDuration(0);
                                                    setFillerWordCount(0);
                                                }}
                                            >
                                                <RotateCcw className="mr-2 h-5 w-5" /> Retake
                                            </Button>
                                            <Button
                                                size="lg"
                                                className="h-14 px-10 rounded-lg"
                                                onClick={handleSubmitEvaluation}
                                                disabled={loading}
                                            >
                                                {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Sparkles className="h-5 w-5 mr-2" />}
                                                Get Evaluation
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {isRecording && (
                                    <div className="absolute -bottom-4 bg-card px-4 py-1.5 rounded-lg border border-red-500/30 shadow-sm text-xs font-bold text-red-500 flex items-center gap-2">
                                        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> Recording Live
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="border-b border-border/30 px-6 py-5">
                        <div className="max-w-7xl mx-auto flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => navigate('/dashboard')}
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

                    {/* Main Grid */}
                    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 px-6 py-6 items-start">
                        
                        {/* LEFT COLUMN - Attempts Sidebar */}
                        <div className="space-y-6">
                            {/* Attempts Card */}
                            <div className="border border-border/50 rounded-xl bg-card">
                                <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
                                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                                        Attempts
                                    </h3>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-xs"
                                        onClick={() => {
                                            setStep(1);
                                            setAudioBlob(null);
                                            setRecordingTime(0);
                                            setTranscript("");
                                            setEvaluation(null);
                                            setSelectedAttemptIndex(null);
                                        }}
                                    >
                                        <RotateCcw className="h-3 w-3 mr-1" /> New
                                    </Button>
                                </div>
                                <div className="p-2 max-h-[60vh] overflow-y-auto">
                                    {attempts && attempts.length > 0 ? attempts.map((attempt, index) => (
                                        <button
                                            key={attempt.answer._id}
                                            className={cn(
                                                "w-full text-left px-3 py-2.5 rounded-lg transition-all mb-1 last:mb-0 cursor-pointer",
                                                selectedAttemptIndex === index
                                                    ? "bg-primary/10 border border-primary/30"
                                                    : "hover:bg-muted/50 border border-transparent"
                                            )}
                                            onClick={() => {
                                                setSelectedAttemptIndex(index);
                                                setEvaluation(attempt.evaluation);
                                            }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium">Take {attempts.length - index}</span>
                                                {attempt.evaluation && (
                                                    <span className="text-sm font-bold text-primary">
                                                        {((attempt.evaluation.correctness + attempt.evaluation.clarity + attempt.evaluation.depth) / 3).toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {new Date(attempt.answer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </button>
                                    )) : (
                                        <p className="text-sm text-muted-foreground text-center py-8">No attempts recorded</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN - Evaluation Content */}
                        <div className="space-y-6">
                            {evaluation ? (
                                <>
                                    {/* Hero Score Card */}
                                    <div className="border border-border/50 rounded-xl bg-linear-to-br from-card via-card to-primary/5 overflow-hidden">
                                        {/* Reaction Header */}
                                        <div className="px-6 py-6 border-b border-border/30 bg-linear-to-r from-transparent via-primary/5 to-transparent">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="text-5xl">
                                                        {evaluation.reaction === 'impressed' ? '🤩' : evaluation.reaction === 'neutral' ? '😐' : evaluation.reaction === 'confused' ? '😕' : '🤨'}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Interviewer Reaction</p>
                                                        <p className="text-2xl font-bold text-foreground capitalize">{evaluation.reaction}!</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Overall Score</p>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-4xl font-bold text-primary">
                                                            {((evaluation.correctness + evaluation.clarity + evaluation.depth) / 3).toFixed(1)}
                                                        </span>
                                                        <span className="text-lg text-muted-foreground">/10</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* Score Breakdown */}
                                        <div className="p-6">
                                            <div className="grid grid-cols-3 gap-4">
                                                <ScoreCard label="Clarity" score={evaluation.clarity} color="blue" icon="💬" />
                                                <ScoreCard label="Correctness" score={evaluation.correctness} color="green" icon="✓" />
                                                <ScoreCard label="Depth" score={evaluation.depth} color="purple" icon="🔍" />
                                            </div>
                                            
                                            {/* Progress Bars */}
                                            <div className="mt-6 space-y-3">
                                                <ScoreBar label="Clarity" score={evaluation.clarity} color="blue" />
                                                <ScoreBar label="Correctness" score={evaluation.correctness} color="green" />
                                                <ScoreBar label="Depth" score={evaluation.depth} color="purple" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Interviewer Feedback */}
                                    {evaluation.feedback && (
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
                                                <blockquote className="text-sm text-foreground/90 leading-relaxed italic border-l-4 border-primary/30 pl-4 py-2 bg-muted/20 rounded-r-lg">
                                                    "{evaluation.feedback}"
                                                </blockquote>
                                            </div>
                                        </div>
                                    )}

                                    {/* Analysis Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                                        {/* Key Gaps */}
                                        <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
                                            <div className="px-6 py-4 border-b border-border/30 bg-linear-to-r from-red-500/5 to-transparent">
                                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                                    <div className="p-1.5 rounded-lg bg-red-500/10">
                                                        <Sparkles className="h-4 w-4 text-red-500" />
                                                    </div>
                                                    Areas to Improve
                                                    {evaluation.missingConcepts.length > 0 && (
                                                        <span className="ml-auto text-xs bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                                                            {evaluation.missingConcepts.length} gaps
                                                        </span>
                                                    )}
                                                </h3>
                                            </div>
                                            <div className="p-4 max-h-62.5 overflow-y-auto">
                                                {evaluation.missingConcepts.length > 0 ? (
                                                    <ul className="space-y-2">
                                                        {evaluation.missingConcepts.map((concept, i) => (
                                                            <li key={i} className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-sm group hover:bg-red-500/10 transition-colors">
                                                                <div className="mt-0.5 h-5 w-5 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                                                    <span className="text-xs font-bold text-red-600 dark:text-red-400">{i + 1}</span>
                                                                </div>
                                                                <span className="text-foreground/80">{concept}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                                        <div className="p-3 rounded-full bg-green-500/10 mb-3">
                                                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                                                        </div>
                                                        <p className="text-sm font-medium text-green-600 dark:text-green-400">Excellent coverage!</p>
                                                        <p className="text-xs text-muted-foreground mt-1">No major concept gaps identified</p>
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
                                                    {evaluation.improvementSuggestions && evaluation.improvementSuggestions.length > 0 && (
                                                        <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                                            {evaluation.improvementSuggestions.length} tips
                                                        </span>
                                                    )}
                                                </h3>
                                            </div>
                                            <div className="p-4 max-h-62.5 overflow-y-auto">
                                                {evaluation.improvementSuggestions && evaluation.improvementSuggestions.length > 0 ? (
                                                    <ul className="space-y-2">
                                                        {evaluation.improvementSuggestions.map((suggestion, i) => (
                                                            <li key={i} className="flex items-start gap-3 p-3 bg-primary/5 border border-primary/10 rounded-lg text-sm group hover:bg-primary/10 transition-colors">
                                                                <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                                                    <span className="text-xs font-bold text-primary">{i + 1}</span>
                                                                </div>
                                                                <span className="text-foreground/80">{suggestion}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-8 text-center">
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

                                    {/* Your Answer - Collapsible Style */}
                                    <div className="border border-border/50 rounded-xl bg-card overflow-hidden">
                                        <div className="px-6 py-4 border-b border-border/30 flex items-center justify-between">
                                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                                <div className="p-1.5 rounded-lg bg-muted">
                                                    <Mic className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                                Your Response
                                            </h3>
                                            <span className="text-xs text-muted-foreground">
                                                {attempts[selectedAttemptIndex!]?.answer.rawText?.split(' ').length || 0} words
                                            </span>
                                        </div>
                                        <div className="p-6 bg-muted/10">
                                            <div className="relative">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-linear-to-b from-primary via-primary/50 to-transparent rounded-full" />
                                                <p className="text-sm text-foreground/80 leading-relaxed pl-4 font-mono">
                                                    {attempts[selectedAttemptIndex!]?.answer.rawText || attempts[selectedAttemptIndex!]?.answer.transcript}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <Button
                                            size="lg"
                                            className="flex-1 sm:flex-none"
                                            onClick={() => {
                                                setStep(1);
                                                setAudioBlob(null);
                                                setRecordingTime(0);
                                                setTranscript("");
                                                setEvaluation(null);
                                                setSelectedAttemptIndex(null);
                                            }}
                                        >
                                            <RotateCcw className="h-4 w-4 mr-2" />
                                            Try Another Take
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="lg"
                                            className="flex-1 sm:flex-none"
                                            onClick={() => navigate(-1)}
                                        >
                                            Back
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                <div className="border border-dashed border-border rounded-xl bg-linear-to-br from-card to-primary/5 flex flex-col items-center justify-center py-20">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
                                        <div className="relative p-4 bg-primary/10 rounded-xl mb-4">
                                            <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Analyzing Your Response</h3>
                                    <p className="text-sm text-muted-foreground text-center max-w-sm mb-6">
                                        Our AI is evaluating clarity, correctness, and depth. This usually takes 5-10 seconds.
                                    </p>
                                    <div className="flex gap-3">
                                        <Button
                                            onClick={() => {
                                                if (selectedAttemptIndex !== null && attempts[selectedAttemptIndex]) {
                                                    handleSubmitEvaluation();
                                                }
                                            }}
                                        >
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Refresh Results
                                        </Button>
                                        <Button variant="outline" onClick={() => navigate(-1)}>
                                            Back
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const AudioVisualizer = ({ analyser, isRecording }: { analyser: AnalyserNode | null, isRecording: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!isRecording || !analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let animationId: number;

        const draw = () => {
            animationId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const count = 32;
            const spacing = 6;
            const barWidth = (canvas.width / count) - spacing;

            // Loop through and draw bars symmetrically from center
            for (let i = 0; i < count; i++) {
                // Get value from frequency data (focus on lower/mid frequencies 0-60%)
                const freqIndex = Math.floor((i / count) * bufferLength * 0.6);
                const value = dataArray[freqIndex];

                // Calculate height based on volume (min 4px)
                const percent = value / 255;
                const height = Math.max(6, percent * canvas.height * 0.9);

                const x = i * (barWidth + spacing);
                const y = (canvas.height - height) / 2;

                // Professional Blue/Indigo Gradient
                ctx.fillStyle = ctx.createLinearGradient(0, y, 0, y + height);
                // Depending on theme, we could adjust color but primary blue is safe
                ctx.fillStyle = 'rgb(59, 130, 246)';

                // Draw rounded pill-shaped bars
                ctx.beginPath();
                if (ctx.roundRect) {
                    ctx.roundRect(x, y, barWidth, height, barWidth / 2);
                } else {
                    // Fallback for browsers that don't support roundRect
                    ctx.rect(x, y, barWidth, height);
                }
                ctx.fill();
            }
        };

        draw();
        return () => cancelAnimationFrame(animationId);
    }, [isRecording, analyser]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-12 opacity-90 transition-opacity duration-300"
            width={300}
            height={60}
        />
    );
};

const ScoreCard = ({ label, score, color }: { label: string, score: number, color: 'blue' | 'green' | 'purple', icon?: string }) => {
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
            "relative border rounded-xl p-5 text-center transition-all hover:scale-[1.02] cursor-default",
            colors[color].border,
            colors[color].bg
        )}>
            <div className={cn(
                "w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ring-4",
                "bg-background",
                colors[color].ring
            )}>
                <span className={cn("text-2xl font-bold", colors[color].text)}>{score}</span>
            </div>
            <p className={cn("text-sm font-semibold mb-1", colors[color].text)}>{label}</p>
            <p className="text-xs text-muted-foreground">{getScoreLevel(score)}</p>
        </div>
    );
};

const ScoreBar = ({ label, score, color }: { label: string, score: number, color: 'blue' | 'green' | 'purple' }) => {
    const colors = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500'
    };

    const bgColors = {
        blue: 'bg-blue-500/20',
        green: 'bg-green-500/20',
        purple: 'bg-purple-500/20'
    };

    return (
        <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
            <div className={cn("flex-1 h-2 rounded-full overflow-hidden", bgColors[color])}>
                <div
                    className={cn("h-full rounded-full transition-all duration-1000 ease-out", colors[color])}
                    style={{ width: `${score * 10}%` }}
                />
            </div>
            <span className="text-xs font-medium text-foreground w-8 text-right">{score}/10</span>
        </div>
    );
};
