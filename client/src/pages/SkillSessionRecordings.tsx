import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowLeft,
    AudioLines,
    Brain,
    CheckCircle2,
    CircleDashed,
    Gauge,
    Loader2,
    MessageSquareText,
    Mic,
    Radar,
    RotateCcw,
    Sparkles,
    StopCircle,
    Volume2,
    Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { AppDispatch } from '@/store';
import { invalidateActivities, invalidateOverview } from '@/store/slices/dataSlice';

type MetricStatus = 'low' | 'good' | 'high' | 'unknown';

interface VoiceMetrics {
    loudnessDb: number;
    pitchHz: number;
    speechRateWpm: number;
    qualityScore: number;
}

interface CoverageConcept {
    label: string;
    aliases: string[];
    prompt: string;
    hint: string;
}

interface TimelineSegment {
    label: string;
    preview: string;
    progress: number;
}

const fillerWords = ['um', 'uh', 'like', 'so', 'actually', 'basically', 'right'];
const panelClass = 'rounded-[28px] border border-white/6 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_42%),linear-gradient(180deg,rgba(11,15,25,0.54),rgba(6,9,18,0.34))] shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl';
const mutedPanelClass = 'rounded-[24px] border border-white/5 bg-[linear-gradient(180deg,rgba(15,20,32,0.40),rgba(10,14,23,0.24))] backdrop-blur-lg';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const normalizeText = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9+#.\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const containsAlias = (normalizedValue: string, alias: string) => {
    const normalizedAlias = normalizeText(alias);
    if (!normalizedAlias) return false;
    const pattern = normalizedAlias.split(' ').map(escapeRegExp).join('\\s+');
    return new RegExp(`(?:^|\\s)${pattern}(?=\\s|$)`, 'i').test(normalizedValue);
};

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

const getStatusTone = (status: MetricStatus) => {
    if (status === 'good') return 'emerald';
    if (status === 'unknown') return 'zinc';
    if (status === 'low') return 'amber';
    return 'orange';
};

const statusStyles: Record<MetricStatus, { text: string; chip: string; ring: string }> = {
    good: {
        text: 'text-emerald-300',
        chip: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-200',
        ring: 'ring-emerald-500/30',
    },
    low: {
        text: 'text-amber-200',
        chip: 'border-amber-500/35 bg-amber-500/10 text-amber-100',
        ring: 'ring-amber-500/30',
    },
    high: {
        text: 'text-orange-200',
        chip: 'border-orange-500/35 bg-orange-500/10 text-orange-100',
        ring: 'ring-orange-500/30',
    },
    unknown: {
        text: 'text-zinc-300',
        chip: 'border-zinc-700/70 bg-zinc-800/40 text-zinc-300',
        ring: 'ring-zinc-700/30',
    },
};

