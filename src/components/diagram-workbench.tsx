'use client';

import { useEffect, useRef, useState } from 'preact/hooks';
import { mountDiagramApp } from '@takazudo/zudo-diagram-gen/client/mount';
import '@takazudo/zudo-diagram-gen/client/app.css';
import type { GalleryData } from '@takazudo/zudo-diagram-gen';

type Status = 'loading' | 'ready' | 'error';

export default function DiagramWorkbench({ dataUrl }: { dataUrl: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    const controller = new AbortController();
    let dispose: (() => void) | undefined;
    setStatus('loading');

    async function load() {
      try {
        const response = await fetch(dataUrl, { signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as GalleryData;
        if (controller.signal.aborted || !root.current) return;
        dispose = mountDiagramApp(root.current, data, { embedded: true });
        setStatus('ready');
      } catch {
        if (!controller.signal.aborted) setStatus('error');
      }
    }

    void load();
    return () => {
      controller.abort();
      dispose?.();
    };
  }, [dataUrl]);

  return (
    <div>
      {status === 'loading' && <p role="status">Loading diagram workbench…</p>}
      {status === 'error' && (
        <p role="alert">The diagram workbench could not load. Please reload the page.</p>
      )}
      <div ref={root} />
    </div>
  );
}
