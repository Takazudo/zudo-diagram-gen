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
