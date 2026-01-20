import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Brain, Mic, StopCircle, RotateCcw, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export const SkillSessionRecordings: React.FC = () => {
    const { id: sessionId } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [session, setSession] = useState<any | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [transcript, setTranscript] = useState('');
    const [pauseCount, setPauseCount] = useState(0);
    const [avgPauseDuration, setAvgPauseDuration] = useState(0);
    const [fillerWordCount, setFillerWordCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const recognitionRef = useRef<any | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const silenceStartRef = useRef<number | null>(null);
    const totalPauseTimeRef = useRef<number>(0);
    const pauseCountRef = useRef<number>(0);
    const isRecordingRef = useRef<boolean>(false);
    const isCurrentlyPausedRef = useRef<boolean>(false);

    useEffect(() => {
        const fetchSession = async () => {
            if (!sessionId) return;
            try {
                const res = await api.get(`/sessions/${sessionId}/summary`);
                if (res.data.success === 1 && res.data.data?.summary) {
                    setSession(res.data.data.summary.session);
                }
            } catch (err) {
                console.error(err);
                toast.error('Failed to load session');
                navigate('/dashboard/skillcheck');
            }
        };

        fetchSession();
    }, [sessionId, navigate]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e: BlobEvent) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach(track => track.stop());
            };

            const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognitionConstructor) {
                const recognition = new SpeechRecognitionConstructor();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event: any) => {
                    let currentTranscript = '';
                    for (let i = 0; i < event.results.length; i++) {
                        currentTranscript += event.results[i][0].transcript;
                    }
                    setTranscript(currentTranscript);

                    const fillers = ['um', 'uh', 'like', 'so', 'actually', 'basically', 'right'];
                    const words = currentTranscript.toLowerCase().split(/\s+/);
                    const count = words.filter((word: string) => fillers.includes(word)).length;
                    setFillerWordCount(count);
                };

                recognition.start();
                recognitionRef.current = recognition;
            }

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
                const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
                if (average < 10) {
                    if (silenceStartRef.current === null) silenceStartRef.current = Date.now();
                    else {
                        const silenceDuration = Date.now() - silenceStartRef.current;
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
            timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
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
                rawText: transcript || (`Sample transcript of the recorded audio for ${session?.skillName}`),
                voiceMetrics: {
                    duration: recordingTime,
                    pauseCount: pauseCount,
                    avgPauseDuration: parseFloat(avgPauseDuration.toFixed(1)),
                    fillerWordCount: fillerWordCount
                }
            });

            const answerId = answerRes.data.data.answer._id;
            const res = await api.post(`/sessions/${sessionId}/evaluate`, { answerId });
            if (res.data.success === 1) {
                navigate(`/dashboard/session/${sessionId}/attempts`);
            }
        } catch (error) {
            console.error('Evaluation failed', error);
            toast.error('Evaluation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
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
                        <p className="text-muted-foreground max-w-md mx-auto">Go ahead! Explain the concepts, architecture, and use cases you know.</p>
                    </div>

                    <div className="relative flex flex-col items-center space-y-8 bg-primary/5 dark:bg-primary/10 w-full max-w-xl p-12 rounded-[2.5rem] border border-primary/10">
                        <div className="flex flex-col items-center gap-4 w-full">
                            <div className="text-5xl font-mono font-bold text-foreground">{formatTime(recordingTime)}</div>
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
                                            setTranscript('');
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
                                        {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Get Evaluation'}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkillSessionRecordings;
