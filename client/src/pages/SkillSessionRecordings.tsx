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

type MetricStatus = 'low' | 'good' | 'high' | 'unknown';

interface VoiceMetrics {
    loudnessDb: number;
    pitchHz: number;
    speechRateWpm: number;
    qualityScore: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getBandStatus = (value: number, min: number, max: number): MetricStatus => {
    if (!Number.isFinite(value)) return 'unknown';
    if (value < min) return 'low';
    if (value > max) return 'high';
    return 'good';
};

const getPitchStatus = (pitchHz: number): MetricStatus => {
    if (!pitchHz || !Number.isFinite(pitchHz)) return 'unknown';
    if (pitchHz < 110) return 'low';
    if (pitchHz > 230) return 'high';
    return 'good';
};

const estimatePitchFromBuffer = (buffer: Float32Array, sampleRate: number): number => {
    const size = buffer.length;
    let rms = 0;

    for (let i = 0; i < size; i++) {
        const sample = buffer[i];
        rms += sample * sample;
    }

    rms = Math.sqrt(rms / size);
    if (rms < 0.01) return 0;

    let r1 = 0;
    let r2 = size - 1;
    const threshold = 0.2;

    for (let i = 0; i < size / 2; i++) {
        if (Math.abs(buffer[i]) < threshold) {
            r1 = i;
            break;
        }
    }

    for (let i = 1; i < size / 2; i++) {
        if (Math.abs(buffer[size - i]) < threshold) {
            r2 = size - i;
            break;
        }
    }

    const trimmed = buffer.slice(r1, r2);
    const trimmedSize = trimmed.length;
    if (trimmedSize < 32) return 0;

    const correlations = new Array(trimmedSize).fill(0);
    for (let lag = 0; lag < trimmedSize; lag++) {
        let sum = 0;
        for (let i = 0; i < trimmedSize - lag; i++) {
            sum += trimmed[i] * trimmed[i + lag];
        }
        correlations[lag] = sum;
    }

    let start = 0;
    while (start < trimmedSize - 1 && correlations[start] > correlations[start + 1]) {
        start++;
    }

    let bestLag = -1;
    let bestValue = -Infinity;
    for (let i = start; i < trimmedSize; i++) {
        if (correlations[i] > bestValue) {
            bestValue = correlations[i];
            bestLag = i;
        }
    }

    if (bestLag <= 0) return 0;

    const left = correlations[bestLag - 1] ?? correlations[bestLag];
    const center = correlations[bestLag];
    const right = correlations[bestLag + 1] ?? correlations[bestLag];
    const denominator = 2 * center - left - right;
    const shift = denominator !== 0 ? (right - left) / (2 * denominator) : 0;
    const correctedLag = bestLag + shift;

    const hz = sampleRate / correctedLag;
    if (!Number.isFinite(hz) || hz < 60 || hz > 400) return 0;
    return hz;
};

const statusStyles: Record<MetricStatus, { text: string; chip: string; ring: string }> = {
    good: {
        text: 'text-emerald-400',
        chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
        ring: 'ring-emerald-500/35',
    },
    low: {
        text: 'text-amber-300',
        chip: 'bg-amber-500/15 text-amber-200 border-amber-500/40',
        ring: 'ring-amber-500/35',
    },
    high: {
        text: 'text-orange-300',
        chip: 'bg-orange-500/15 text-orange-200 border-orange-500/40',
        ring: 'ring-orange-500/35',
    },
    unknown: {
        text: 'text-zinc-400',
        chip: 'bg-zinc-700/25 text-zinc-300 border-zinc-600/60',
        ring: 'ring-zinc-600/35',
    },
};

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
    const [voiceMetrics, setVoiceMetrics] = useState<VoiceMetrics>({
        loudnessDb: -60,
        pitchHz: 0,
        speechRateWpm: 0,
        qualityScore: 0,
    });
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
    const transcriptRef = useRef<string>('');
    const recordingStartRef = useRef<number>(0);
    const loudnessHistoryRef = useRef<number[]>([]);
    const metricsUpdateRef = useRef<number>(0);

    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

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
            const frequencyData = new Uint8Array(bufferLength);
            const timeData = new Uint8Array(analyser.fftSize);
            const floatTimeData = new Float32Array(analyser.fftSize);

