import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BadgeCheck, ExternalLink, Github, Loader2, Mic, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

type VerificationPayload = {
    profile: {
        username: string;
        avatar: string;
        profileUrl: string;
    };
    skill: {
        name: string;
        codeScore: number;
        voiceScore: number;
        finalScore: number;
        verified: boolean;
        confidenceScore: number;
    };
    stack: {
        languages: string[];
        frameworks: string[];
        libraries: string[];
        primaryStack: string[];
    };
    conceptCoverage: {
        codeEvidence: number;
        explanationStrength: number;
        finalVerification: number;
    };
    repositories: Array<{
        name: string;
        url: string;
        summary: string;
        technologies: string[];
        commits: number;
        stars: number;
    }>;
    summary: {
        githubScore: number;
        voiceScore: number;
        finalScore: number;
    };
    updatedAt?: string;
};

const panelClass = 'rounded-[28px] border border-white/6 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.08),transparent_42%),linear-gradient(180deg,rgba(11,15,25,0.66),rgba(6,9,18,0.38))] shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl';

export const VerifySkill: React.FC = () => {
    const { username = '', skill = '' } = useParams();
    const [verification, setVerification] = useState<VerificationPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchVerification = async () => {
            try {
                const res = await api.get(`/github/verify/${username}/${skill}`);
                setVerification(res.data?.data?.verification ?? null);
            } catch (requestError: any) {
                setError(requestError?.response?.data?.message || 'Verification profile not found');
            } finally {
                setLoading(false);
            }
        };

        fetchVerification();
    }, [skill, username]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#050816] text-white">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
            </div>
        );
    }

    if (error || !verification) {
        return (
            <div className="min-h-screen bg-[#050816] px-6 py-16 text-white">
                <div className="mx-auto max-w-3xl rounded-[28px] border border-white/8 bg-white/5 p-8 text-center backdrop-blur-xl">
                    <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">SkillCraft Verification</p>
                    <h1 className="mt-3 text-3xl font-semibold">Verification not available</h1>
                    <p className="mt-3 text-sm text-zinc-400">{error}</p>
                    <Link to="/login" className="mt-6 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-medium text-zinc-950">Open SkillCraft</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_24%),linear-gradient(180deg,#050816,#070d1b_40%,#040711)] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">SkillCraft Verified</p>
                        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{verification.skill.name}</h1>
                        <p className="mt-2 text-sm text-zinc-400">Public skill verification generated from GitHub repository evidence and voice explanation performance.</p>
                    </div>
                    <Link to="/dashboard/github-verification" className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">
                        Open SkillCraft
                    </Link>
                </div>

                <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                    <section className={cn(panelClass, 'p-5')}>
                        <div className="flex items-center gap-4">
                            <img src={verification.profile.avatar} alt={verification.profile.username} className="h-18 w-18 rounded-3xl border border-white/10 object-cover" />
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Verified Engineer</p>
                                <h2 className="mt-1 text-2xl font-semibold">@{verification.profile.username}</h2>
                                <a href={verification.profile.profileUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-cyan-300 hover:text-cyan-200">
                                    GitHub profile <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                            </div>
                        </div>

                        <div className="mt-6 space-y-3">
                            <Metric label="GitHub code signal" value={`${verification.skill.codeScore}%`} icon={<Github className="h-4 w-4 text-cyan-300" />} />
                            <Metric label="Voice explanation" value={`${verification.skill.voiceScore}%`} icon={<Mic className="h-4 w-4 text-violet-300" />} />
                            <Metric label="Final skill score" value={`${verification.skill.finalScore}%`} icon={<ShieldCheck className="h-4 w-4 text-emerald-300" />} />
                        </div>
                    </section>

                    <section className={cn(panelClass, 'p-5')}>
                        <div className="grid gap-4 lg:grid-cols-3">
                            <ScorePillar title="Code Evidence" value={verification.conceptCoverage.codeEvidence} accent="cyan" />
                            <ScorePillar title="Explanation Strength" value={verification.conceptCoverage.explanationStrength} accent="violet" />
                            <ScorePillar title="Final Verification" value={verification.conceptCoverage.finalVerification} accent="emerald" />
                        </div>

                        <div className="mt-5 rounded-3xl border border-emerald-500/18 bg-[linear-gradient(180deg,rgba(16,185,129,0.18),rgba(10,14,23,0.18))] p-5 shadow-[0_0_60px_rgba(16,185,129,0.12)]">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <BadgeCheck className="h-5 w-5 text-emerald-300" />
                                        <p className="text-lg font-semibold text-white">SkillCraft Verified Badge</p>
                                    </div>
                                    <p className="mt-2 text-sm text-emerald-50/80">
                                        {verification.skill.verified
                                            ? `${verification.profile.username} has verified proficiency in ${verification.skill.name}.`
                                            : `${verification.profile.username} is building evidence toward verified proficiency in ${verification.skill.name}.`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-4xl font-semibold text-white">{verification.skill.finalScore}</p>
                                    <p className="text-xs uppercase tracking-[0.24em] text-emerald-100/80">Score / 100</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
                    <section className={cn(panelClass, 'p-5')}>
                        <div className="mb-4 flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Supporting Repositories</p>
                                <h2 className="mt-1 text-lg font-semibold">Projects contributing to this verification</h2>
                            </div>
                            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                                Updated {verification.updatedAt ? new Date(verification.updatedAt).toLocaleDateString() : 'recently'}
                            </div>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                            {verification.repositories.map((repository) => (
                                <motion.a
                                    key={repository.name}
                                    href={repository.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="rounded-2xl border border-white/6 bg-white/3 p-4 hover:bg-white/5"
                                >
                                    <div className="flex items-center justify-between gap-3">
                                        <h3 className="text-base font-semibold text-white">{repository.name}</h3>
                                        <ExternalLink className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <p className="mt-2 text-sm leading-6 text-zinc-400">{repository.summary}</p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {repository.technologies.map((technology) => (
                                            <span key={technology} className="rounded-full border border-white/8 bg-white/4 px-2.5 py-1 text-xs text-zinc-200">{technology}</span>
                                        ))}
                                    </div>
                                </motion.a>
                            ))}
                        </div>
                    </section>

                    <section className={cn(panelClass, 'p-5')}>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Detected Stack</p>
                        <h2 className="mt-1 text-lg font-semibold">Technology footprint</h2>
                        <div className="mt-4 space-y-4">
                            <StackGroup title="Primary Stack" items={verification.stack.primaryStack} />
                            <StackGroup title="Languages" items={verification.stack.languages} />
                            <StackGroup title="Frameworks" items={verification.stack.frameworks} />
                            <StackGroup title="Libraries" items={verification.stack.libraries} />
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

const Metric = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => (
    <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-zinc-500">{icon}{label}</div>
        <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
);

const ScorePillar = ({ title, value, accent }: { title: string; value: number; accent: 'cyan' | 'violet' | 'emerald' }) => (
    <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{title}</p>
        <p className="mt-2 text-3xl font-semibold text-white">{value}%</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${value}%` }}
                className={cn(
                    'h-full rounded-full',
                    accent === 'cyan' && 'bg-linear-to-r from-cyan-400 to-blue-400',
                    accent === 'violet' && 'bg-linear-to-r from-violet-400 to-fuchsia-400',
                    accent === 'emerald' && 'bg-linear-to-r from-emerald-400 to-cyan-400'
                )}
            />
        </div>
    </div>
);

const StackGroup = ({ title, items }: { title: string; items: string[] }) => (
    <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{title}</p>
        <div className="mt-3 flex flex-wrap gap-2">
            {items.length > 0 ? items.map((item) => (
                <span key={item} className="rounded-full border border-white/8 bg-white/4 px-3 py-1 text-xs text-zinc-200">{item}</span>
            )) : <span className="text-sm text-zinc-500">No items available.</span>}
        </div>
    </div>
);

export default VerifySkill;
