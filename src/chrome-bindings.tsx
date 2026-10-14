import { Island } from '@takazudo/zfb';
import { defineChromeBindings } from '@takazudo/zudo-doc/chrome-bindings';
import DiagramWorkbench from './components/diagram-workbench';

export const chromeBindings = defineChromeBindings({
  mdxExtras: {
    DiagramWorkbench: ({ dataUrl }) => {
      if (typeof dataUrl !== 'string') throw new Error('DiagramWorkbench requires a dataUrl');
      return Island({ when: 'visible', children: <DiagramWorkbench dataUrl={dataUrl} /> });
    },
  },
});
