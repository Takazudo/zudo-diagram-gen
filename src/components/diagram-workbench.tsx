'use client';

import { computed, getScope, Show, signal, type Ref } from '@takazudo/zfb/zudo-react';
import { mountDiagramApp } from '@takazudo/zudo-diagram-gen/client/mount';
import '@takazudo/zudo-diagram-gen/client/app.css';
import type { GalleryData } from '@takazudo/zudo-diagram-gen';

type Status = 'loading' | 'ready' | 'error';

export default function DiagramWorkbench({ dataUrl }: { dataUrl: string }) {
  const root: Ref<HTMLDivElement> = { current: null };
  const status = signal<Status>('loading');

  getScope().onActivate(() => {
    const controller = new AbortController();
    let dispose: (() => void) | undefined;
    status.value = 'loading';

    async function load() {
      try {
        const response = await fetch(dataUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as GalleryData;
        if (controller.signal.aborted || !root.current) return;
        dispose = mountDiagramApp(root.current, data, { embedded: true });
        status.value = 'ready';
      } catch {
        if (!controller.signal.aborted) status.value = 'error';
      }
    }

    void load();
    return () => {
      controller.abort();
      dispose?.();
    };
  });

  return (
    <div>
      <Show when={computed(() => status.value === 'loading')}>
        {() => <p role="status">Loading diagram workbench…</p>}
      </Show>
      <Show when={computed(() => status.value === 'error')}>
        {() => <p role="alert">The diagram workbench could not load. Please reload the page.</p>}
      </Show>
      <div ref={root} />
    </div>
  );
}
