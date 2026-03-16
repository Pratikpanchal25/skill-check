type RepoSkillSignal = {
  name: string;
  commits: number;
  skills: string[];
  dependencyMatches: string[];
  technologies: string[];
};

type VoiceSkillScore = {
  skill: string;
  voiceScore: number;
};

type ScoreOutput = {
  languages: string[];
  frameworks: string[];
  libraries: string[];
  primaryStack: string[];
  repoCount: number;
  commitCount: number;
  confidenceScore: number;
  combinedSummary: {
    githubScore: number;
    voiceScore: number;
    finalScore: number;
  };
  skillsDetected: Array<{
    skill: string;
    score: number;
    codeScore: number;
    voiceScore: number;
    finalScore: number;
    verified: boolean;
    evidenceCount: number;
  }>;
};

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
const round = (value: number) => Math.round(value);

export const buildSkillProfile = (
  repositories: RepoSkillSignal[],
  voiceScores: VoiceSkillScore[],
  aggregateTechnologies: {
    languages: string[];
    frameworks: string[];
    libraries: string[];
  },
): ScoreOutput => {
  const repoCount = repositories.length;
  const commitCount = repositories.reduce((total, repository) => total + repository.commits, 0);

  const skillUsage = new Map<string, { repoCount: number; dependencyCount: number; commitWeight: number }>();

  for (const repository of repositories) {
    const uniqueSkills = new Set(repository.skills);
    for (const skill of uniqueSkills) {
      const current = skillUsage.get(skill) ?? { repoCount: 0, dependencyCount: 0, commitWeight: 0 };
      current.repoCount += 1;
      current.dependencyCount += repository.dependencyMatches.filter((match) => normalize(skill).includes(normalize(match)) || normalize(match).includes(normalize(skill))).length || 1;
      current.commitWeight += repository.commits;
      skillUsage.set(skill, current);
    }
  }

  const maxDependencyCount = Math.max(1, ...Array.from(skillUsage.values()).map((entry) => entry.dependencyCount));
  const maxCommitWeight = Math.max(1, ...Array.from(skillUsage.values()).map((entry) => entry.commitWeight));
  const voiceLookup = new Map(voiceScores.map((entry) => [normalize(entry.skill), entry.voiceScore]));

  const skillsDetected = Array.from(skillUsage.entries())
    .map(([skill, entry]) => {
      const repoPresenceScore = repoCount === 0 ? 0 : (entry.repoCount / repoCount) * 100;
      const dependencyUsageScore = (entry.dependencyCount / maxDependencyCount) * 100;
      const commitFrequencyScore = (entry.commitWeight / maxCommitWeight) * 100;
      const codeScore = round(repoPresenceScore * 0.4 + dependencyUsageScore * 0.35 + commitFrequencyScore * 0.25);
      const voiceScore = round(voiceLookup.get(normalize(skill)) ?? 0);
      const finalScore = voiceScore > 0 ? round(codeScore * 0.6 + voiceScore * 0.4) : codeScore;

      return {
        skill,
        score: finalScore,
        codeScore,
        voiceScore,
        finalScore,
        verified: finalScore >= 70,
        evidenceCount: entry.repoCount,
      };
    })
    .sort((left, right) => right.finalScore - left.finalScore)
    .slice(0, 12);

  const averageGithubScore = skillsDetected.length
    ? round(skillsDetected.reduce((total, skill) => total + skill.codeScore, 0) / skillsDetected.length)
    : 0;
  const nonZeroVoice = skillsDetected.filter((skill) => skill.voiceScore > 0);
  const averageVoiceScore = nonZeroVoice.length
    ? round(nonZeroVoice.reduce((total, skill) => total + skill.voiceScore, 0) / nonZeroVoice.length)
    : 0;
  const finalScore = averageVoiceScore > 0
    ? round(averageGithubScore * 0.6 + averageVoiceScore * 0.4)
    : averageGithubScore;

  const confidenceScore = round(
    Math.min(
      100,
      repoCount * 4 + Math.min(40, aggregateTechnologies.frameworks.length * 8) + Math.min(20, skillsDetected.length * 3),
    ),
  );

  const primaryStack = [
    ...aggregateTechnologies.frameworks.slice(0, 3),
    ...aggregateTechnologies.languages.slice(0, 2),
  ].slice(0, 4);

  return {
    languages: aggregateTechnologies.languages,
    frameworks: aggregateTechnologies.frameworks,
    libraries: aggregateTechnologies.libraries,
    primaryStack,
    repoCount,
    commitCount,
    confidenceScore,
    combinedSummary: {
      githubScore: averageGithubScore,
      voiceScore: averageVoiceScore,
      finalScore,
    },
    skillsDetected,
  };
};
