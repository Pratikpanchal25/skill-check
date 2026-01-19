
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
    const [loading, setLoading] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
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
            await api.post(`/sessions/${sessionId}/answer`, {
                rawText: transcript || ("Sample transcript of the recorded audio for " + session?.skillId?.name),
                voiceMetrics: {
                    duration: recordingTime,
                    pauseCount: pauseCount,
                    avgPauseDuration: parseFloat(avgPauseDuration.toFixed(1)),
                    fillerWordCount: fillerWordCount
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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            {step === 1 && (
                <div className="flex flex-col items-center justify-center space-y-12 py-12 animate-in slide-in-from-bottom-8 duration-500">
                    <div className="text-center space-y-4">
                        <div className="inline-block p-3 bg-primary/20 rounded-2xl text-primary mb-2">
                            <Brain className="h-8 w-8" />
                        </div>
                        <h2 className="text-3xl font-bold text-foreground">Explaining {session?.skillId?.name}</h2>
                        <p className="text-muted-foreground max-w-md mx-auto">
                            Go ahead! Explain the concepts, architecture, and use cases you know.
                        </p>
                    </div>

                    {/* Recording Visualizer Block */}
                    <div className="relative flex flex-col items-center space-y-8 bg-primary/5 dark:bg-primary/10 w-full max-w-xl p-12 rounded-[2.5rem] border border-primary/10">
                        <div className="text-5xl font-mono font-bold text-foreground">
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
            )}

            {step === 2 && evaluation && (
                <div className="space-y-8 animate-in zoom-in-95 duration-500">
                    <Card className="border-primary/20 shadow-2xl overflow-hidden rounded-[2.5rem]">
                        <div className="bg-linear-to-b from-primary/10 to-transparent p-12 text-center space-y-6">
                            <div className="text-7xl mb-4">
                                {evaluation.reaction === 'impressed' ? '🤩' : evaluation.reaction === 'neutral' ? '😐' : evaluation.reaction === 'confused' ? '😕' : '🤨'}
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-3xl font-bold text-foreground">Interviewer Reaction</h2>
                                <p className="text-primary font-bold uppercase tracking-widest text-sm">
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
                            <div className="bg-muted/30 rounded-4xl p-8 border border-border">
                                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-foreground">
                                    <Sparkles className="h-5 w-5 text-yellow-500" />
                                    Concepts to Dive Deeper Into
                                </h3>
                                <div className="flex flex-wrap gap-3">
                                    {evaluation.missingConcepts.map((concept, i) => (
                                        <span key={i} className="px-5 py-2 bg-card rounded-xl text-foreground font-medium shadow-sm border border-border">
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
                                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-12 h-14" onClick={() => navigate('/dashboard/skillcheck')}>
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
        blue: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-900',
        green: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-900',
        purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-100 dark:border-purple-900'
    };

    return (
        <div className={cn("p-8 rounded-4xl border text-center space-y-2 shadow-sm", colors[color])}>
            <p className="text-4xl font-black">{score}/10</p>
            <p className="font-bold uppercase tracking-widest text-[10px] opacity-70">{label}</p>
        </div>
    );
};