            silenceStartRef.current = null;
            totalPauseTimeRef.current = 0;
            pauseCountRef.current = 0;

            const drawWaveform = () => {
                if (!isRecordingRef.current || !canvasRef.current) return;

                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                analyser.getByteFrequencyData(frequencyData);
                analyser.getByteTimeDomainData(timeData);
                analyser.getFloatTimeDomainData(floatTimeData);

                const elapsedSeconds = Math.max(1, (Date.now() - recordingStartRef.current) / 1000);

                let sumSquares = 0;
                for (let i = 0; i < floatTimeData.length; i++) {
                    const sample = floatTimeData[i];
                    sumSquares += sample * sample;
                }

                const rms = Math.sqrt(sumSquares / floatTimeData.length);
                const loudnessDbRaw = 20 * Math.log10(rms + 1e-7);
                const loudnessDb = clamp(loudnessDbRaw, -60, 0);
                loudnessHistoryRef.current.push(loudnessDb);
                if (loudnessHistoryRef.current.length > 180) {
                    loudnessHistoryRef.current.shift();
                }

                const pitchHz = estimatePitchFromBuffer(floatTimeData, audioContext.sampleRate);
                const wordsSpoken = transcriptRef.current.trim().split(/\s+/).filter(Boolean).length;
                const speechRateWpm = wordsSpoken > 0 ? (wordsSpoken / elapsedSeconds) * 60 : 0;

                const loudnessStatus = getBandStatus(loudnessDb, -32, -16);
                const pitchStatus = getPitchStatus(pitchHz);
                const speedStatus = getBandStatus(speechRateWpm || NaN, 110, 160);

                const statusScore = (status: MetricStatus) => {
                    if (status === 'good') return 100;
                    if (status === 'unknown') return 55;
                    return 40;
                };
                const qualityScore = Math.round((statusScore(loudnessStatus) + statusScore(pitchStatus) + statusScore(speedStatus)) / 3);

                // Clear canvas
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#111827';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw horizontal guide bands for loudness zones
                const mapDbToY = (db: number) => {
                    const normalized = (clamp(db, -60, -5) + 60) / 55;
                    return canvas.height - normalized * (canvas.height - 14) - 7;
                };

                const quietY = mapDbToY(-32);
                const loudY = mapDbToY(-16);

                ctx.fillStyle = 'rgba(251, 191, 36, 0.08)';
                ctx.fillRect(0, quietY, canvas.width, canvas.height - quietY);
                ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
                ctx.fillRect(0, loudY, canvas.width, quietY - loudY);
                ctx.fillStyle = 'rgba(251, 146, 60, 0.08)';
                ctx.fillRect(0, 0, canvas.width, loudY);

                // Grid lines
                ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 4; i++) {
                    const y = (canvas.height / 4) * i;
                    ctx.beginPath();
                    ctx.moveTo(0, y + 0.5);
                    ctx.lineTo(canvas.width, y + 0.5);
                    ctx.stroke();
                }

