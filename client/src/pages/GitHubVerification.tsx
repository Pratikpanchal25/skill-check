import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
    ArrowLeft,
    BadgeCheck,
    BrainCircuit,
    Copy,
    ExternalLink,
    Github,
    Loader2,
    RefreshCw,
    ShieldCheck,
    Sparkles,
    Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

type GithubProfile = {
    username: string;
    avatar: string;
    profileUrl: string;
    followers: number;
    publicRepos: number;
    reposAnalyzed: number;
    lastSync?: string;
};

type SkillEntry = {
    skill: string;
    score: number;
    codeScore: number;
    voiceScore: number;
    finalScore: number;
    verified: boolean;
    evidenceCount: number;
    verificationUrl?: string | null;
};

type SkillProfile = {
    languages: string[];
    frameworks: string[];
    libraries: string[];
    repoCount: number;
    commitCount: number;
    primaryStack: string[];
    confidenceScore: number;
    combinedSummary: {
        githubScore: number;
        voiceScore: number;
        finalScore: number;
    };
    skillsDetected: SkillEntry[];
    repoHighlights: Array<{
        name: string;
        url: string;
        summary: string;
        technologies: string[];
        commits: number;
        stars: number;
    }>;
    updatedAt?: string;
};

const panelClass = 'rounded-[28px] border border-white/6 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_42%),linear-gradient(180deg,rgba(11,15,25,0.62),rgba(6,9,18,0.36))] shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl';
const mutedPanelClass = 'rounded-[24px] border border-white/5 bg-[linear-gradient(180deg,rgba(15,20,32,0.42),rgba(10,14,23,0.26))] backdrop-blur-lg';

