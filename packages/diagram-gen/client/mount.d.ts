import type { GalleryData } from '../src/index.mjs';

/** Mount the package-owned workbench in any element. Call the returned function before remounting. */
export function mountDiagramApp(
  root: HTMLElement,
  data: GalleryData,
  options?: { embedded?: boolean },
): () => void;
