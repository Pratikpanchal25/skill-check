
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
                rawText: transcript || ("Sample transcript of the recorded audio for " + session?.skillName),
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
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
            {step === 1 && (
                <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
                    <Button
                        variant="ghost"
                        onClick={() => navigate('/dashboard')}
                        className="group flex items-center gap-2 text-muted-foreground hover:text-foreground -ml-4"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Back to Dashboard
                    </Button>
                    <div className="flex flex-col items-center justify-center space-y-12 py-12">
                        <div className="text-center space-y-4">
                            <div className="inline-block p-3 bg-primary/20 rounded-2xl text-primary mb-2">
                                <Brain className="h-8 w-8" />
                            </div>
                            <h2 className="text-3xl font-bold text-foreground">Explaining {session?.skillName}</h2>
                            <p className="text-muted-foreground max-w-md mx-auto">
                                Go ahead! Explain the concepts, architecture, and use cases you know.
                            </p>
                        </div>

                        {/* Recording Visualizer Block */}
                        <div className="relative flex flex-col items-center space-y-8 bg-primary/5 dark:bg-primary/10 w-full max-w-xl p-12 rounded-[2.5rem] border border-primary/10">
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
                                            className="h-16 px-8 rounded-2xl border-2"
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
                                            className="h-16 px-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                                            onClick={handleSubmitEvaluation}
                                            disabled={loading}
                                        >
                                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "Get Evaluation"}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {isRecording && (
                                <div className="absolute -bottom-4 bg-card px-4 py-1 rounded-full border border-border shadow-sm text-xs font-bold text-red-500 flex items-center gap-2 animate-bounce">
                                    <span className="h-2 w-2 rounded-full bg-red-500" /> Recording Live
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {step === 2 && (
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
                        {/* Attempts History Sidebar */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Trophy className="h-4 w-4" /> Attempts
                                </h3>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-primary hover:text-primary/10 hover:bg-primary/5 font-bold text-xs"
                                    onClick={() => {
                                        setStep(1);
                                        setAudioBlob(null);
                                        setRecordingTime(0);
                                        setTranscript("");
                                        setEvaluation(null);
                                        setSelectedAttemptIndex(null);
                                    }}
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
                                            <p className="text-[11px] text-foreground/70 line-clamp-2 leading-relaxed italic">
                                                "{attempt.answer.rawText || attempt.answer.transcript}"
                                            </p>
                                        </CardContent>
                                    </Card>
                                )) : (
                                    <p className="text-sm text-muted-foreground italic text-center py-8">No attempts recorded</p>
                                )}
                            </div>
                        </div>

                        {/* Content Area */}
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
                                            {/* Scoreboard */}
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <ScoreCard label="Clarity" score={evaluation.clarity} color="blue" />
                                                <ScoreCard label="Correctness" score={evaluation.correctness} color="green" />
                                                <ScoreCard label="Depth" score={evaluation.depth} color="purple" />
                                            </div>

                                            {/* Detailed Feedback & Analysis */}
                                            <div className="space-y-6">
                                                {/* Summary Feedback */}
                                                {evaluation.feedback && (
                                                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 relative overflow-hidden group">
                                                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                                            <MessageSquare className="h-24 w-24 text-primary" />
                                                        </div>
                                                        <div className="relative">
                                                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60 mb-3 flex items-center gap-2">
                                                                <MessageSquare className="h-3 w-3" /> Interviewer Feedback
                                                            </h3>
                                                            <p className="text-base text-foreground/90 leading-relaxed font-medium italic">
                                                                "{evaluation.feedback}"
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    {/* Missing Concepts / Gaps */}
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

                                                    {/* Improvement Suggestions */}
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

                                                {/* What you said */}
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
                                                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-12 h-12 text-sm font-bold shadow-lg shadow-primary/10" onClick={() => {
                                                    setStep(1);
                                                    setAudioBlob(null);
                                                    setRecordingTime(0);
                                                    setTranscript("");
                                                    setEvaluation(null);
                                                    setSelectedAttemptIndex(null);
                                                }}>
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
                                        <p className="text-muted-foreground max-w-sm mx-auto text-lg leading-relaxed">
                                            We're still analyzing your technical accuracy and clarity. This usually takes 5-10 seconds.
                                        </p>
                                    </div>
                                    <div className="flex gap-4">
                                        <Button
                                            className="rounded-2xl px-10 h-14 font-black shadow-lg shadow-primary/20"
                                            onClick={() => {
                                                if (selectedAttemptIndex !== null && attempts[selectedAttemptIndex]) {
                                                    handleSubmitEvaluation();
                                                }
                                            }}
                                        >
                                            Refresh Results
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="rounded-2xl px-10 h-14 font-bold border-2"
                                            onClick={() => navigate('/dashboard')}
                                        >
                                            Go Help Others
                                        </Button>
                                    </div>
                                </Card>
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

const ScoreCard = ({ label, score, color }: { label: string, score: number, color: 'blue' | 'green' | 'purple' }) => {
    const colors = {
        blue: 'text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/50',
        green: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-50/50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/50'
    };

    return (
        <div className={cn("p-6 rounded-2xl border text-center space-y-1", colors[color])}>
            <p className="text-3xl font-bold tracking-tight">{score}/10</p>
            <p className="font-bold uppercase tracking-widest text-[9px] opacity-60 italic">{label}</p>
        </div>
    );
};
