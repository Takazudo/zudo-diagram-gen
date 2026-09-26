import { defineConfig } from '@takazudo/zfb/config';
import { zudoDoc } from '@takazudo/zudo-doc/config';

export default defineConfig(zudoDoc({
  siteName: 'zudo-diagram-gen',
  siteDescription: 'Generate, compare, and refine SVG diagrams in a shared local workbench.',
  base: '/',
  port: 4488,
  favicon: 'auto',
  logo: false,
  mermaid: false,
  docHistory: false,
  designTokenPanel: false,
  assetViewer: false,
  strictContentBridge: true,
  dynamicPageTransition: false,
  colorScheme: 'Default Light',
  colorMode: {defaultMode: 'light',lightScheme:'Default Light',darkScheme:'Default Dark',respectPrefersColorScheme:false},
  headerNav: [
    {label:'Workbench',path:'/workbench',versioned:false},
    {label:'Tones',path:'/tones',versioned:false},
    {label:'Examples',path:'/examples',versioned:false},
    {label:'Docs',path:'/docs/getting-started/introduction',versioned:false},
  ],
}));