export const GitHubVerification: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [connected, setConnected] = useState(false);
    const [profile, setProfile] = useState<GithubProfile | null>(null);
    const [skillProfile, setSkillProfile] = useState<SkillProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [connecting, setConnecting] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const handledGithubStateRef = useRef<string | null>(null);

    const githubState = searchParams.get('github');

    const fetchProfile = async () => {
        try {
            const res = await api.get('/github/profile');
            const data = res.data?.data;
            setConnected(Boolean(data?.connected));
            setProfile(data?.githubProfile ?? null);
            setSkillProfile(data?.skillProfile ?? null);
        } catch {
            setConnected(false);
            setProfile(null);
            setSkillProfile(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    useEffect(() => {
        if (!githubState) return;
        if (handledGithubStateRef.current === githubState) return;

        handledGithubStateRef.current = githubState;

        if (githubState === 'connected') {
            toast.success('GitHub connected successfully', { id: 'github-connected' });
            fetchProfile().then(async () => {
                try {
                    setAnalyzing(true);
                    const res = await api.post('/github/analyze', { forceRefresh: true });
                    const data = res.data?.data;
                    setProfile(data?.githubProfile ?? null);
                    setSkillProfile(data?.skillProfile ?? null);
                    toast.success('GitHub repositories analyzed', { id: 'github-analyzed' });
                } catch (error) {
                    const message =
                        (error as AxiosError<{ error?: string; message?: string }>)?.response?.data?.error ||
                        (error as AxiosError<{ error?: string; message?: string }>)?.response?.data?.message ||
                        'GitHub connected, but analysis failed. You can retry manually.';
                    toast.error(message, { id: 'github-analyze-error' });
                } finally {
                    setAnalyzing(false);
                }
            });
        }

        if (githubState === 'error') {
            toast.error('GitHub connection failed', { id: 'github-connect-error' });
        }

        setSearchParams((current) => {
            current.delete('github');
            return current;
        }, { replace: true });
    }, [githubState, setSearchParams]);

    const handleConnect = async () => {
        try {
            setConnecting(true);
            const res = await api.post('/github/connect');
            const url = res.data?.data?.url;
            if (!url) throw new Error('GitHub connect URL unavailable');
            window.location.href = url;
        } catch {
            toast.error('Unable to start GitHub connection');
            setConnecting(false);
        }
    };

    const handleAnalyze = async (forceRefresh = false) => {
        try {
            setAnalyzing(true);
            const res = await api.post('/github/analyze', { forceRefresh });
            const data = res.data?.data;
            setProfile(data?.githubProfile ?? null);
            setSkillProfile(data?.skillProfile ?? null);
            toast.success(forceRefresh ? 'GitHub skill profile refreshed' : 'GitHub skill profile generated', { id: 'github-manual-analyze' });
        } catch (error) {
            const message =
                (error as AxiosError<{ error?: string; message?: string }>)?.response?.data?.error ||
                (error as AxiosError<{ error?: string; message?: string }>)?.response?.data?.message ||
                'GitHub analysis failed';
            toast.error(message, { id: 'github-manual-analyze-error' });
        } finally {
            setAnalyzing(false);
        }
    };

    const topVerifiedSkills = useMemo(
        () => (skillProfile?.skillsDetected ?? []).filter((skill) => skill.verified).slice(0, 6),
        [skillProfile],
    );

    const copyShareLink = async (skill: SkillEntry) => {
        if (!profile?.username) return;
        const url = `${window.location.origin}/verify/${profile.username}/${encodeURIComponent(skill.skill.toLowerCase())}`;
        await navigator.clipboard.writeText(url);
        toast.success(`${skill.skill} verification link copied`);
    };

    if (loading) {
        return (
            <div className="h-full min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
        );
    }

    return (
        <div className="h-full min-h-0 overflow-y-auto bg-transparent">
            <div className="mx-auto w-full max-w-screen-2xl px-4 py-5 sm:px-6 lg:px-8">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-3">
                        <Button
                            variant="ghost"
                            onClick={() => navigate(-1)}
                            className="group -ml-2 h-9 px-2 text-zinc-400 hover:bg-transparent hover:text-white"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                            Back
                        </Button>
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-200">
                                <Sparkles className="h-3.5 w-3.5" />
                                GitHub Skill Verification
                            </div>
                            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Prove your code skill with repository evidence</h1>
                            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
                                SkillCraft combines GitHub repository analysis with voice explanation scores to produce shareable verification badges.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {!connected ? (
                            <Button
                                onClick={handleConnect}
                                disabled={connecting}
                                className="h-11 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200"
                            >
                                {connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Github className="mr-2 h-4 w-4" />}
                                Connect GitHub
                            </Button>
                        ) : (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => handleAnalyze(true)}
                                    disabled={analyzing}
                                    className="h-11 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10"
                                >
                                    {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                                    Refresh Analysis
                                </Button>
                                {!skillProfile && (
                                    <Button
                                        onClick={() => handleAnalyze(false)}
                                        disabled={analyzing}
                                        className="h-11 rounded-xl bg-emerald-500 text-white hover:bg-emerald-400"
                                    >
                                        {analyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                        Analyze Repositories
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {!connected && (
                    <div className={cn(panelClass, 'p-6')}>
                        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                            <div>
                                <h2 className="text-xl font-semibold text-white">Connect GitHub to verify your skills</h2>
                                <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
                                    SkillCraft will inspect your top repositories, detect the frameworks and technologies you actively use,
                                    and combine those code signals with your voice explanation scores.
                                </p>
                                <div className="mt-5 flex flex-wrap gap-2 text-xs text-zinc-300">
                                    {['Top 20 repositories', 'Encrypted token storage', 'Voice + code combined scoring', 'Shareable public verification'].map((item) => (
                                        <span key={item} className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5">{item}</span>
                                    ))}
                                </div>
                            </div>
                            <div className={cn(mutedPanelClass, 'p-5')}>
                                <div className="space-y-4">
                                    <FeatureRow title="Repository analysis" description="Detect frameworks, libraries, languages, and backend stack choices." />
                                    <FeatureRow title="Weighted scoring" description="Blend repo coverage, dependency frequency, commits, and explanation quality." />
                                    <FeatureRow title="Verified badges" description="Generate public SkillCraft verification pages for your strongest technologies." />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {connected && profile && (
                    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                        <motion.section
                            initial={{ opacity: 0, x: -14 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={cn(panelClass, 'p-5')}
                        >
                            <div className="flex items-center gap-4">
                                <img src={profile.avatar} alt={profile.username} className="h-16 w-16 rounded-2xl border border-white/10 object-cover" />
                                <div>
                                    <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">GitHub Profile</p>
                                    <h2 className="mt-1 text-xl font-semibold text-white">@{profile.username}</h2>
                                    <a href={profile.profileUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200">
                                        Open profile <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-2 gap-3">
                                <MetricMini label="Followers" value={profile.followers} />
                                <MetricMini label="Public repos" value={profile.publicRepos} />
                                <MetricMini label="Analyzed repos" value={profile.reposAnalyzed} />
                                <MetricMini label="Last sync" value={profile.lastSync ? new Date(profile.lastSync).toLocaleDateString() : 'Pending'} />
                            </div>
                        </motion.section>

                        <motion.section
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(panelClass, 'p-5')}
                        >
                            <div className="grid gap-3 md:grid-cols-3">
                                <SummaryCard title="Code Skill" value={skillProfile?.combinedSummary.githubScore ?? 0} accent="cyan" />
                                <SummaryCard title="Explanation Skill" value={skillProfile?.combinedSummary.voiceScore ?? 0} accent="violet" />
                                <SummaryCard title="Final Verified Score" value={skillProfile?.combinedSummary.finalScore ?? 0} accent="emerald" />
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-300">
                                {(skillProfile?.primaryStack ?? []).map((stack) => (
                                    <span key={stack} className="rounded-full border border-cyan-500/18 bg-cyan-500/10 px-3 py-1.5 text-cyan-100">{stack}</span>
                                ))}
                                <span className="rounded-full border border-white/8 bg-white/4 px-3 py-1.5">Confidence {skillProfile?.confidenceScore ?? 0}%</span>
                            </div>
                        </motion.section>
                    </div>
                )}

                {connected && skillProfile && (
                    <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_380px]">
                        <div className="space-y-4">
                            <section className={cn(panelClass, 'p-5')}>
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Detected Stack</p>
                                        <h2 className="mt-1 text-lg font-semibold text-white">Technologies found across your repositories</h2>
                                    </div>
                                    <div className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs text-zinc-300">
                                        {skillProfile.repoCount} repos • {skillProfile.commitCount} commits
                                    </div>
                                </div>
                                <div className="grid gap-4 lg:grid-cols-3">
                                    <TagCluster title="Languages" items={skillProfile.languages} />
                                    <TagCluster title="Frameworks" items={skillProfile.frameworks} />
                                    <TagCluster title="Libraries" items={skillProfile.libraries} />
                                </div>
                            </section>

                            <section className={cn(panelClass, 'p-5')}>
                                <div className="mb-4 flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Skill Scores</p>
                                        <h2 className="mt-1 text-lg font-semibold text-white">GitHub analysis combined with voice evidence</h2>
                                    </div>
                                    <div className="rounded-full border border-emerald-500/16 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-100">
                                        {topVerifiedSkills.length} verified badges
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {skillProfile.skillsDetected.map((skill, index) => (
                                        <motion.div
                                            key={skill.skill}
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            className="rounded-2xl border border-white/6 bg-white/3 p-4"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-base font-semibold text-white">{skill.skill}</p>
                                                        {skill.verified && <BadgeCheck className="h-4.5 w-4.5 text-emerald-300" />}
                                                    </div>
                                                    <p className="mt-1 text-xs text-zinc-400">Evidence from {skill.evidenceCount} repositories</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xl font-semibold text-white">{skill.finalScore}%</p>
                                                    <p className="text-xs text-zinc-500">GitHub {skill.codeScore}% • Voice {skill.voiceScore}%</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
                                                <motion.div
                                                    className={cn(
                                                        'h-full rounded-full',
                                                        skill.verified
                                                            ? 'bg-linear-to-r from-emerald-400 via-cyan-400 to-violet-400'
                                                            : 'bg-linear-to-r from-cyan-500 to-violet-500'
                                                    )}
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${skill.finalScore}%` }}
                                                    transition={{ duration: 0.6, ease: 'easeOut' }}
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>

                            <section className={cn(panelClass, 'p-5')}>
                                <div className="mb-4 flex items-center gap-3">
                                    <BrainCircuit className="h-4.5 w-4.5 text-cyan-300" />
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Repository Highlights</p>
                                        <h2 className="mt-1 text-lg font-semibold text-white">Projects that support your verification</h2>
                                    </div>
                                </div>
                                <div className="grid gap-3 lg:grid-cols-2">
                                    {skillProfile.repoHighlights.map((repo) => (
                                        <a
                                            key={repo.name}
                                            href={repo.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="rounded-2xl border border-white/6 bg-white/3 p-4 transition-colors hover:bg-white/5"
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <h3 className="text-base font-semibold text-white">{repo.name}</h3>
                                                <ExternalLink className="h-4 w-4 text-zinc-500" />
                                            </div>
                                            <p className="mt-2 text-sm leading-6 text-zinc-400">{repo.summary}</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                {repo.technologies.map((technology) => (
                                                    <span key={technology} className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-xs text-zinc-200">{technology}</span>
                                                ))}
                                            </div>
                                            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
                                                <span>{repo.commits} commits</span>
                                                <span>{repo.stars} stars</span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </section>
                        </div>

                        <div className="space-y-4">
                            <section className={cn(panelClass, 'p-5')}>
                                <div className="mb-4 flex items-center gap-3">
                                    <Trophy className="h-4.5 w-4.5 text-amber-300" />
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">SkillCraft Verified</p>
                                        <h2 className="mt-1 text-lg font-semibold text-white">Shareable skill badges</h2>
                                    </div>
                                </div>
                                <AnimatePresence>
                                    {topVerifiedSkills.length > 0 ? (
                                        <div className="space-y-3">
                                            {topVerifiedSkills.map((skill) => (
                                                <motion.div
                                                    key={skill.skill}
                                                    layout
                                                    className="rounded-2xl border border-emerald-500/16 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(10,14,23,0.24))] p-4 shadow-[0_0_40px_rgba(16,185,129,0.08)]"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <BadgeCheck className="h-4.5 w-4.5 text-emerald-300" />
                                                                <p className="text-base font-semibold text-white">{skill.skill}</p>
                                                            </div>
                                                            <p className="mt-1 text-xs text-emerald-100/80">Final verified score {skill.finalScore}%</p>
                                                        </div>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => copyShareLink(skill)}
                                                            className="h-8 w-8 text-zinc-200 hover:bg-white/10"
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className={cn(mutedPanelClass, 'p-4 text-sm text-zinc-400')}>
                                            Run analysis and strengthen your voice scores to unlock verified badges.
                                        </div>
                                    )}
                                </AnimatePresence>
                            </section>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const FeatureRow = ({ title, description }: { title: string; description: string }) => (
    <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-zinc-400">{description}</p>
    </div>
);

const MetricMini = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="rounded-2xl border border-white/6 bg-white/3 p-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
        <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
);

const SummaryCard = ({ title, value, accent }: { title: string; value: number; accent: 'cyan' | 'violet' | 'emerald' }) => (
    <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{title}</p>
        <div className="mt-3 flex items-end justify-between gap-4">
            <p className="text-3xl font-semibold text-white">{value}</p>
            <div className={cn(
                'rounded-full px-3 py-1 text-xs',
                accent === 'cyan' && 'bg-cyan-500/10 text-cyan-200',
                accent === 'violet' && 'bg-violet-500/10 text-violet-200',
                accent === 'emerald' && 'bg-emerald-500/10 text-emerald-200'
            )}>
                /100
            </div>
        </div>
    </div>
);

const TagCluster = ({ title, items }: { title: string; items: string[] }) => (
    <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{title}</p>
        <div className="mt-3 flex flex-wrap gap-2">
            {items.length > 0 ? items.map((item) => (
                <span key={item} className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs text-zinc-200">
                    {item}
                </span>
            )) : <span className="text-sm text-zinc-500">No {title.toLowerCase()} detected yet.</span>}
        </div>
    </div>
);

export default GitHubVerification;
