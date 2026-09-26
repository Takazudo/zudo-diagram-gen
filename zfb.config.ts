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
  headerRightItems: [{type:'component',component:'search'}],
  headerNav: [
    {label:'Docs',path:'/docs/getting-started',versioned:false,children:[
      {label:'Getting started',path:'/docs/getting-started',categoryMatch:'getting-started',versioned:false},
      {label:'Review',path:'/docs/gallery',categoryMatch:'gallery',versioned:false},
      {label:'Authoring',path:'/docs/authoring',categoryMatch:'authoring',versioned:false},
      {label:'Agent workflow',path:'/docs/agent-workflow',categoryMatch:'agent-workflow',versioned:false},
      {label:'Reference',path:'/docs/reference',categoryMatch:'reference',versioned:false},
      {label:'Development',path:'/docs/development',categoryMatch:'development',versioned:false},
    ]},
    {label:'Tones',path:'/tones',versioned:false},
    {label:'Examples',path:'/examples',versioned:false},
    {label:'Workbench',path:'/workbench',versioned:false},
  ],
}));
