export interface Candidate {
  id: string; roundId: string; title: string; toneId: string; description: string;
  order: number; parentCandidateId: string | null; sourcePath: string;
  assets: { light: string; dark?: string }; fingerprint: string;
}
export interface GalleryData {
  schemaVersion: 1; kind: 'session' | 'catalog';
  session: { schemaVersion: 1; id: string; title: string; description?: string; project?: { name: string; reference?: string }; target: { width: number; height: number; label?: string }; context?: { title: string; body: string }; toneCollectionVersion?: string };
  brief: string;
  rounds: Array<{ id: string; title: string; description?: string; order: number; baselineCandidateId?: string | null }>;
  candidates: Candidate[]; tones?: Tone[]; contentHash: string;
}
export interface Tone {id:string;number:number;name:string;family:string;summary:string;recipe:string[];goodFor:string[];smallSizeNotes:string;referenceFiles:{light:string;dark:string};sourceReferences?:Array<{title:string;url:string}>}
export interface ValidationSummary {rounds:number;candidates:number;lightAssets:number;darkAssets:number}
export class SessionValidationError extends Error { errors:string[]; warnings:string[]; }
export function loadSession(root: string): Promise<GalleryData>;
export function validateSession(root: string): Promise<{ ok: boolean; errors: string[]; warnings: string[]; summary: ValidationSummary }>;
export function loadToneCatalog(): Promise<GalleryData>;
export function exportCandidate(root: string, candidateId: string, options: {theme?: 'light' | 'dark'; output: string}): Promise<{candidateId:string;theme:'light'|'dark';output:string;bytes:number;fingerprint:string}>;
export function renderGallery(data: GalleryData, options?: Record<string, string>): Promise<string>;
export function renderZfbGallery(data: GalleryData, options?: Record<string, string>): Promise<string>;
export function createPageSource(data: GalleryData, options?: Record<string, string>): Promise<string>;
