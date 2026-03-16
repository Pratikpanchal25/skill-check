type FilePayload = {
  packageJson?: string | null;
  requirementsTxt?: string | null;
  goMod?: string | null;
  pomXml?: string | null;
};

type RepoLanguageMap = Record<string, number>;

type DependencySource = "package" | "python" | "go" | "java" | "language";

type TechnologyDescriptor = {
  label: string;
  kind: "framework" | "library" | "language" | "skill";
  aliases?: string[];
};

const dependencyTechnologyMap: Record<string, TechnologyDescriptor[]> = {
  express: [{ label: "Express.js", kind: "framework" }, { label: "Node.js", kind: "skill" }],
  react: [{ label: "React", kind: "framework" }, { label: "JavaScript", kind: "language" }],
  next: [{ label: "Next.js", kind: "framework" }, { label: "React", kind: "framework" }],
  mongoose: [{ label: "MongoDB", kind: "skill" }, { label: "Mongoose", kind: "library" }],
  mongodb: [{ label: "MongoDB", kind: "skill" }],
  redis: [{ label: "Redis", kind: "skill" }],
  tailwindcss: [{ label: "Tailwind CSS", kind: "library" }],
  '@reduxjs/toolkit': [{ label: "Redux Toolkit", kind: "library" }],
  redux: [{ label: "Redux", kind: "library" }],
  axios: [{ label: "REST APIs", kind: "skill" }, { label: "Axios", kind: "library" }],
  typescript: [{ label: "TypeScript", kind: "language" }],
  vite: [{ label: "Vite", kind: "tool" as never }],
  prisma: [{ label: "Prisma", kind: "library" }, { label: "SQL", kind: "skill" }],
  sequelize: [{ label: "SQL", kind: "skill" }, { label: "Sequelize", kind: "library" }],
  pg: [{ label: "PostgreSQL", kind: "skill" }],
  mysql: [{ label: "MySQL", kind: "skill" }],
  nestjs: [{ label: "NestJS", kind: "framework" }, { label: "Node.js", kind: "skill" }],
  fastify: [{ label: "Fastify", kind: "framework" }, { label: "Node.js", kind: "skill" }],
  docker: [{ label: "Docker", kind: "skill" }],
  'socket.io': [{ label: "Socket.IO", kind: "library" }, { label: "Real-time Systems", kind: "skill" }],
  graphql: [{ label: "GraphQL", kind: "skill" }],
  apollo: [{ label: "GraphQL", kind: "skill" }, { label: "Apollo", kind: "library" }],
  jest: [{ label: "Testing", kind: "skill" }, { label: "Jest", kind: "library" }],
  vitest: [{ label: "Testing", kind: "skill" }, { label: "Vitest", kind: "library" }],
  python: [{ label: "Python", kind: "language" }],
  django: [{ label: "Django", kind: "framework" }, { label: "Python", kind: "language" }],
  flask: [{ label: "Flask", kind: "framework" }, { label: "Python", kind: "language" }],
  fastapi: [{ label: "FastAPI", kind: "framework" }, { label: "Python", kind: "language" }],
  pandas: [{ label: "Pandas", kind: "library" }, { label: "Data Analysis", kind: "skill" }],
  numpy: [{ label: "NumPy", kind: "library" }],
  spring: [{ label: "Spring", kind: "framework" }, { label: "Java", kind: "language" }],
  'spring-boot': [{ label: "Spring Boot", kind: "framework" }, { label: "Java", kind: "language" }],
  gofiber: [{ label: "Go", kind: "language" }, { label: "Fiber", kind: "framework" }],
  gin: [{ label: "Go", kind: "language" }, { label: "Gin", kind: "framework" }],
};

const languageTechnologyMap: Record<string, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  go: "Go",
  html: "HTML",
  css: "CSS",
  shell: "Shell",
};

export type RepoAnalysis = {
  languages: string[];
  frameworks: string[];
  libraries: string[];
  skills: string[];
  dependencyMatches: string[];
  technologies: string[];
};

const normalizeName = (value: string) => value.trim().toLowerCase();

const collectFromDependencies = (
  dependencies: string[],
  frameworks: Set<string>,
  libraries: Set<string>,
  languages: Set<string>,
  skills: Set<string>,
  matches: Set<string>,
) => {
  for (const rawDependency of dependencies) {
    const dependency = normalizeName(rawDependency);
    const descriptors = dependencyTechnologyMap[dependency];
    if (!descriptors) continue;

    matches.add(dependency);

    for (const descriptor of descriptors) {
      if (descriptor.kind === "framework") frameworks.add(descriptor.label);
      if (descriptor.kind === "library") libraries.add(descriptor.label);
      if (descriptor.kind === "language") languages.add(descriptor.label);
      if (descriptor.kind === "skill") skills.add(descriptor.label);
    }
  }
};

const parsePackageJson = (content?: string | null): string[] => {
  if (!content) return [];

  try {
    const parsed = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };

    return [
      ...Object.keys(parsed.dependencies ?? {}),
      ...Object.keys(parsed.devDependencies ?? {}),
      ...Object.keys(parsed.peerDependencies ?? {}),
      ...Object.keys(parsed.optionalDependencies ?? {}),
    ];
  } catch {
    return [];
  }
};

const parseRequirements = (content?: string | null): string[] => {
  if (!content) return [];

  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.split(/[<>=!~]/)[0].trim())
    .filter(Boolean);
};

const parseGoMod = (content?: string | null): string[] => {
  if (!content) return [];
  const matches = content.match(/^[ \t]*[a-zA-Z0-9./_-]+/gm) ?? [];
  return matches
    .map((line) => line.trim())
    .filter((line) => line.includes("/"))
    .map((line) => line.split("/").pop() ?? line);
};

const parsePomXml = (content?: string | null): string[] => {
  if (!content) return [];
  const matches = Array.from(content.matchAll(/<artifactId>([^<]+)<\/artifactId>/g));
  return matches.map((match) => match[1].trim()).filter(Boolean);
};

export const analyzeRepository = (files: FilePayload, repoLanguages: RepoLanguageMap): RepoAnalysis => {
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const libraries = new Set<string>();
  const skills = new Set<string>();
  const dependencyMatches = new Set<string>();

  for (const language of Object.keys(repoLanguages)) {
    const label = languageTechnologyMap[normalizeName(language)];
    if (label) languages.add(label);
  }

  const packageDependencies = parsePackageJson(files.packageJson);
  const pythonDependencies = parseRequirements(files.requirementsTxt);
  const goDependencies = parseGoMod(files.goMod);
  const javaDependencies = parsePomXml(files.pomXml);

  collectFromDependencies(packageDependencies, frameworks, libraries, languages, skills, dependencyMatches);
  collectFromDependencies(pythonDependencies, frameworks, libraries, languages, skills, dependencyMatches);
  collectFromDependencies(goDependencies, frameworks, libraries, languages, skills, dependencyMatches);
  collectFromDependencies(javaDependencies, frameworks, libraries, languages, skills, dependencyMatches);

  for (const framework of frameworks) {
    skills.add(framework);
  }
  for (const language of languages) {
    skills.add(language);
  }

  const technologies = Array.from(new Set([...languages, ...frameworks, ...libraries, ...skills]));

  return {
    languages: Array.from(languages),
    frameworks: Array.from(frameworks),
    libraries: Array.from(libraries),
    skills: Array.from(skills),
    dependencyMatches: Array.from(dependencyMatches),
    technologies,
  };
};
