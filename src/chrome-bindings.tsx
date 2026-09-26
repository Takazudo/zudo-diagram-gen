import { Island } from '@takazudo/zfb';
import { defineChromeBindings } from '@takazudo/zudo-doc/chrome-bindings';
import DiagramWorkbench from './components/diagram-workbench';

export const chromeBindings = defineChromeBindings({
  mdxExtras: {
    DiagramWorkbench: ({ dataUrl }: { dataUrl: string }) =>
      Island({ when: 'visible', children: <DiagramWorkbench dataUrl={dataUrl} /> }),
  },
});
