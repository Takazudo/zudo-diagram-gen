import type {
  ToneResourceContext,
  BundledReference,
  RecipeNumericReference,
  ToneContextOptions,
} from './tone-context.js';
export * from './tone-context.js';
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
  placement?: PlacementDescriptor;
  placementHash?: string;
  placementImages?: Array<{ url: string; x: number; y: number; width: number; height: number }>;
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
  toneRevision?: string;
  scheme?: string;
  kit?: string;
  bundledReferences?: BundledReference[];
  recipeNumericReferences?: RecipeNumericReference[];
  context: ToneResourceContext;
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
export function loadToneCatalog(options?: ToneContextOptions): Promise<GalleryData>;
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
export function renderGallery(
  data: GalleryData | ProjectData,
  options?: Record<string, string | boolean>,
): Promise<string>;
export function renderZfbGallery(
  data: GalleryData | ProjectData,
  options?: Record<string, string | boolean>,
): Promise<string>;
export function createPageSource(
  data: GalleryData | ProjectData,
  options?: Record<string, string | boolean>,
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

export interface PlacementDescriptor {
  schemaVersion: 1;
  frame: { width: number; height: number; background: string };
  slot: { x: number; y: number; width: number; height: number };
  fit: 'contain';
  fonts?: string[];
  context?: { title: string; body: string };
  images?: Array<{ path: string; x: number; y: number; width: number; height: number }>;
}
export interface CaptureOptions {
  resourceRoot?: string;
  placement?: string | PlacementDescriptor;
  theme?: 'light' | 'dark';
  output: string;
  dpr?: number;
  crop?: 'frame' | 'slot';
  timeoutMs?: number;
  browserExecutablePath?: string;
  force?: boolean;
  signal?: AbortSignal;
}
export interface CaptureProvenance {
  schemaVersion: 1;
  sessionId: string;
  candidateId: string;
  fingerprint: string;
  assetHash: string;
  styleHash: string | null;
  placementHash: string;
  theme: 'light' | 'dark';
  crop: 'frame' | 'slot';
  frame: PlacementDescriptor['frame'];
  slot: PlacementDescriptor['slot'];
  dpr: number;
  pixelDimensions: { width: number; height: number };
  viewport: { width: number; height: number };
  browser: { name: string; version: string; systemExecutable: boolean };
  environment: { os: string; fonts: Array<{ family: string; ready: boolean; generic: boolean }> };
  referenceImages: Array<{ path: string; hash: string }>;
  imageHash: string;
  captureHash: string;
  capturedAt: string;
  inspected: false;
  limitations: string[];
}
export function captureCandidate(
  root: string,
  candidateId: string,
  options: CaptureOptions,
): Promise<{ output: string; sidecar: string; provenance: CaptureProvenance }>;
export function validatePlacement(
  value: PlacementDescriptor | undefined,
  target: { width: number; height: number },
  theme?: 'light' | 'dark',
): PlacementDescriptor;
export function renderPlacement(
  placement: PlacementDescriptor,
  options?: {
    svgUrl?: string;
    title?: string;
    images?: Array<{ url: string; x: number; y: number; width: number; height: number }>;
  },
): string;
export function loadPlacement(
  root: string,
  target: { width: number; height: number },
  options?: { placement?: string | PlacementDescriptor; theme?: 'light' | 'dark' },
): Promise<{
  descriptor: PlacementDescriptor;
  images: Array<{
    path: string;
    x: number;
    y: number;
    width: number;
    height: number;
    url: string;
    hash: string;
    file: string;
  }>;
  inputBytes: number;
  placementFile?: string;
  placementHash: string;
  imageHashes: Array<{ path: string; hash: string }>;
}>;
export class CaptureError extends Error {
  code: string;
  constructor(code: string, message: string);
}

export function portablePlacement(loaded: Awaited<ReturnType<typeof loadPlacement>>): {
  placement: PlacementDescriptor;
  placementImages: Array<{
    path: string;
    x: number;
    y: number;
    width: number;
    height: number;
    url: string;
    hash: string;
  }>;
  placementHash: string;
};

export function exportHtml(
  root: string,
  options: { output: string; force?: boolean },
): Promise<{
  kind: string;
  output: string;
  bytes: number;
  candidates: number;
  ok: boolean;
  diagnostics: ProjectDiagnostic[];
}>;

export interface ReviewCandidate {
  id: string;
  fingerprint: string;
  roundId?: string;
  title?: string;
  toneId?: string;
  sourcePath?: string;
  currentFingerprint?: string;
  stale?: boolean;
}
export interface ReviewFeedback {
  keep: string;
  change: string;
  action: 'refine' | 'integrate' | 'explore';
}
export interface SessionReview {
  schemaVersion: 1;
  type: 'zudo-diagram-review';
  sessionId: string;
  sessionTitle?: string;
  sessionContentHash?: string;
  exportedAt?: string;
  reviewedCandidate?: ReviewCandidate | null;
  chosenDirection?: ReviewCandidate | null;
  shortlist: ReviewCandidate[];
  feedback?: ReviewFeedback | null;
  records: Array<ReviewCandidate & ReviewFeedback & { updatedAt?: string | null }>;
}
export interface ProjectReview {
  schemaVersion: 1;
  type: 'zudo-diagram-project-review';
  projectId: string;
  sessions: SessionReview[];
}