const skillBlueprints: Array<{ pattern: RegExp; concepts: CoverageConcept[] }> = [
    {
        pattern: /tailwind|utility css|css/i,
        concepts: [
            { label: 'Utility CSS', aliases: ['utility classes', 'utility css', 'class utilities'], prompt: 'how utility-first styling improves speed and consistency', hint: 'Explain why teams use utilities instead of long custom stylesheets.' },
            { label: 'Responsive Design', aliases: ['responsive', 'breakpoints', 'mobile first'], prompt: 'responsive breakpoints and mobile-first design', hint: 'Mention responsive variants and how layouts adapt across screen sizes.' },
            { label: 'Theme Tokens', aliases: ['design tokens', 'theme variables', 'color tokens'], prompt: 'how theme tokens or variables keep the UI consistent', hint: 'Connect color, spacing, and typography to shared tokens.' },
            { label: 'Tailwind Config', aliases: ['tailwind config', 'tailwind.config', 'config extensions'], prompt: 'when to extend Tailwind configuration', hint: 'Talk about custom themes, plugins, or extending scale values.' },
            { label: 'Composition', aliases: ['composition', 'component variants', 'class merging'], prompt: 'how reusable variants and class composition work', hint: 'Cover utility composition, reusable components, or variant systems.' },
            { label: 'Performance', aliases: ['purge', 'tree shaking', 'performance'], prompt: 'build-time optimization and generated CSS size', hint: 'Touch on unused CSS removal and production output.' },
        ],
    },
    {
        pattern: /react|next/i,
        concepts: [
            { label: 'Component Model', aliases: ['components', 'jsx', 'composition'], prompt: 'how React composes UI through components', hint: 'Explain how state and props shape component boundaries.' },
            { label: 'State Flow', aliases: ['state', 'props', 'data flow'], prompt: 'state updates and one-way data flow', hint: 'Mention local state, prop drilling, or centralized state.' },
            { label: 'Rendering', aliases: ['rendering', 're render', 'virtual dom'], prompt: 'how rendering works and what triggers updates', hint: 'Cover reconciliation, rendering costs, or React updates.' },
            { label: 'Hooks', aliases: ['hooks', 'useeffect', 'usestate', 'custom hooks'], prompt: 'where hooks fit into component logic', hint: 'Touch on side effects, state, and extracted behavior.' },
            { label: 'Performance', aliases: ['performance', 'memoization', 'lazy loading'], prompt: 'optimizing React rendering and bundle size', hint: 'Mention splitting code or avoiding unnecessary work.' },
            { label: 'Testing', aliases: ['testing', 'component tests', 'integration tests'], prompt: 'how to validate behavior in React apps', hint: 'Include what should be tested and how.' },
        ],
    },
    {
        pattern: /typescript/i,
        concepts: [
            { label: 'Type Safety', aliases: ['type safety', 'static typing', 'types'], prompt: 'how TypeScript prevents runtime issues', hint: 'Explain compile-time validation and clearer contracts.' },
            { label: 'Interfaces', aliases: ['interfaces', 'types', 'type aliases'], prompt: 'using interfaces and aliases to model data', hint: 'Mention reusable contracts and domain models.' },
            { label: 'Generics', aliases: ['generics', 'generic types'], prompt: 'where generics add flexibility without losing safety', hint: 'Explain reusable typed functions or collections.' },
            { label: 'Narrowing', aliases: ['type guards', 'narrowing', 'union types'], prompt: 'how TypeScript narrows union types safely', hint: 'Talk about runtime checks and discriminated unions.' },
            { label: 'Tooling', aliases: ['tsconfig', 'compiler', 'linting'], prompt: 'how TypeScript config and tooling affect projects', hint: 'Connect compiler settings to DX and runtime safety.' },
            { label: 'Interop', aliases: ['javascript interop', 'migration', 'declaration files'], prompt: 'adopting TypeScript in existing JavaScript codebases', hint: 'Cover gradual adoption and external typings.' },
        ],
    },
    {
        pattern: /node|express|api|backend/i,
        concepts: [
            { label: 'Request Lifecycle', aliases: ['request lifecycle', 'middleware', 'request pipeline'], prompt: 'how requests flow through a backend service', hint: 'Walk through middleware, controllers, and handlers.' },
            { label: 'Routing', aliases: ['routing', 'endpoints', 'rest api'], prompt: 'how routes are structured and exposed', hint: 'Discuss endpoint design and separation of responsibilities.' },
            { label: 'Async I/O', aliases: ['async io', 'event loop', 'non blocking'], prompt: 'why Node is good for I/O heavy systems', hint: 'Tie event loop behavior to concurrency.' },
            { label: 'Validation', aliases: ['validation', 'schema validation', 'input validation'], prompt: 'protecting APIs with validation and guards', hint: 'Explain input schemas and request validation.' },
            { label: 'Persistence', aliases: ['database', 'mongoose', 'queries'], prompt: 'how the backend reads and writes persistent data', hint: 'Touch on models, queries, and efficient access.' },
            { label: 'Observability', aliases: ['logging', 'monitoring', 'metrics'], prompt: 'what you watch in production backends', hint: 'Mention logs, metrics, and failure diagnosis.' },
        ],
    },
    {
        pattern: /mongo|database|sql|postgres/i,
        concepts: [
            { label: 'Data Modeling', aliases: ['data modeling', 'schema design', 'documents'], prompt: 'how to model entities and relationships', hint: 'Explain tradeoffs in schema design.' },
            { label: 'Indexes', aliases: ['indexes', 'indexing'], prompt: 'how indexes improve query performance', hint: 'Mention read speed and write tradeoffs.' },
            { label: 'Queries', aliases: ['queries', 'aggregation', 'joins'], prompt: 'how data is fetched efficiently', hint: 'Cover query patterns and heavy operations.' },
            { label: 'Consistency', aliases: ['transactions', 'consistency', 'atomic'], prompt: 'how data integrity is protected', hint: 'Describe when stronger consistency is necessary.' },
            { label: 'Scaling', aliases: ['replication', 'sharding', 'scaling'], prompt: 'how the database scales with load', hint: 'Mention read replicas, shards, or horizontal scale.' },
            { label: 'Backups', aliases: ['backups', 'recovery', 'restore'], prompt: 'how recovery and disaster planning work', hint: 'Touch on backups and operational safety.' },
        ],
    },
];

const genericConcepts: CoverageConcept[] = [
    { label: 'Fundamentals', aliases: ['fundamentals', 'basics', 'core concept'], prompt: 'the core purpose and fundamentals of the skill', hint: 'Start with what the technology is solving.' },
    { label: 'Architecture', aliases: ['architecture', 'structure', 'workflow'], prompt: 'how the overall architecture works', hint: 'Describe the moving parts and how they interact.' },
    { label: 'Tradeoffs', aliases: ['tradeoffs', 'pros and cons', 'limitations'], prompt: 'where the skill is strong and where it is weaker', hint: 'Good explanations include limitations, not just benefits.' },
    { label: 'Performance', aliases: ['performance', 'optimization', 'scaling'], prompt: 'what affects performance and scalability', hint: 'Call out bottlenecks and optimization levers.' },
    { label: 'Real Use Cases', aliases: ['use cases', 'real world', 'examples'], prompt: 'specific scenarios where the skill is valuable', hint: 'Ground the explanation in production scenarios.' },
    { label: 'Debugging', aliases: ['debugging', 'troubleshooting', 'testing'], prompt: 'how problems are diagnosed and tested', hint: 'Mention what breaks and how you inspect it.' },
];

