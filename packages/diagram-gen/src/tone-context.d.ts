export type PaletteRole = 'ink' | 'surface' | 'border' | 'accent' | 'deep' | 'warning';
export type KitPrimitive =
  'person' | 'pin' | 'slot-card' | 'empty-seat' | 'arrow' | 'check' | 'clock';
export interface Palette {
  light: Record<PaletteRole, string>;
  dark: Record<PaletteRole, string>;
}
export interface TypographyRole {
  fontFamily: string;
  fontSize: number;
  minCssPx: number;
  fontWeight: number;
}
export interface ToneScheme {
  schemaVersion: 1;
  toneId: string;
  toneRevision: string;
  collectionVersion: string;
  coordinateSystem: { viewBox: [number, number, number, number]; units: 'svg-user-units' };
  geometry: {
    strokeWidths: Record<string, number>;
    radii: Record<string, number>;
    fills: Record<string, PaletteRole>;
    opacities: Record<string, number>;
    layers: Record<string, { dx: number; dy: number; opacity: number }>;
  };
  palette: Palette;
  typography: Record<string, TypographyRole>;
  texture: { kind: string; seed: number; amplitude: number; frequency: number };
  composition: Record<'arrows' | 'people' | 'empty' | 'pending' | 'emphasis' | 'warning', string>;
  rules: Record<'required' | 'preferred' | 'flexible', Array<{ id: string; description: string }>>;
  primitiveAlternatives?: Partial<Record<KitPrimitive, string>>;
}
export interface BundledReference {
  id: string;
  title: string;
  path: string;
  required: boolean;
}
export interface RecipeNumericReference {
  recipeIndex: number;
  path: string;
  value: number;
}
export interface ToneContextOptions {
  toneRoot?: string;
  requireComplete?: boolean;
}
export interface ToneResourceContext {
  contextVersion: 1;
  capabilities: { scheme: boolean; kit: boolean };
  bundledReferences: Array<
    BundledReference & {
      status: 'resolved' | 'missing';
      content: string | null;
      hash: string | null;
    }
  >;
  scheme: ToneScheme | null;
  kit: {
    path: string;
    text: string;
    primitives: Array<{ id: string; viewBox: [number, number, number, number] }>;
  } | null;
  recipe: string[];
  recipeDocument: { path: string; text: string; template: string; hash: string };
  source: { path: string; text: string; hash: string };
  numericSummary: Array<{ path: string; value: number }>;
  hashes: {
    schemeHash: string | null;
    kitHash: string | null;
    bundledReferenceHashes: Array<{ id: string; hash: string | null }>;
    contextHash: string;
  };
  diagnostics: Array<{ code: string; message: string; path?: string }>;
  validation: { structure: true; descriptiveRules: 'not-evaluated'; readability: 'not-evaluated' };
}
export type ResolvedToneContext = Omit<
  import('./index.js').Tone,
  'context' | 'scheme' | 'kit' | 'bundledReferences'
> &
  ToneResourceContext & { examples: { light: string; dark?: string } };
export const PALETTE_ROLES: readonly PaletteRole[];
export const KIT_PRIMITIVES: readonly KitPrimitive[];
export function canonicalJson(value: unknown): string;
export function canonicalHash(value: unknown): string;
export function hashBytes(value: string | Uint8Array): string;
export function validateToneScheme(
  scheme: unknown,
  identity?: { toneId?: string; collectionVersion?: string },
): ToneScheme;
export function validatePalette(palette: unknown): Palette;
export function renderSchemeRecipe(template: string, scheme: ToneScheme): string;
export function schemeNumericSummary(scheme: ToneScheme): Array<{ path: string; value: number }>;
export function checkRecipeNumericReferences(
  recipe: string[],
  scheme: ToneScheme,
  references?: RecipeNumericReference[],
): true;
export function checkNominalTypography(
  scheme: ToneScheme,
  slot: { width: number; height: number },
): {
  scale: number;
  roles: Array<{ role: string; cssPx: number; minCssPx: number; meetsMinimum: boolean }>;
  validation: 'nominal-contain-scale';
  limitations: string[];
};
export function resolveToneContext(
  toneId: string,
  options?: ToneContextOptions,
): Promise<ResolvedToneContext>;
export function toneContextStatus(
  previousHash: string | null | undefined,
  context: ToneResourceContext,
): 'unknown' | 'current' | 'stale';

export function checkMachineRecipe(
  text: string,
  scheme: ToneScheme,
  bindings?: Array<{ path: string; value: number }>,
): string;
