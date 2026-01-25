import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '@/store';
import { invalidateActivities, invalidateOverview } from '@/store/slices/dataSlice';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Brain, Mic, StopCircle, RotateCcw, Loader2, ArrowLeft, Volume2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export const SkillSessionRecordings: React.FC = () => {
    const { id: sessionId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();

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
    const timerRef = useRef<any>(null);
    const recognitionRef = useRef<any | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const silenceStartRef = useRef<number | null>(null);
    const totalPauseTimeRef = useRef<number>(0);
    const pauseCountRef = useRef<number>(0);
    const isRecordingRef = useRef<boolean>(false);
    const isCurrentlyPausedRef = useRef<boolean>(false);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const waveDataRef = useRef<number[]>(new Array(64).fill(0));

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

            const drawWaveform = () => {
                if (!isRecordingRef.current || !canvasRef.current) return;

                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                analyser.getByteFrequencyData(dataArray);

                // Update wave data with smoothing
                const barCount = 64;
                for (let i = 0; i < barCount; i++) {
                    const dataIndex = Math.floor(i * bufferLength / barCount);
                    const value = dataArray[dataIndex] / 255;
                    waveDataRef.current[i] = waveDataRef.current[i] * 0.8 + value * 0.2;
                }

                // Clear canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                const centerY = canvas.height / 2;
                const barWidth = canvas.width / barCount;
                const maxBarHeight = canvas.height * 0.4;

                // Draw mirrored waveform bars
                for (let i = 0; i < barCount; i++) {
                    const barHeight = waveDataRef.current[i] * maxBarHeight + 3;
                    const x = i * barWidth;
                    const barW = barWidth - 2;

                    // Create gradient for each bar
                    const gradient = ctx.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
                    gradient.addColorStop(0, 'rgba(34, 197, 94, 0.6)');
                    gradient.addColorStop(0.5, 'rgba(34, 197, 94, 1)');
                    gradient.addColorStop(1, 'rgba(34, 197, 94, 0.6)');

                    ctx.fillStyle = gradient;

                    // Draw rounded rectangle manually for compatibility
                    const radius = 2;
                    const y = centerY - barHeight;
                    const h = barHeight * 2;
                    ctx.beginPath();
                    ctx.moveTo(x + 1 + radius, y);
                    ctx.lineTo(x + 1 + barW - radius, y);
                    ctx.quadraticCurveTo(x + 1 + barW, y, x + 1 + barW, y + radius);
                    ctx.lineTo(x + 1 + barW, y + h - radius);
                    ctx.quadraticCurveTo(x + 1 + barW, y + h, x + 1 + barW - radius, y + h);
                    ctx.lineTo(x + 1 + radius, y + h);
                    ctx.quadraticCurveTo(x + 1, y + h, x + 1, y + h - radius);
                    ctx.lineTo(x + 1, y + radius);
                    ctx.quadraticCurveTo(x + 1, y, x + 1 + radius, y);
                    ctx.closePath();
                    ctx.fill();
                }

                // Check for silence
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

                animationFrameRef.current = requestAnimationFrame(drawWaveform);
            };

            isRecordingRef.current = true;
            isCurrentlyPausedRef.current = false;
            drawWaveform();

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
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);

            // Reset wave data
            waveDataRef.current = new Array(64).fill(0);
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
            if (res.data.success === 1) {
                // Invalidate cache so dashboard shows updated data
                dispatch(invalidateActivities());
                dispatch(invalidateOverview());
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
        <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-black">
            <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-8 duration-500">
                {/* Header */}
                <div className="px-6 py-4">
                    <Button
                        variant="ghost"
                        onClick={() => navigate(-1)}
                        className="group flex items-center gap-2 text-zinc-400 hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Back
                    </Button>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
                    <div className="text-center space-y-3 mb-10">
                        <div className="inline-flex items-center justify-center p-4 bg-zinc-900 rounded-2xl text-green-500 mb-2 border border-zinc-800">
                            <Brain className="h-8 w-8" />
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold text-white">
                            Explaining {session?.skillName}
                        </h2>
                        <p className="text-zinc-500 max-w-md mx-auto text-sm">
                            Go ahead! Explain the concepts, architecture, and use cases you know.
                        </p>
                    </div>

                    {/* Recording Card */}
                    <div className="w-full max-w-2xl">
                        <div className="relative bg-zinc-950 rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
                            {/* Glow effect when recording */}
                            {isRecording && (
                                <div className="absolute inset-0 bg-green-500/5" />
                            )}

                            <div className="relative p-8 md:p-12">
                                {/* Timer */}
                                <div className="text-center mb-8">
                                    <div className={cn(
                                        "text-7xl md:text-8xl font-mono font-bold tracking-tight transition-colors",
                                        isRecording ? "text-white" : "text-zinc-600"
                                    )}>
                                        {formatTime(recordingTime)}
                                    </div>
                                </div>

                                {/* Waveform Visualizer */}
                                <div className="relative h-24 mb-8 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                                    <canvas
                                        ref={canvasRef}
                                        width={600}
                                        height={96}
                                        className="w-full h-full"
                                    />
                                    {!isRecording && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                                            {audioBlob ? (
                                                <div className="flex items-center gap-3 text-green-500">
                                                    <Volume2 className="h-5 w-5" />
                                                    <span className="text-sm font-medium">Recording complete</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-center gap-0.75">
                                                    {[...Array(48)].map((_, i) => (
                                                        <div
                                                            key={i}
                                                            className="w-1 bg-zinc-700 rounded-full"
                                                            style={{ height: `${4 + Math.sin(i * 0.3) * 8 + 8}px` }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Live Stats */}
                                {isRecording && (
                                    <div className="grid grid-cols-3 gap-3 mb-8">
                                        <div className="bg-zinc-900 rounded-lg p-4 text-center border border-zinc-800">
                                            <div className="text-3xl font-bold text-white font-mono">{pauseCount}</div>
                                            <div className="text-xs text-zinc-500 mt-1">Pauses</div>
                                        </div>
                                        <div className="bg-zinc-900 rounded-lg p-4 text-center border border-zinc-800">
                                            <div className="text-3xl font-bold text-white font-mono">{avgPauseDuration.toFixed(1)}s</div>
                                            <div className="text-xs text-zinc-500 mt-1">Avg Pause</div>
                                        </div>
                                        <div className="bg-zinc-900 rounded-lg p-4 text-center border border-zinc-800">
                                            <div className={cn(
                                                "text-3xl font-bold font-mono",
                                                fillerWordCount > 5 ? "text-orange-500" : "text-white"
                                            )}>
                                                {fillerWordCount}
                                            </div>
                                            <div className="text-xs text-zinc-500 mt-1">Filler Words</div>
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex justify-center">
                                    {!audioBlob ? (
                                        <button
                                            onClick={isRecording ? stopRecording : startRecording}
                                            className={cn(
                                                "relative group cursor-pointer",
                                                "h-20 w-20 rounded-full transition-all duration-300",
                                                "flex items-center justify-center",
                                                isRecording
                                                    ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20"
                                                    : "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20"
                                            )}
                                        >
                                            {/* Pulse rings when recording */}
                                            {isRecording && (
                                                <>
                                                    <span className="absolute inset-0 rounded-full bg-red-600 animate-ping opacity-20" />
                                                    <span className="absolute -inset-2 rounded-full border-2 border-red-600/30 animate-pulse" />
                                                </>
                                            )}
                                            {isRecording ? (
                                                <StopCircle className="h-9 w-9 text-white fill-white" />
                                            ) : (
                                                <Mic className="h-9 w-9 text-white" />
                                            )}
                                        </button>
                                    ) : (
                                        <div className="flex gap-4">
                                            <Button
                                                variant="outline"
                                                size="lg"
                                                className="h-14 px-6 rounded-xl border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white cursor-pointer"
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
                                                className="h-14 px-8 rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-lg cursor-pointer"
                                                onClick={handleSubmitEvaluation}
                                                disabled={loading}
                                            >
                                                {loading ? (
                                                    <Loader2 className="animate-spin h-5 w-5" />
                                                ) : (
                                                    'Get Evaluation'
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Recording hint */}
                                {!isRecording && !audioBlob && (
                                    <p className="text-center text-zinc-600 text-sm mt-6">
                                        Click the microphone to start recording
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Tips Card */}
                        {!isRecording && !audioBlob && (
                            <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-zinc-500 shrink-0 mt-0.5" />
                                <div className="text-sm text-zinc-400">
                                    <span className="font-medium text-zinc-300">Tips:</span> Speak clearly, avoid filler words like "um" or "uh", and try to maintain a steady pace. Your voice delivery will also be evaluated!
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkillSessionRecordings;
