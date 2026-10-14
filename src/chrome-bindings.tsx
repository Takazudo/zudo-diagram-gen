import { Island } from '@takazudo/zfb';
import { defineChromeBindings } from '@takazudo/zudo-doc/chrome-bindings';
import DiagramWorkbench from './components/diagram-workbench';
import sidebars from './sidebars';

export const chromeBindings = defineChromeBindings({
  sidebarsConfig: sidebars,
  mdxExtras: {
    DiagramWorkbench: ({ dataUrl }: { dataUrl: unknown }) => {
      if (typeof dataUrl !== 'string') throw new Error('DiagramWorkbench requires a dataUrl');
      return Island({ when: 'visible', children: <DiagramWorkbench dataUrl={dataUrl} /> });
    },
  },
});