                // Draw loudness time series line
                const history = loudnessHistoryRef.current;
                if (history.length > 1) {
                    ctx.beginPath();
                    history.forEach((db, index) => {
                        const x = (index / (history.length - 1)) * (canvas.width - 1);
                        const y = mapDbToY(db);
                        if (index === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    });

                    const lineGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
                    lineGradient.addColorStop(0, 'rgba(34, 197, 94, 0.9)');
                    lineGradient.addColorStop(1, 'rgba(56, 189, 248, 0.95)');
                    ctx.strokeStyle = lineGradient;
                    ctx.lineWidth = 2.5;
                    ctx.stroke();

                    const lastX = canvas.width - 1;
                    const lastY = mapDbToY(history[history.length - 1]);
                    ctx.beginPath();
                    ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
                    ctx.fillStyle = loudnessStatus === 'good' ? '#34d399' : loudnessStatus === 'low' ? '#fbbf24' : '#fb923c';
                    ctx.fill();
                }

                // Overlay labels
                ctx.fillStyle = 'rgba(226, 232, 240, 0.75)';
                ctx.font = '11px sans-serif';
                ctx.fillText('Loud', 8, mapDbToY(-12));
                ctx.fillText('Ideal', 8, mapDbToY(-24));
                ctx.fillText('Soft', 8, mapDbToY(-40));

                const now = Date.now();
                if (now - metricsUpdateRef.current > 180) {
                    metricsUpdateRef.current = now;
                    setVoiceMetrics(prev => ({
                        ...prev,
                        loudnessDb,
                        pitchHz: pitchHz > 0 ? pitchHz : prev.pitchHz,
                        speechRateWpm,
                        qualityScore,
                    }));
                }

                // Check for silence
                const average = frequencyData.reduce((a, b) => a + b, 0) / bufferLength;
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
            recordingStartRef.current = Date.now();
            metricsUpdateRef.current = 0;
            loudnessHistoryRef.current = [];
            setVoiceMetrics({
                loudnessDb: -60,
                pitchHz: 0,
                speechRateWpm: 0,
                qualityScore: 0,
            });
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

            // Keep the captured history visible until user retakes for better feedback review.
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmitEvaluation = async () => {
        if (!audioBlob || !sessionId) return;

        // Validate minimum word count
        const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 15) {
            toast.error('Your explanation is too short. Please record again with more details (at least 15 words).');
            return;
        }

        setLoading(true);
        let answerSubmitted = false;

        try {
            // Step 1: Submit the answer
            const answerRes = await api.post(`/sessions/${sessionId}/answer`, {
                rawText: transcript,
                voiceMetrics: {
                    duration: recordingTime,
                    pauseCount: pauseCount,
                    avgPauseDuration: parseFloat(avgPauseDuration.toFixed(1)),
                    fillerWordCount: fillerWordCount
                }
            });

            answerSubmitted = true;
            const answerId = answerRes.data.data.answer._id;

            // Step 2: Try to evaluate
            try {
                const res = await api.post(`/sessions/${sessionId}/evaluate`, { answerId });

                if (res.data.success === 1) {
                    // Check if evaluation is pending (LLM failed)
                    if (res.data.data?.evaluationPending) {
                        toast.warning('Evaluation pending. You can re-evaluate from the attempts page.');
                    } else {
                        toast.success('Evaluation complete!');
                    }
                }
            } catch (evalError) {
                console.error('Evaluation failed:', evalError);
                toast.warning('Evaluation failed. You can re-evaluate from the attempts page.');
            }

            // Always navigate to attempts page after answer is submitted
            dispatch(invalidateActivities());
            dispatch(invalidateOverview());
            navigate(`/dashboard/session/${sessionId}/attempts`);

        } catch (error: any) {
            console.error('Failed to submit answer:', error);
            if (answerSubmitted) {
                // Answer was submitted, navigate to attempts for re-evaluation
                dispatch(invalidateActivities());
                dispatch(invalidateOverview());
                navigate(`/dashboard/session/${sessionId}/attempts`);
            } else {
                toast.error('Failed to submit your recording. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex flex-col bg-black">
            <div className="flex-1 flex flex-col animate-in slide-in-from-bottom-8 duration-500">
                {/* Header */}
                <div className="py-4">
                    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
                        <Button
                            variant="ghost"
                            onClick={() => navigate(-1)}
                            className="group flex items-center gap-2 text-zinc-400 hover:text-white"
                        >
                            <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Back
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex-1 flex flex-col items-center justify-center pb-12">
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

                                {/* Live Loudness Time-Series */}
                                <div className="relative h-32 mb-4 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden">
                                    <canvas
                                        ref={canvasRef}
                                        width={600}
                                        height={128}
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

                                <p className="text-[11px] text-zinc-500 mb-8 text-center uppercase tracking-[0.22em]">
                                    Live loudness time series and voice coaching
                                </p>

                                {isRecording && (
                                    <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 md:p-5">
                                        {(() => {
                                            const loudnessStatus = getBandStatus(voiceMetrics.loudnessDb, -32, -16);
                                            const pitchStatus = getPitchStatus(voiceMetrics.pitchHz);
                                            const speedStatus = getBandStatus(voiceMetrics.speechRateWpm || NaN, 110, 160);

                                            const allGood = loudnessStatus === 'good' && pitchStatus === 'good' && speedStatus === 'good';
                                            const hasHardWarning = loudnessStatus === 'high' || speedStatus === 'high' || pitchStatus === 'high';

                                            const overallText = allGood
                                                ? 'Perfect voice zone: keep this level.'
                                                : hasHardWarning
                                                    ? 'Voice needs correction: follow the guidance below.'
                                                    : 'Good progress: tune one metric to reach perfect zone.';

                                            const overallColor = allGood
                                                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/35'
                                                : hasHardWarning
                                                    ? 'text-orange-200 bg-orange-500/10 border-orange-500/35'
                                                    : 'text-amber-200 bg-amber-500/10 border-amber-500/35';

                                            return (
                                                <>
                                                    <div className={cn('mb-4 rounded-xl border px-3 py-2 text-xs md:text-sm font-medium', overallColor)}>
                                                        {overallText}
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                        <div className={cn('rounded-xl border p-3 md:p-4 ring-1', statusStyles[loudnessStatus].ring, statusStyles[loudnessStatus].chip)}>
                                                            <div className="text-[11px] uppercase tracking-[0.18em] opacity-80">Loudness</div>
                                                            <div className="mt-1 text-2xl font-semibold tabular-nums">
                                                                {voiceMetrics.loudnessDb.toFixed(1)} dB
                                                            </div>
                                                            <div className="mt-1 text-xs opacity-85">Target: -32 dB to -16 dB</div>
                                                            <div className="mt-2 text-xs font-medium">
                                                                {loudnessStatus === 'good' && 'Great volume. Keep it steady.'}
                                                                {loudnessStatus === 'low' && 'Speak louder and move closer to mic.'}
                                                                {loudnessStatus === 'high' && 'Reduce force slightly to avoid clipping.'}
                                                                {loudnessStatus === 'unknown' && 'Start speaking to calibrate loudness.'}
                                                            </div>
                                                        </div>

                                                        <div className={cn('rounded-xl border p-3 md:p-4 ring-1', statusStyles[pitchStatus].ring, statusStyles[pitchStatus].chip)}>
                                                            <div className="text-[11px] uppercase tracking-[0.18em] opacity-80">Pitch</div>
                                                            <div className="mt-1 text-2xl font-semibold tabular-nums">
                                                                {voiceMetrics.pitchHz > 0 ? `${Math.round(voiceMetrics.pitchHz)} Hz` : '--'}
                                                            </div>
                                                            <div className="mt-1 text-xs opacity-85">Target: 110 Hz to 230 Hz</div>
                                                            <div className="mt-2 text-xs font-medium">
                                                                {pitchStatus === 'good' && 'Natural tone detected.'}
                                                                {pitchStatus === 'low' && 'Raise tone slightly for more clarity.'}
                                                                {pitchStatus === 'high' && 'Lower tone slightly; avoid strain.'}
                                                                {pitchStatus === 'unknown' && 'Pitch appears after continuous voice.'}
                                                            </div>
                                                        </div>

                                                        <div className={cn('rounded-xl border p-3 md:p-4 ring-1', statusStyles[speedStatus].ring, statusStyles[speedStatus].chip)}>
                                                            <div className="text-[11px] uppercase tracking-[0.18em] opacity-80">Speaking Speed</div>
                                                            <div className="mt-1 text-2xl font-semibold tabular-nums">
                                                                {voiceMetrics.speechRateWpm > 0 ? `${Math.round(voiceMetrics.speechRateWpm)} WPM` : '--'}
                                                            </div>
                                                            <div className="mt-1 text-xs opacity-85">Target: 110 to 160 WPM</div>
                                                            <div className="mt-2 text-xs font-medium">
                                                                {speedStatus === 'good' && 'Excellent pace for comprehension.'}
                                                                {speedStatus === 'low' && 'Increase pace slightly; avoid long gaps.'}
                                                                {speedStatus === 'high' && 'Slow down to improve clarity.'}
                                                                {speedStatus === 'unknown' && 'Speed appears when transcript is captured.'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mt-4 text-xs text-zinc-400">
                                                        Voice quality score: <span className={cn('font-semibold', voiceMetrics.qualityScore >= 85 ? 'text-emerald-300' : voiceMetrics.qualityScore >= 65 ? 'text-amber-300' : 'text-orange-300')}>{voiceMetrics.qualityScore}/100</span>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                )}

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
