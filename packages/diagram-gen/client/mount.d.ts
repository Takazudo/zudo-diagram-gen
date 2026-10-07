import type { GalleryData, ProjectData, SessionReview } from '../src/index.mjs';

/** Mount the package-owned workbench in any element. Call the returned function before remounting. */
export function mountDiagramApp(
  root: HTMLElement,
  data: GalleryData,
  options?: { embedded?: boolean; history?: boolean; onReady?: (api: WorkbenchController) => void },
): () => void;

export interface WorkbenchController {
  getReview(): SessionReview;
  importReview(review: SessionReview): void;
  inspect(candidateId: string): void;
  setDisplay(options: {
    theme?: 'light' | 'dark';
    backdrop?: string;
    uiTheme?: 'light' | 'dark';
  }): void;
}
export function mountProjectApp(
  root: HTMLElement,
  data: ProjectData,
  options?: { embedded?: boolean },
): () => void;
