export interface Candidate {
  id: string;
  roundId: string;
  title: string;
  toneId: string;
  description: string;
  order: number;
  parentCandidateId: string | null;
  sourcePath: string;
  assets: { light: string; dark?: string };
  fingerprint: string;
}
export interface GalleryData {
  schemaVersion: 1;
  kind: 'session' | 'catalog';
  session: {
    schemaVersion: 1;
    id: string;
    title: string;
    description?: string;
    project?: { name: string; reference?: string };
    target: { width: number; height: number; label?: string };
    context?: { title: string; body: string };
    toneCollectionVersion?: string;
  };
  brief: string;
  rounds: Array<{
    id: string;
    title: string;
    description?: string;
    order: number;
    baselineCandidateId?: string | null;
  }>;
  candidates: Candidate[];
  tones?: Tone[];
  contentHash: string;
}
export interface Tone {
  id: string;
  number: number;
  name: string;
  family: string;
  summary: string;
  recipe: string[];
  goodFor: string[];
  smallSizeNotes: string;
  referenceFiles: { light: string; dark: string };
  sourceReferences?: Array<{ title: string; url: string }>;
}
export interface ValidationSummary {
  rounds: number;
  candidates: number;
  lightAssets: number;
  darkAssets: number;
}
export class SessionValidationError extends Error {
  errors: string[];
  warnings: string[];
}
export function loadSession(root: string): Promise<GalleryData>;
export function validateSession(
  root: string,
): Promise<{ ok: boolean; errors: string[]; warnings: string[]; summary: ValidationSummary }>;
export function loadToneCatalog(): Promise<GalleryData>;
export function exportCandidate(
  root: string,
  candidateId: string,
  options: { theme?: 'light' | 'dark'; output: string },
): Promise<{
  candidateId: string;
  theme: 'light' | 'dark';
  output: string;
  bytes: number;
  fingerprint: string;
}>;
export function renderGallery(data: GalleryData, options?: Record<string, string>): Promise<string>;
export function renderZfbGallery(
  data: GalleryData,
  options?: Record<string, string>,
): Promise<string>;
export function createPageSource(
  data: GalleryData,
  options?: Record<string, string>,
  zfbMajor?: 2 | 3,
): Promise<string>;

export interface ProjectDiagnostic {
  code: string;
  message: string;
  path: string;
  sessionId?: string;
}
export interface ProjectManifest {
  schemaVersion: 1;
  id: string;
  title: string;
  sessions: Array<{ id: string; path: string; order: number; placement?: string }>;
  comparisonSets: Array<{
    id: string;
    title: string;
    toneId: string;
    entries: Array<{ sessionId: string; candidateId: string; fingerprint: string }>;
  }>;
  style?: { revision: string; path: string; hash: string };
}
export interface ProjectSession {
  id: string;
  path: string;
  status: 'valid' | 'invalid' | 'missing' | 'stale';
  data: GalleryData | null;
  diagnostics: ProjectDiagnostic[];
  observedHash?: string;
}
export interface ProjectData {
  kind: 'project';
  schemaVersion: 1;
  project: ProjectManifest;
  sessions: ProjectSession[];
  comparisonSets: Array<
    ProjectManifest['comparisonSets'][number] & {
      entries: Array<
        ProjectManifest['comparisonSets'][number]['entries'][number] & {
          status: 'valid' | 'invalid' | 'stale';
          availableThemes: string[];
        }
      >;
      ok: boolean;
      diagnostics: ProjectDiagnostic[];
    }
  >;
  diagnostics: ProjectDiagnostic[];
  ok: boolean;
  contentHash: string;
}
export class ProjectValidationError extends Error {
  diagnostics: ProjectDiagnostic[];
  errors: string[];
}
export function loadProject(
  root: string,
  options?: {
    strict?: boolean;
    lastValid?: Map<string, { path: string; data: GalleryData }>;
  },
): Promise<ProjectData>;
export function loadContent(
  root: string,
  options?: Parameters<typeof loadProject>[1],
): Promise<GalleryData | ProjectData>;
export function validateProject(root: string): Promise<{
  ok: boolean;
  errors: string[];
  warnings: string[];
  diagnostics: ProjectDiagnostic[];
  summary: { sessions: number; validSessions: number; comparisonSets: number };
}>;
export function createProject(options?: {
  destination?: string;
  cwd?: string;
  name?: string;
  enginePackage?: string;
  install?: boolean;
  project?: boolean;
  brief?: string;
  sessions?: Array<{
    slug: string;
    id?: string;
    title?: string;
    target?: GalleryData['session']['target'];
  }>;
}): Promise<{
  directory: string;
  name: string;
  sessionId?: string;
  projectId?: string;
  title: string;
  installed: boolean;
  files: string[];
}>;

export function adoptGeneratedRoutes(
  root: string,
  options: { expectedHashes: Record<string, string> },
): Promise<{ routes: string[] }>;