const estimatePitchFromBuffer = (buffer: Float32Array, sampleRate: number): number => {
    const size = buffer.length;
    let rms = 0;

    for (let index = 0; index < size; index++) {
        const sample = buffer[index];
        rms += sample * sample;
    }

    rms = Math.sqrt(rms / size);
    if (rms < 0.01) return 0;

    let startTrim = 0;
    let endTrim = size - 1;
    const threshold = 0.2;

    for (let index = 0; index < size / 2; index++) {
        if (Math.abs(buffer[index]) < threshold) {
            startTrim = index;
            break;
        }
    }

    for (let index = 1; index < size / 2; index++) {
        if (Math.abs(buffer[size - index]) < threshold) {
            endTrim = size - index;
            break;
        }
    }

    const trimmed = buffer.slice(startTrim, endTrim);
    const trimmedSize = trimmed.length;
    if (trimmedSize < 32) return 0;

    const correlations = new Array(trimmedSize).fill(0);
    for (let lag = 0; lag < trimmedSize; lag++) {
        let total = 0;
        for (let index = 0; index < trimmedSize - lag; index++) {
            total += trimmed[index] * trimmed[index + lag];
        }
        correlations[lag] = total;
    }

    let firstDip = 0;
    while (firstDip < trimmedSize - 1 && correlations[firstDip] > correlations[firstDip + 1]) {
        firstDip++;
    }

    let bestLag = -1;
    let bestValue = Number.NEGATIVE_INFINITY;
    for (let index = firstDip; index < trimmedSize; index++) {
        if (correlations[index] > bestValue) {
            bestValue = correlations[index];
            bestLag = index;
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

const buildConceptBlueprint = (skillName: string, historicalMissingConcepts: string[]) => {
    const blueprint = skillBlueprints.find((entry) => entry.pattern.test(skillName))?.concepts ?? genericConcepts;
    const merged = [...blueprint];

    historicalMissingConcepts
        .filter(Boolean)
        .slice(0, 3)
        .forEach((concept) => {
            merged.push({
                label: concept,
                aliases: [concept],
                prompt: `the missing concept around ${concept}`,
                hint: `Mention ${concept} explicitly if it is relevant to ${skillName}.`,
            });
        });

    const seen = new Set<string>();
    return merged.filter((concept) => {
        const key = normalizeText(concept.label);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 7);
};

const createTranscriptChunks = (value: string) => {
    const punctuated = value.split(/(?<=[.!?])\s+/).map((part) => part.trim()).filter(Boolean);
    if (punctuated.length > 0) return punctuated.slice(0, 5);

    const words = value.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const chunks: string[] = [];
    for (let index = 0; index < words.length; index += 14) {
        chunks.push(words.slice(index, index + 14).join(' '));
    }
    return chunks.slice(0, 5);
};

const buildTimelineSegments = (transcript: string, coverage: Array<CoverageConcept & { detected: boolean }>): TimelineSegment[] => {
    const chunks = createTranscriptChunks(transcript);
    if (chunks.length === 0) {
        return coverage.slice(0, 4).map((concept, index) => ({
            label: concept.label,
            preview: concept.prompt,
            progress: ((index + 1) / Math.max(4, coverage.length)) * 100,
        }));
    }

    return chunks.map((chunk, index) => {
        const normalizedChunk = normalizeText(chunk);
        const matchedConcept = coverage.find((concept) => concept.aliases.some((alias) => containsAlias(normalizedChunk, alias)));
        return {
            label: matchedConcept?.label ?? (index === 0 ? 'Opening' : index === chunks.length - 1 ? 'Wrap-up' : 'Deep Dive'),
            preview: chunk,
            progress: ((index + 1) / chunks.length) * 100,
        };
    });
};

const renderHighlightedTranscript = (value: string, keywords: string[]) => {
    if (!value.trim()) return null;

    const uniqueWords = Array.from(new Set(keywords.map((keyword) => keyword.trim()).filter((keyword) => keyword.length > 2)));
    if (uniqueWords.length === 0) {
        return <span>{value}</span>;
    }

    const pattern = new RegExp(`(\\b(?:${uniqueWords.sort((left, right) => right.length - left.length).map(escapeRegExp).join('|')})\\b)`, 'ig');
    const parts = value.split(pattern);

    return parts.map((part, index) => {
        const matched = uniqueWords.some((keyword) => keyword.toLowerCase() === part.toLowerCase());
        if (!matched) {
            return <span key={`${part}-${index}`}>{part}</span>;
        }

        return (
            <span
                key={`${part}-${index}`}
                className="rounded-md border border-cyan-400/35 bg-cyan-400/10 px-1.5 py-0.5 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
            >
                {part}
            </span>
        );
    });
};

export const SkillSessionRecordings: React.FC = () => {
    const { id: sessionId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const dispatch = useDispatch<AppDispatch>();

    const [session, setSession] = useState<any | null>(null);
    const [historicalMissingConcepts, setHistoricalMissingConcepts] = useState<string[]>([]);
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
    const timerRef = useRef<number | null>(null);
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
                const response = await api.get(`/sessions/${sessionId}/summary`);
                if (response.data.success === 1 && response.data.data?.summary) {
                    const summary = response.data.data.summary;
                    setSession(summary.session);

                    const missingFromAttempts = (summary.attempts ?? [])
                        .flatMap((attempt: any) => attempt.evaluation?.missingConcepts ?? [])
                        .filter((concept: unknown): concept is string => typeof concept === 'string' && concept.trim().length > 0);
                    setHistoricalMissingConcepts(Array.from(new Set<string>(missingFromAttempts)).slice(0, 4));
                }
            } catch (error) {
                console.error(error);
                toast.error('Failed to load session');
                navigate('/dashboard/skillcraft');
            }
        };

        fetchSession();
    }, [navigate, sessionId]);

    useEffect(() => {
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
            if (recognitionRef.current) recognitionRef.current.stop();
            if (audioContextRef.current) audioContextRef.current.close();
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            setTranscript('');
            setPauseCount(0);
            setAvgPauseDuration(0);
            setFillerWordCount(0);
            setAudioBlob(null);

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event: BlobEvent) => {
                if (event.data.size > 0) chunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                stream.getTracks().forEach((track) => track.stop());
            };

            const SpeechRecognitionConstructor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognitionConstructor) {
                const recognition = new SpeechRecognitionConstructor();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                recognition.onresult = (event: any) => {
                    let currentTranscript = '';
                    for (let index = 0; index < event.results.length; index++) {
                        currentTranscript += event.results[index][0].transcript;
                    }

                    setTranscript(currentTranscript.trim());

                    const words = currentTranscript.toLowerCase().split(/\s+/).filter(Boolean);
                    const count = words.filter((word: string) => fillerWords.includes(word)).length;
                    setFillerWordCount(count);
                };

                recognition.onend = () => {
                    if (isRecordingRef.current) {
                        recognition.start();
                    }
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
            const floatTimeData = new Float32Array(analyser.fftSize);

            silenceStartRef.current = null;
            totalPauseTimeRef.current = 0;
            pauseCountRef.current = 0;

            const drawWaveform = () => {
                if (!isRecordingRef.current || !canvasRef.current) return;

                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (!context) return;

                analyser.getByteFrequencyData(frequencyData);
                analyser.getFloatTimeDomainData(floatTimeData);

                const elapsedSeconds = Math.max(1, (Date.now() - recordingStartRef.current) / 1000);

                let sumSquares = 0;
                for (let index = 0; index < floatTimeData.length; index++) {
                    const sample = floatTimeData[index];
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
                const speedStatus = getBandStatus(speechRateWpm || Number.NaN, 110, 160);

                const statusScore = (status: MetricStatus) => {
                    if (status === 'good') return 100;
                    if (status === 'unknown') return 55;
                    return 40;
                };

                const qualityScore = Math.round((statusScore(loudnessStatus) + statusScore(pitchStatus) + statusScore(speedStatus)) / 3);

                context.clearRect(0, 0, canvas.width, canvas.height);
                context.fillStyle = '#09101d';
                context.fillRect(0, 0, canvas.width, canvas.height);

                const mapDbToY = (db: number) => {
                    const normalized = (clamp(db, -60, -5) + 60) / 55;
                    return canvas.height - normalized * (canvas.height - 14) - 7;
                };

                const quietY = mapDbToY(-32);
                const loudY = mapDbToY(-16);

                context.fillStyle = 'rgba(251,191,36,0.06)';
                context.fillRect(0, quietY, canvas.width, canvas.height - quietY);
                context.fillStyle = 'rgba(16,185,129,0.11)';
                context.fillRect(0, loudY, canvas.width, quietY - loudY);
                context.fillStyle = 'rgba(56,189,248,0.08)';
                context.fillRect(0, 0, canvas.width, loudY);

                context.strokeStyle = 'rgba(148,163,184,0.14)';
                context.lineWidth = 1;
                for (let index = 0; index < 4; index++) {
                    const y = (canvas.height / 4) * index;
                    context.beginPath();
                    context.moveTo(0, y + 0.5);
                    context.lineTo(canvas.width, y + 0.5);
                    context.stroke();
                }

                const history = loudnessHistoryRef.current;
                if (history.length > 1) {
                    context.beginPath();
                    history.forEach((db, index) => {
                        const x = (index / (history.length - 1)) * (canvas.width - 1);
                        const y = mapDbToY(db);
                        if (index === 0) context.moveTo(x, y);
                        else context.lineTo(x, y);
                    });

                    const gradient = context.createLinearGradient(0, 0, canvas.width, 0);
                    gradient.addColorStop(0, 'rgba(52,211,153,0.95)');
                    gradient.addColorStop(0.6, 'rgba(34,211,238,0.92)');
                    gradient.addColorStop(1, 'rgba(139,92,246,0.95)');
                    context.strokeStyle = gradient;
                    context.lineWidth = 2.5;
                    context.stroke();

                    context.beginPath();
                    context.arc(canvas.width - 1, mapDbToY(history[history.length - 1]), 4, 0, Math.PI * 2);
                    context.fillStyle = loudnessStatus === 'good' ? '#34d399' : loudnessStatus === 'low' ? '#fbbf24' : '#fb923c';
                    context.fill();
                }

                context.fillStyle = 'rgba(226,232,240,0.72)';
                context.font = '11px sans-serif';
                context.fillText('Loud', 8, mapDbToY(-12));
                context.fillText('Ideal', 8, mapDbToY(-24));
                context.fillText('Soft', 8, mapDbToY(-40));

                const now = Date.now();
                if (now - metricsUpdateRef.current > 180) {
                    metricsUpdateRef.current = now;
                    setVoiceMetrics((previous) => ({
                        ...previous,
                        loudnessDb,
                        pitchHz: pitchHz > 0 ? pitchHz : previous.pitchHz,
                        speechRateWpm,
                        qualityScore,
                    }));
                }

                const average = frequencyData.reduce((total, value) => total + value, 0) / bufferLength;
                if (average < 10) {
                    if (silenceStartRef.current === null) {
                        silenceStartRef.current = Date.now();
                    } else {
                        const silenceDuration = Date.now() - silenceStartRef.current;
                        if (silenceDuration > 500 && !isCurrentlyPausedRef.current) {
                            isCurrentlyPausedRef.current = true;
                            pauseCountRef.current += 1;
                            setPauseCount(pauseCountRef.current);
                        }
                    }
                } else {
                    if (silenceStartRef.current !== null && isCurrentlyPausedRef.current && pauseCountRef.current > 0) {
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
            setVoiceMetrics({ loudnessDb: -60, pitchHz: 0, speechRateWpm: 0, qualityScore: 0 });
            drawWaveform();

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);
            timerRef.current = window.setInterval(() => setRecordingTime((previous) => previous + 1), 1000);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            toast.error('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (!mediaRecorderRef.current || !isRecording) return;

        mediaRecorderRef.current.stop();
        setIsRecording(false);
        isRecordingRef.current = false;

        if (timerRef.current) window.clearInterval(timerRef.current);
        if (recognitionRef.current) recognitionRef.current.stop();
        if (audioContextRef.current) audioContextRef.current.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSubmitEvaluation = async () => {
        if (!audioBlob || !sessionId) return;

        const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 15) {
            toast.error('Your explanation is too short. Please record again with more details (at least 15 words).');
            return;
        }

        setLoading(true);
        let answerSubmitted = false;

        try {
            const answerResponse = await api.post(`/sessions/${sessionId}/answer`, {
                rawText: transcript,
                voiceMetrics: {
                    duration: recordingTime,
                    pauseCount,
                    avgPauseDuration: parseFloat(avgPauseDuration.toFixed(1)),
                    fillerWordCount,
                },
            });

            answerSubmitted = true;
            const answerId = answerResponse.data.data.answer._id;

            try {
                const evaluationResponse = await api.post(`/sessions/${sessionId}/evaluate`, { answerId });
                if (evaluationResponse.data.success === 1) {
                    if (evaluationResponse.data.data?.evaluationPending) {
                        toast.warning('Evaluation pending. You can re-evaluate from the attempts page.');
                    } else {
                        toast.success('Evaluation complete!');
                    }
                }
            } catch (evaluationError) {
                console.error('Evaluation failed:', evaluationError);
                toast.warning('Evaluation failed. You can re-evaluate from the attempts page.');
            }

            dispatch(invalidateActivities());
            dispatch(invalidateOverview());
            navigate(`/dashboard/session/${sessionId}/attempts`);
        } catch (error) {
            console.error('Failed to submit answer:', error);
            if (answerSubmitted) {
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

    const wordCount = useMemo(() => transcript.trim().split(/\s+/).filter(Boolean).length, [transcript]);
    const normalizedTranscript = useMemo(() => normalizeText(transcript), [transcript]);

    const conceptBlueprint = useMemo(
        () => buildConceptBlueprint(session?.skillName ?? '', historicalMissingConcepts),
        [historicalMissingConcepts, session?.skillName]
    );

    const coverage = useMemo(() => {
        return conceptBlueprint.map((concept) => {
            const matchedAliases = concept.aliases.filter((alias) => containsAlias(normalizedTranscript, alias));
            return {
                ...concept,
                detected: matchedAliases.length > 0,
                matchedAliases,
            };
        });
    }, [conceptBlueprint, normalizedTranscript]);

    const coveragePercent = Math.round((coverage.filter((concept) => concept.detected).length / Math.max(coverage.length, 1)) * 100);
    const keywordHighlights = useMemo(() => {
        const matchedAliases = coverage.flatMap((concept) => concept.matchedAliases);
        const tokens = matchedAliases
            .flatMap((alias) => alias.split(/\s+/))
            .map((token) => token.replace(/[^a-zA-Z0-9+#.]/g, ''))
            .filter((token) => token.length > 2);
        return Array.from(new Set([...(session?.skillName ? session.skillName.split(/\s+/) : []), ...tokens]));
    }, [coverage, session?.skillName]);

    const loudnessStatus = getBandStatus(voiceMetrics.loudnessDb, -32, -16);
    const pitchStatus = getPitchStatus(voiceMetrics.pitchHz);
    const speedStatus = getBandStatus(voiceMetrics.speechRateWpm || Number.NaN, 110, 160);

    const clarityScore = clamp(
        Math.round(82 - fillerWordCount * 7 - pauseCount * 3 - Math.max(avgPauseDuration - 1.5, 0) * 8 + (speedStatus === 'good' ? 7 : 0)),
        28,
        98
    );
    const technicalDepthScore = clamp(Math.round(coveragePercent * 0.7 + Math.min(wordCount, 70) * 0.45), 24, 97);
    const fillerDisciplineScore = clamp(100 - fillerWordCount * 11, 18, 100);

    const coachSignals: Array<{ label: string; value: string; score: number; status: MetricStatus; helper: string }> = [
        {
            label: 'Speaking speed',
            value: voiceMetrics.speechRateWpm > 0 ? `${Math.round(voiceMetrics.speechRateWpm)} WPM` : 'Calibrating',
            score: clamp(Math.round((voiceMetrics.speechRateWpm || 0) / 1.6), 15, 100),
            status: speedStatus,
            helper:
                speedStatus === 'good'
                    ? 'Strong pacing for technical explanations.'
                    : speedStatus === 'low'
                        ? 'Pick up the pace to avoid losing momentum.'
                        : speedStatus === 'high'
                            ? 'Slow down and leave room for structure.'
                            : 'Start speaking to estimate pace.',
        },
        {
            label: 'Clarity',
            value: `${clarityScore}/100`,
            score: clarityScore,
            status: clarityScore >= 75 ? 'good' : clarityScore >= 55 ? 'low' : 'high',
            helper: clarityScore >= 75 ? 'Your delivery is crisp and easy to follow.' : 'Reduce pauses and tighten sentence structure.',
        },
        {
            label: 'Technical depth',
            value: `${technicalDepthScore}/100`,
            score: technicalDepthScore,
            status: technicalDepthScore >= 72 ? 'good' : 'low',
            helper: coveragePercent >= 60 ? 'You are covering key concepts, not just surface definition.' : 'Add architecture, tradeoffs, and concrete examples.',
        },
        {
            label: 'Filler words',
            value: fillerWordCount > 0 ? `${fillerWordCount} detected` : 'Clean delivery',
            score: fillerDisciplineScore,
            status: fillerWordCount <= 2 ? 'good' : fillerWordCount <= 5 ? 'low' : 'high',
            helper: fillerWordCount <= 2 ? 'Very little verbal noise so far.' : 'Replace filler words with short silent pauses.',
        },
    ];

    const overallCoachMessage = useMemo(() => {
        if (!transcript.trim()) {
            return 'Start speaking and the AI coach will surface coverage, pacing, and clarity feedback in real time.';
        }
        if (coveragePercent >= 70 && clarityScore >= 70 && fillerWordCount <= 3) {
            return 'Strong explanation. Keep layering in architecture and real-world examples to finish at evaluator level.';
        }
        if (coveragePercent < 45) {
            return 'You are speaking, but the explanation still lacks enough skill-specific concepts. Anchor your next sentences on the uncovered topics.';
        }
        return 'Good trajectory. Tighten clarity, reduce filler words, and connect each concept to an implementation detail or tradeoff.';
    }, [clarityScore, coveragePercent, fillerWordCount, transcript]);

    const timelineSegments = useMemo(() => buildTimelineSegments(transcript, coverage), [coverage, transcript]);

    const voiceMetricsCards: Array<{ label: string; value: string; helper: string; status: MetricStatus }> = [
        {
            label: 'Loudness',
            value: `${voiceMetrics.loudnessDb.toFixed(1)} dB`,
            helper: 'Target -32 dB to -16 dB',
            status: loudnessStatus,
        },
        {
            label: 'Pitch',
            value: voiceMetrics.pitchHz > 0 ? `${Math.round(voiceMetrics.pitchHz)} Hz` : '--',
            helper: 'Target 110 Hz to 230 Hz',
            status: pitchStatus,
        },
        {
            label: 'Speaking rate',
            value: voiceMetrics.speechRateWpm > 0 ? `${Math.round(voiceMetrics.speechRateWpm)} WPM` : '--',
            helper: 'Target 110 to 160 WPM',
            status: speedStatus,
        },
        {
            label: 'Voice quality',
            value: `${voiceMetrics.qualityScore}/100`,
            helper: 'Blend of loudness, pitch, and pacing',
            status: voiceMetrics.qualityScore >= 75 ? 'good' : voiceMetrics.qualityScore >= 50 ? 'low' : 'high',
        },
    ];

    return (
        <div className="h-full min-h-0 overflow-hidden bg-transparent">
            <div className="mx-auto flex h-full w-full max-w-screen-2xl flex-col px-4 py-4 sm:px-6 lg:px-8">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="space-y-3">
                        <Button
                            variant="ghost"
                            onClick={() => navigate(-1)}
                            className="group -ml-2 h-9 px-2 text-zinc-400 hover:bg-transparent hover:text-white"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Back
                        </Button>
                        <div className="space-y-2">
                            <div>
                                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
                                    Explain <span className="bg-linear-to-r from-white via-cyan-100 to-violet-200 bg-clip-text text-transparent">{session?.skillName ?? 'your skill'}</span>
                                </h1>
                            </div>
                        </div>
                    </div>

                    <div className={cn('hidden rounded-2xl border px-3 py-2 text-xs font-medium md:flex md:items-center md:gap-2', isRecording ? 'border-emerald-500/18 bg-emerald-500/8 text-emerald-200' : 'border-white/6 bg-white/4 text-zinc-300')}>
                        <span className={cn('h-2.5 w-2.5 rounded-full', isRecording ? 'bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.75)]' : 'bg-zinc-500')} />
                        {isRecording ? 'AI analyzer is listening live' : audioBlob ? 'Recording captured and ready for evaluation' : 'Ready to start voice assessment'}
                    </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                    <motion.section
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35 }}
                        className={cn(panelClass, 'p-4')}
                    >
                        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Skill Coverage</p>
                                <h2 className="mt-1 text-lg font-semibold text-white">Concept tracker</h2>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-sm font-medium text-cyan-200">
                                    {coveragePercent}% covered
                                </div>
                                {historicalMissingConcepts.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {historicalMissingConcepts.map((concept) => (
                                            <span key={concept} className="rounded-full border border-orange-500/16 bg-orange-500/8 px-2.5 py-1 text-xs text-orange-100">
                                                {concept}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mb-4 h-2 overflow-hidden rounded-full bg-black/20">
                            <motion.div
                                className="h-full rounded-full bg-linear-to-r from-emerald-400 via-cyan-400 to-violet-400"
                                initial={{ width: 0 }}
                                animate={{ width: `${coveragePercent}%` }}
                                transition={{ duration: 0.5, ease: 'easeOut' }}
                            />
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
                            {coverage.map((concept, index) => (
                                <motion.div
                                    key={concept.label}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.04 }}
                                    className={cn(
                                        'rounded-2xl border p-3 transition-colors',
                                        concept.detected
                                            ? 'border-emerald-500/18 bg-emerald-500/8'
                                            : 'border-white/5 bg-white/3'
                                    )}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={cn('mt-0.5 shrink-0', concept.detected ? 'text-emerald-300' : 'text-zinc-500')}>
                                            {concept.detected ? <CheckCircle2 className="h-4.5 w-4.5" /> : <CircleDashed className="h-4.5 w-4.5" />}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-white">{concept.label}</p>
                                                {concept.detected && concept.matchedAliases[0] && (
                                                    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
                                                        detected
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">{concept.hint}</p>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.28fr)_380px] 2xl:grid-cols-[minmax(0,1.38fr)_420px]">
                        <div className="space-y-4">
                            <motion.section
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4 }}
                                className={cn(panelClass, 'p-4 sm:p-5')}
                            >
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Recorder</p>
                                    <h2 className="mt-1 text-lg font-semibold text-white">Live explanation stream</h2>
                                </div>
                                <div className="flex items-center gap-2 rounded-full border border-white/6 bg-white/4 px-3 py-1.5 text-xs text-zinc-300">
                                    <Brain className="h-3.5 w-3.5 text-cyan-300" />
                                    {wordCount} words captured
                                </div>
                            </div>

                            <div className={cn(mutedPanelClass, 'relative overflow-hidden p-4 sm:p-5')}>
                                <div className="pointer-events-none absolute inset-x-10 top-0 h-24 rounded-full bg-cyan-500/8 blur-3xl" />

                                <div className="relative z-10 text-center">
                                    <motion.div
                                        animate={isRecording ? { scale: [1, 1.04, 1], opacity: [0.65, 1, 0.65] } : { scale: 1, opacity: 0.55 }}
                                        transition={isRecording ? { repeat: Infinity, duration: 2.2, ease: 'easeInOut' } : { duration: 0.2 }}
                                        className="mx-auto mb-3 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/14 bg-cyan-500/8 text-cyan-200 shadow-[0_0_50px_rgba(34,211,238,0.12)]"
                                    >
                                        <AudioLines className="h-7 w-7" />
                                    </motion.div>

                                    <div className="text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                                        {formatTime(recordingTime)}
                                    </div>
                                    <p className="mt-1 text-xs uppercase tracking-[0.26em] text-zinc-500">
                                        {isRecording ? 'Live capture in progress' : audioBlob ? 'Captured sample ready' : 'Waiting for microphone input'}
                                    </p>
                                </div>

                                <div className="relative mt-5 overflow-hidden rounded-[22px] border border-white/6 bg-[rgba(8,17,29,0.34)]">
                                    <canvas
                                        ref={canvasRef}
                                        width={760}
                                        height={170}
                                        className="h-36 w-full sm:h-40"
                                    />

                                    {!isRecording && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(12,18,30,0.20),rgba(8,13,24,0.84))]">
                                            {audioBlob ? (
                                                <div className="flex items-center gap-3 rounded-full border border-emerald-500/16 bg-emerald-500/8 px-4 py-2 text-sm text-emerald-200">
                                                    <Volume2 className="h-4.5 w-4.5" />
                                                    Recording complete
                                                </div>
                                            ) : (
                                                <div className="flex items-end gap-1">
                                                    {Array.from({ length: 42 }).map((_, index) => (
                                                        <motion.span
                                                            key={index}
                                                            className="w-1 rounded-full bg-linear-to-t from-cyan-500/40 via-violet-400/70 to-cyan-200/90"
                                                            animate={{ height: [10 + (index % 4) * 3, 28 + (index % 6) * 6, 12 + (index % 5) * 4] }}
                                                            transition={{ repeat: Infinity, duration: 1.4 + (index % 5) * 0.12, repeatType: 'mirror', delay: index * 0.02 }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 flex justify-center">
                                    {!audioBlob ? (
                                        <motion.button
                                            type="button"
                                            whileTap={{ scale: 0.97 }}
                                            whileHover={{ scale: 1.03 }}
                                            onClick={isRecording ? stopRecording : startRecording}
                                            className={cn(
                                                'relative flex h-18 w-18 items-center justify-center rounded-full border text-white shadow-lg transition-colors sm:h-20 sm:w-20',
                                                isRecording
                                                    ? 'border-red-500/40 bg-red-500 shadow-red-500/25'
                                                    : 'border-emerald-500/40 bg-emerald-500 shadow-emerald-500/25'
                                            )}
                                        >
                                            <AnimatePresence>
                                                {isRecording && (
                                                    <>
                                                        <motion.span
                                                            initial={{ scale: 0.9, opacity: 0.2 }}
                                                            animate={{ scale: 1.7, opacity: 0 }}
                                                            exit={{ opacity: 0 }}
                                                            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
                                                            className="absolute inset-0 rounded-full border border-red-400/50"
                                                        />
                                                        <motion.span
                                                            initial={{ scale: 1, opacity: 0.18 }}
                                                            animate={{ scale: 2.05, opacity: 0 }}
                                                            exit={{ opacity: 0 }}
                                                            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeOut', delay: 0.35 }}
                                                            className="absolute inset-0 rounded-full border border-cyan-300/40"
                                                        />
                                                    </>
                                                )}
                                            </AnimatePresence>

                                            {isRecording ? <StopCircle className="h-9 w-9 fill-white" /> : <Mic className="h-9 w-9" />}
                                        </motion.button>
                                    ) : (
                                        <div className="flex flex-wrap justify-center gap-3">
                                            <Button
                                                variant="outline"
                                                className="h-12 rounded-xl border-white/8 bg-white/5 px-5 text-zinc-200 hover:bg-white/8 hover:text-white"
                                                onClick={() => {
                                                    setAudioBlob(null);
                                                    setRecordingTime(0);
                                                    setTranscript('');
                                                    setPauseCount(0);
                                                    setAvgPauseDuration(0);
                                                    setFillerWordCount(0);
                                                    setVoiceMetrics({ loudnessDb: -60, pitchHz: 0, speechRateWpm: 0, qualityScore: 0 });
                                                }}
                                            >
                                                <RotateCcw className="mr-2 h-4 w-4" />
                                                Retake
                                            </Button>
                                            <Button
                                                className="h-12 rounded-xl bg-emerald-500 px-6 text-white hover:bg-emerald-400"
                                                onClick={handleSubmitEvaluation}
                                                disabled={loading}
                                            >
                                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Get Evaluation'}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {!isRecording && !audioBlob && (
                                    <p className="mt-3 text-center text-sm text-zinc-500">
                                        Start speaking and the AI will map concepts, track pacing, and highlight technical keywords live.
                                    </p>
                                )}
                            </div>

                            </motion.section>

                            <motion.section
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, delay: 0.05 }}
                                className={cn(panelClass, 'p-4')}
                            >
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">AI Analysis</p>
                                    <h2 className="mt-1 text-lg font-semibold text-white">Voice metrics</h2>
                                </div>
                                <div className="rounded-full border border-violet-500/14 bg-violet-500/8 px-3 py-1 text-sm font-medium text-violet-200">
                                    {voiceMetrics.qualityScore}/100
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                                {voiceMetricsCards.map((metric) => (
                                    <div key={metric.label} className={cn(mutedPanelClass, 'p-3 ring-1', statusStyles[metric.status].ring, statusStyles[metric.status].chip)}>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="text-[11px] uppercase tracking-[0.18em] opacity-80">{metric.label}</p>
                                                <p className="mt-1 text-lg font-semibold text-white">{metric.value}</p>
                                            </div>
                                            <Gauge className={cn('h-5 w-5', statusStyles[metric.status].text)} />
                                        </div>
                                        <p className="mt-2 text-xs opacity-85">{metric.helper}</p>
                                    </div>
                                ))}
                            </div>

                                <div className="mt-4 grid grid-cols-3 gap-2">
                                    <div className="rounded-2xl border border-white/5 bg-white/3 p-3 text-center">
                                        <div className="text-xl font-semibold text-white">{pauseCount}</div>
                                        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Pauses</div>
                                    </div>
                                    <div className="rounded-2xl border border-white/5 bg-white/3 p-3 text-center">
                                        <div className="text-xl font-semibold text-white">{avgPauseDuration.toFixed(1)}s</div>
                                        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Avg pause</div>
                                    </div>
                                    <div className="rounded-2xl border border-white/5 bg-white/3 p-3 text-center">
                                        <div className={cn('text-xl font-semibold', fillerWordCount > 5 ? 'text-orange-300' : 'text-white')}>{fillerWordCount}</div>
                                        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-zinc-500">Fillers</div>
                                    </div>
                                </div>
                            </motion.section>
                        </div>

                        <div className="space-y-4">
                            <motion.section
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.35 }}
                                className={cn(panelClass, 'p-4')}
                            >
                                <div className="mb-3 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Live Transcript</p>
                                        <h3 className="mt-1 text-sm font-semibold text-white">Detected explanation</h3>
                                    </div>
                                    <div className="rounded-full border border-white/6 bg-white/4 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-zinc-400">
                                        {keywordHighlights.length} keywords
                                    </div>
                                </div>
                                <div className="max-h-44 overflow-y-auto rounded-2xl border border-white/5 bg-black/10 p-3 text-sm leading-7 text-zinc-200">
                                    {transcript.trim() ? (
                                        <div className="space-x-1 whitespace-pre-wrap">
                                            {renderHighlightedTranscript(transcript, keywordHighlights)}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-zinc-500">
                                            <MessageSquareText className="h-4 w-4" />
                                            Transcript will appear here while you speak.
                                        </div>
                                    )}
                                </div>
                            </motion.section>

                            <motion.section
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.35, delay: 0.05 }}
                                className={cn(panelClass, 'p-4')}
                            >
                                <div className="mb-3 flex items-center gap-2">
                                    <Sparkles className="h-4.5 w-4.5 text-cyan-300" />
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">AI Coach</p>
                                        <h3 className="mt-1 text-sm font-semibold text-white">Real-time guidance</h3>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-sm leading-relaxed text-cyan-50">
                                    {overallCoachMessage}
                                </div>

                                <div className="mt-4 space-y-3">
                                    {coachSignals.map((signal) => (
                                        <div key={signal.label} className="rounded-2xl border border-white/5 bg-white/3 p-3">
                                            <div className="mb-2 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-2 text-sm font-medium text-white">
                                                    <Zap className={cn('h-4 w-4', statusStyles[signal.status].text)} />
                                                    {signal.label}
                                                </div>
                                                <span className={cn('rounded-full border px-2.5 py-1 text-xs', statusStyles[signal.status].chip)}>
                                                    {signal.value}
                                                </span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-black/20">
                                                <motion.div
                                                    className={cn(
                                                        'h-full rounded-full',
                                                        getStatusTone(signal.status) === 'emerald' && 'bg-linear-to-r from-emerald-400 to-cyan-400',
                                                        getStatusTone(signal.status) === 'amber' && 'bg-linear-to-r from-amber-400 to-orange-400',
                                                        getStatusTone(signal.status) === 'orange' && 'bg-linear-to-r from-orange-400 to-red-400',
                                                        getStatusTone(signal.status) === 'zinc' && 'bg-linear-to-r from-zinc-500 to-zinc-300'
                                                    )}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${signal.score}%` }}
                                                    transition={{ duration: 0.45, ease: 'easeOut' }}
                                                />
                                            </div>
                                            <p className="mt-2 text-xs leading-relaxed text-zinc-400">{signal.helper}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>

                            <motion.section
                                initial={{ opacity: 0, x: 16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.35, delay: 0.08 }}
                                className={cn(panelClass, 'p-4')}
                            >
                                <div className="mb-3 flex items-center gap-2">
                                    <Radar className="h-4.5 w-4.5 text-violet-300" />
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Speech Timeline</p>
                                        <h3 className="mt-1 text-sm font-semibold text-white">Explanation sections</h3>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {timelineSegments.map((segment, index) => (
                                        <div key={`${segment.label}-${index}`}>
                                            <div className="mb-1 flex items-center justify-between gap-3 text-xs text-zinc-400">
                                                <span className="font-medium text-zinc-200">{segment.label}</span>
                                                <span>{Math.round((recordingTime || 1) * (segment.progress / 100))}s</span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-zinc-900/80">
                                                <motion.div
                                                    className="h-full rounded-full bg-linear-to-r from-cyan-400 via-violet-400 to-emerald-400"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${segment.progress}%` }}
                                                    transition={{ duration: 0.5, ease: 'easeOut', delay: index * 0.04 }}
                                                />
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-500">{segment.preview}</p>
                                        </div>
                                    ))}
                                </div>
                            </motion.section>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkillSessionRecordings;
