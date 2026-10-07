#!/usr/bin/env python3
"""Rebuild the bundled tone references and demonstration sessions.

python scripts/import-tones.py
python scripts/import-tones.py --atlas-dir /path/to/diagram-tone-work
python scripts/import-tones.py --out /tmp/rebuilt-zudo-diagram-gen

Without --atlas-dir, uses the bundled SVGs as canonical inputs; no network is
needed. With --atlas-dir, imports the original atlas's source and preflattened
light/dark exports. The original atlas is optional, not a runtime dependency.
This intentionally rewrites GENERATED DEMONSTRATION metadata and examples.
Never run it against a real user session or treat its sample review as approval.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path
import shutil
import re
import xml.etree.ElementTree as ET

VERSION = "0.1.0"
ROOT = Path(__file__).resolve().parents[1]

TONES = [{'id': '01',
  'slug': 'fine-outline',
  'name': 'Fine outline',
  'family': 'Quiet',
  'description': 'Fine continuous outlines, open surfaces, a single filled teaching point.',
  'bestFor': 'Small help dialogs; quiet documentation.',
  'limitation': 'Thin strokes need checking at the final display size.'},
 {'id': '02',
  'slug': 'soft-fill',
  'name': 'Soft fill',
  'family': 'Quiet',
  'description': 'Large gentle shapes, generous rounding, almost no perimeter strokes.',
  'bestFor': 'Approachable onboarding and consumer apps.',
  'limitation': 'Large soft forms can feel out of place in square technical UIs.'},
 {'id': '03',
  'slug': 'ink-silhouette',
  'name': 'Ink silhouette',
  'family': 'Quiet',
  'description': 'Solid one-ink forms with reversed content and clear negative space.',
  'bestFor': 'Compact spots and monochrome documentation.',
  'limitation': 'High visual weight competes with dense explanatory copy.'},
 {'id': '04',
  'slug': 'offset-blocks',
  'name': 'Offset blocks',
  'family': 'Quiet',
  'description': 'Hard square geometry, thick keylines, flat offset shadows.',
  'bestFor': 'Expressive utilities, creative tool onboarding.',
  'limitation': 'Avoid shadows in projects whose design rules disallow them.'},
 {'id': '05',
  'slug': 'editorial-serif',
  'name': 'Editorial serif',
  'family': 'Editorial & UI',
  'description': 'Oversized serif letters, restrained rules, typographic composition.',
  'bestFor': 'Writing products and editorial feature introductions.',
  'limitation': 'Treat the serif typography as a deliberate family choice.'},
 {'id': '06',
  'slug': 'swiss-grid',
  'name': 'Swiss grid',
  'family': 'Editorial & UI',
  'description': 'Strict alignment, numerical rhythm, strong accent fields and plain type.',
  'bestFor': 'Instruction sequences and structured manuals.',
  'limitation': 'Expressive accent fields need discipline beside neutral UI.'},
 {'id': '07',
  'slug': 'ui-miniature',
  'name': 'UI miniature',
  'family': 'Editorial & UI',
  'description': 'Reduced application chrome, readable layer rows, one emphasized result.',
  'bestFor': 'In-app help closely tied to recognizable interface structure.',
  'limitation': 'A conceptual reconstruction; it is not a screenshot or exact control map.'},
 {'id': '08',
  'slug': 'contour-wash',
  'name': 'Contour + wash',
  'family': 'Editorial & UI',
  'description': 'Precise contour lines with soft translucent color fields.',
  'bestFor': 'Friendly help art with more personality than pure wireframes.',
  'limitation': 'Keep washes subordinate to the relationship being explained.'},
 {'id': '09',
  'slug': 'technical-blueprint',
  'name': 'Technical blueprint',
  'family': 'Spatial',
  'description': 'A precise drafting grid, fine orthogonal connectors, registration crosses, and '
                 'measurement leaders make the composition read as an engineered construction.',
  'bestFor': 'Layer relationships, export settings, technical workflows, and documentation with an '
             'engineering character.',
  'limitation': 'Fine lines and grid detail need generous display size; the intrinsic dark surface '
                'is a strong visual commitment.'},
 {'id': '10',
  'slug': 'isometric-wire',
  'name': 'Isometric wire',
  'family': 'Spatial',
  'description': 'Thin open contours describe projected planes. Dashed construction lines, '
                 'repeated wire grids, and an orange registration edge reveal the layer geometry '
                 'without solid volumes.',
  'bestFor': 'Explaining layers, composition, coordinate systems, or how independent inputs '
             'combine.',
  'limitation': 'Perspective makes long text less legible; use brief labels and reserve it for '
                'structural explanations.'},
 {'id': '11',
  'slug': 'isometric-solid',
  'name': 'Isometric solid',
  'family': 'Spatial',
  'description': 'Opaque extruded tiles, clearly separated facet colors, hard cast shadows, and '
                 'bold circular pattern pieces turn inputs and outputs into tangible objects.',
  'bestFor': 'Product onboarding, approachable feature explanations, and illustrations that need '
             'visual weight.',
  'limitation': 'Solid volume can dominate compact dialogs; detailed text or dense processes '
                'become bulky.'},
 {'id': '12',
  'slug': 'paper-layers',
  'name': 'Paper layers',
  'family': 'Spatial',
  'description': 'Overlapping off-white sheets, slight rotations, cut-paper motifs, and small '
                 'offset shadows make the layer composition feel physical and easy to grasp.',
  'bestFor': 'Composition tools, content assembly, creative onboarding, and calm editorial '
             'documentation.',
  'limitation': 'The paper metaphor carries a warm editorial personality and may conflict with '
                'highly technical interfaces.'},
 {'id': '13',
  'slug': 'pencil-notebook',
  'name': 'Pencil notebook',
  'family': 'Handmade',
  'description': 'A ruled notebook ground, light doubled contours, imperfect hatch strokes, and '
                 'quiet pencil arrows make a process feel like a clearly explained working sketch.',
  'bestFor': 'Friendly how-to notes, early concepts, tutorials, and informal explanations that '
             'benefit from a human hand.',
  'limitation': 'The low-contrast pencil character loses definition at small sizes and is '
                'unsuitable for dense technical diagrams.'},
 {'id': '14',
  'slug': 'marker-workshop',
  'name': 'Marker workshop',
  'family': 'Handmade',
  'description': 'Broad rounded marker lines, loose loop motifs, imperfect corners, and flat '
                 'highlighter swipes give the diagram a lively workshop character.',
  'bestFor': 'Short onboarding moments, creative tools, workshop guides, and playful help '
             'illustrations.',
  'limitation': 'Bold marks are intentionally loud; they can overwhelm formal documentation or '
                'closely spaced diagrams.'},
 {'id': '15',
  'slug': 'chalkboard',
  'name': 'Chalkboard',
  'family': 'Handmade',
  'description': 'Dry broken strokes, chalk dust, soft secondary contours, and warm chalk accents '
                 'present the relationship as a compact blackboard lesson.',
  'bestFor': 'Learning-oriented explanations, conceptual walkthroughs, and a teacher-like voice in '
             'help content.',
  'limitation': 'The intrinsic dark board is prominent and chalk detail can become noisy in small '
                'dialog illustrations.'},
 {'id': '16',
  'slug': 'risograph-duo',
  'name': 'Risograph duo',
  'family': 'Handmade',
  'description': 'Two offset spot colors, visible overprint, broad circular motifs, and sparse '
                 'print grain give the diagram a small-edition risograph character.',
  'bestFor': 'Creative applications, brand-rich guides, editorial help pages, and memorable '
             'explanatory spot illustrations.',
  'limitation': 'Registration offsets and print grain reduce precision; avoid fine UI reproduction '
                'or charts requiring exact color discrimination.'},
 {'id': '17',
  'slug': 'cut-paper',
  'name': 'Cut paper',
  'family': 'Print & playful',
  'description': 'Irregular cut silhouettes, offset paper edges, flat organic color fields, and a '
                 'pasted text layer. Connectors feel cut by hand while keeping their direction '
                 'explicit.',
  'bestFor': 'Friendly onboarding, creative-tool tutorials, warm editorial help pages.',
  'limitation': 'Organic edges suit short conceptual explanations; large dense technical graphs '
                'need a simpler companion tone.'},
 {'id': '18',
  'slug': 'halftone-manual',
  'name': 'Halftone manual',
  'family': 'Print & playful',
  'description': 'Monochrome technical-print language: firm dark keylines, visible dot screens, '
                 'diagonal hatching, and knockout lettering. Texture is confined to meaningful '
                 'picture areas.',
  'bestFor': 'Manuals, compact how-to illustrations, black-and-white export, print-oriented '
             'projects.',
  'limitation': 'Dot screens can produce moire when rasterized very small; keep the vector or '
                'export at the intended display size.'},
 {'id': '19',
  'slug': 'pixel-schematic',
  'name': 'Pixel schematic',
  'family': 'Print & playful',
  'description': 'Stepped silhouettes, discrete grid blocks, hard raster-like edges, and chunky '
                 'directional glyphs. Large real text remains readable instead of imitating '
                 'microscopic pixels.',
  'bestFor': 'Playful utilities, game-adjacent tools, pixel-art editors, illustrated empty states.',
  'limitation': 'Use integer scaling when possible; the rigid grid intentionally sacrifices curved '
                'or delicate shapes.'},
 {'id': '20',
  'slug': 'terminal',
  'name': 'Terminal',
  'family': 'Print & playful',
  'description': 'Monospace lettering, corner-bracket frames, spare orthogonal geometry, and '
                 'phosphor colors on an inherently dark canvas. This is a vector diagram with '
                 'terminal character, not a block of ASCII art.',
  'bestFor': 'Developer utilities, technical onboarding, command-line-adjacent products, optional '
             'expert help.',
  'limitation': 'The dark terminal identity is deliberately strong and should be selected by the '
                'project rather than used as a universal default.'},
 {'id': '21',
  'slug': 'circuit-route',
  'name': 'Circuit route',
  'family': 'Systems & atmosphere',
  'description': 'Consistent right-angle paths, circular ports, solder-pad-like junctions, and a '
                 'restrained substrate palette. The routed paths describe the two input layers and '
                 'the single exported result.',
  'bestFor': 'Hardware-related tools, modular-system documentation, engineering-oriented software '
             'help.',
  'limitation': 'Decorative traces must remain visibly inside the artwork so they cannot be '
                'confused with the actual explanation paths.'},
 {'id': '22',
  'slug': 'transit-wayfinding',
  'name': 'Transit wayfinding',
  'family': 'Systems & atmosphere',
  'description': 'Thick routed lines, round station rings, clean transfer geometry, and bold '
                 'wayfinding labels. Two named source branches join before the combined poster and '
                 'one PNG destination.',
  'bestFor': 'Multi-step product help, navigation explanations, connected tools, process diagrams.',
  'limitation': 'Route colors need consistent meaning across a documentation set; do not add '
                'decorative branches that imply extra actions.'},
 {'id': '23',
  'slug': 'modular-geometric',
  'name': 'Modular geometric',
  'family': 'Systems & atmosphere',
  'description': 'A studio-style tile vocabulary of circles, quarter circles, blocks, and '
                 'deliberately open space. Simple convergence paths preserve the explanation while '
                 'the artwork carries the expressive geometry.',
  'bestFor': 'Creative tools, design systems, visual editors, minimal brand-led help centers.',
  'limitation': 'Abstract modules communicate concepts better than exact interface locations; pair '
                'with a screenshot when users must find a control.'},
 {'id': '24',
  'slug': 'luminous-glass',
  'name': 'Luminous glass',
  'family': 'Systems & atmosphere',
  'description': 'Translucent overlapping planes, restrained cyan-violet glow, luminous edges, and '
                 'generous dark space. The layers remain distinct before becoming a single visible '
                 'composition.',
  'bestFor': 'Large documentation openers, product concept explanations, hero-scale illustrations.',
  'limitation': 'Filters and translucency need larger rendering sizes; choose a simpler tone for '
                'tiny help dialogs or dense procedural diagrams.'}]

PROJECTS = [{'id': 'p-text',
  'project': 'zudo-text',
  'title': 'Split, then choose a component',
  'description': 'A quiet native UI miniature shows the existing Note Tray preserved on the left, '
                 'an Empty new frame on the right, and a component chooser. Splitting and '
                 'selecting a new component are presented as distinct steps.',
  'sourceUrls': ['https://github.com/zudolab/zudo-text/blob/02e127725ed3c384750d16e9e0428fa95c4d2ae8/manual/src/content/docs/basics/layout.mdx',
                 'https://github.com/zudolab/zudo-text/blob/02e127725ed3c384750d16e9e0428fa95c4d2ae8/packages/ui-components/src/tokens.css',
                 'https://github.com/zudolab/zudo-text/blob/02e127725ed3c384750d16e9e0428fa95c4d2ae8/tauri-app/renderer/data/help-catalog/illustrations/index.tsx',
                 'https://github.com/zudolab/zudo-text/blob/02e127725ed3c384750d16e9e0428fa95c4d2ae8/tauri-app/renderer/data/help-catalog/illustrations.css'],
  'styleFamily': 'Native UI miniature',
  'limitation': 'This is a conceptual help diagram, not a screenshot or an exact menu '
                'reproduction. The component picker is shortened to two valid examples. The '
                'depicted Empty state is the newly split frame; no note cloning occurs. No claim '
                'is made about which pointer or menu command invoked Split.',
  'tokenBasis': 'Exact inspected default light/dark theme fallback colors and 3px/4px radii from '
                'packages/ui-components/src/tokens.css; colors are not a newly invented brand '
                'palette. The illustration reads foreground, background, secondary surface, '
                'accent, and border as semantic variables.',
  'file': 'p-text.svg'},
 {'id': 'p-doc-cloud',
  'project': 'zudo-doc-cloud',
  'title': 'Collect two changes into a named draft',
  'description': 'A square neutral fine-line diagram compares Workbench before and after moving '
                 'selected changes A and B into Draft: Guide. Unselected change C remains on '
                 'Workbench, which continues to exist.',
  'sourceUrls': ['https://github.com/zudolab/zudo-doc-cloud/blob/0bafaf39a278580f2f3118f972833b89347453ba/doc/src/content/docs/spec/project-hierarchy.mdx',
                 'https://github.com/zudolab/zudo-doc-cloud/blob/0bafaf39a278580f2f3118f972833b89347453ba/packages/zudo-doc-cloud/src/features/drafts/collect-into-draft-dialog.tsx',
                 'https://github.com/zudolab/zudo-doc-cloud/blob/0bafaf39a278580f2f3118f972833b89347453ba/packages/zudo-doc-cloud/src/styles/tokens.css',
                 'https://github.com/zudolab/zudo-doc-cloud/blob/0bafaf39a278580f2f3118f972833b89347453ba/packages/zudo-doc-cloud/docs/adr/0012-square-design-system-and-palettes.md'],
  'styleFamily': 'Square neutral fine-line workflow',
  'limitation': 'A, B, and C are illustrative semantic change units, not whole pages or asset '
                'files. Guide is an invented example draft title. This successful Move example '
                'assumes no dependency expansion, blockers, or stale preview; it does not explain '
                'the optional Keep a copy on Workbench mode. The complete Workbench document is '
                'not visualized, only its changes.',
  'tokenBasis': 'Inspected Default palette OKLCH values from '
                'packages/zudo-doc-cloud/src/styles/tokens.css are numerically converted to '
                'nearest 8-bit sRGB for vector-renderer compatibility. Conversion is OKLCH to '
                'OKLab to linear sRGB, followed by the sRGB transfer function. Light '
                'bg/surface/fg/mild/muted: #f5f5f5/#ececec/#161616/#4a4a4a/#686868. Dark: '
                '#0b0b0c/#141415/#dedede/#a7a8a8/#8a8a8a. The 35% foreground + 65% background mix '
                'is computed in OKLCH before conversion: light (.7006657,0,0) gives #9e9e9e; dark '
                '(.4127331,.001378,286.141497) gives #4b4b4c. Its zero-chroma foreground hue is '
                'powerless. Hairline 12% foreground + transparent retains foreground RGB at alpha '
                '.12: rgba(22,22,22,.12) and rgba(222,222,222,.12). All exact input OKLCH mappings '
                'are retained in the SVG comment. Square geometry follows ADR 0012. Essential '
                'labels are enlarged to at least 26px for this prototype.',
  'file': 'p-doc-cloud.svg'},
 {'id': 'p-pattern',
  'project': 'zudo-pattern-gen',
  'title': 'Build a composition',
  'description': 'A pattern background and a text layer combine into one composed image. Square '
                 'source panels and a checkerboard text layer distinguish what is being combined.',
  'sourceUrls': ['https://github.com/zudolab/zudo-pattern-gen/blob/develop/manual/src/content/docs/composer/index.mdx',
                 'https://github.com/zudolab/zudo-pattern-gen/blob/develop/.claude/skills/l-design-system/SKILL.md',
                 'https://github.com/zudolab/zudo-pattern-gen/blob/develop/packages/pattern-gen-viewer/src/styles/tokens.css'],
  'styleFamily': 'Square layer anatomy',
  'limitation': 'A conceptual study with an invented sample pattern. It is not an exact '
                'screenshot, generator output, or app control map. Purple is a prototype palette '
                'choice, not a permanent pgen brand color.'},
 {'id': 'p-host',
  'project': 'zudo-ez-host',
  'title': 'Saving and publishing',
  'description': 'Three distinct domains: local folder, saved cloud checkpoint, and live site. '
                 'Separate Save and Publish arrows retain the explicit publication boundary.',
  'sourceUrls': ['https://github.com/zudolab/zudo-ez-host/blob/main/manual/src/content/docs/sync/status-save-publish.mdx',
                 'https://github.com/zudolab/zudo-ez-host/blob/main/.codex/skills/l-design-system/SKILL.md',
                 'https://github.com/zudolab/zudo-ez-host/blob/main/packages/ui/src/styles/tokens.css'],
  'styleFamily': 'Neutral technical process',
  'limitation': 'Conceptual actions are labeled Save and Publish for legibility. Actual product '
                'labels include Push/Save and Publish saved. The combined Push & publish shortcut '
                'and failure states are omitted from this focused study.'},
 {'id': 'p-zzmod',
  'project': 'zzmod / Takazudo Modular',
  'title': 'Audio and control voltage',
  'description': 'VCO to VCF to VCA to output follows the cyan audio path. The envelope sends '
                 "purple control voltage to VCA. This uses the existing synth SVG subsystem's "
                 'background, audio and CV colors.',
  'sourceUrls': ['https://github.com/zudolab/zzmod/blob/develop/sub-packages/synth-svg/src/core/theme.ts',
                 'https://github.com/zudolab/zzmod/blob/develop/.claude/skills/l-synth-diagram-wisdom/references/basic-signal-chain.md'],
  'styleFamily': 'Dark signal schematic',
  'limitation': 'Intentionally dark in both appearance modes to retain existing semantic audio/CV '
                'colors. Symbols are original simplifications, not reused branded patch symbols; '
                'positions are conceptual, not physical module sockets. Envelope trigger and pitch '
                'inputs are outside this focused diagram.'}]

# These recipes describe the original vector studies. They are starting points
# for an agent, not templates that override the host application's constraints.
RECIPES = {
    "fine-outline": [
        "Build open shapes with a consistent fine contour; the reference uses 1.6-unit strokes on a 720 by 400 canvas.",
        "Use one restrained accent for the teaching point and keep the remaining surfaces quiet.",
        "Use generous negative space, short upright labels, and clearly joined input paths.",
        "Keep arrows and silhouettes readable at the target width; thicken essential connectors when reducing the drawing.",
        "Map ink, surface, border, and accent to the project's semantic palette before introducing a new color."
    ],
    "soft-fill": [
        "Use large soft surfaces with rounded corners and little or no perimeter stroke.",
        "Separate overlapping forms with tonal contrast and spacing rather than many internal outlines.",
        "Use rounded broad connectors that remain visibly subordinate to the main objects.",
        "Give the destination a single accent treatment; retain high-contrast upright labels.",
        "Adapt corner radii to the host project; choose another tone if a strict square interface would lose its identity."
    ],
    "ink-silhouette": [
        "Construct the main objects as one-ink silhouettes with large clear negative spaces.",
        "Reverse labels or details out of the solid forms only where contrast remains strong.",
        "Use the same contour logic for all inputs and outputs; keep the composition visually balanced.",
        "Reduce internal decoration before reducing label size.",
        "Judge the solid drawing beside its actual help text because the black mass carries substantial visual weight."
    ],
    "offset-blocks": [
        "Use square blocks, thick keylines, and a small consistent hard offset for any shadows.",
        "Keep shadows flat and geometrically related to the objects; avoid soft ambient blur.",
        "Reserve the strongest accent for the result or active teaching point.",
        "Use direct chunky connectors and keep them clear of the displaced shadow edges.",
        "Omit the shadow treatment when the project's design contract disallows it."
    ],
    "editorial-serif": [
        "Make typography part of the composition using a deliberate serif family and a few large sample letters.",
        "Separate sections with restrained rules and generous margins rather than full boxes around every object.",
        "Keep instructional labels short and distinguish them from decorative specimen text.",
        "Use a small palette with one warm accent and avoid ornament that weakens the reading order.",
        "Check fallback font metrics and text fit in both the exported SVG and the intended application."
    ],
    "swiss-grid": [
        "Align labels, shapes, and connectors to a strict shared grid.",
        "Use plain typography, a clear hierarchy, and a small number of bold accent fields.",
        "Use numerical labels only when the content actually has an order.",
        "Keep whitespace deliberate and repeat spacing rules across every panel.",
        "Reduce the size or intensity of accent areas when the drawing competes with surrounding controls."
    ],
    "ui-miniature": [
        "Retain the application's recognizable panel structure while removing incidental controls.",
        "Represent controls and layers with a few legible rows or shapes; emphasize one meaningful state or action.",
        "Use project colors and corner rules for surfaces, dividers, and the active item.",
        "Keep labels outside tiny chrome where possible; use real product terminology.",
        "Describe the output as a conceptual miniature unless it is an exact screenshot or control map."
    ],
    "contour-wash": [
        "Keep the structural contour precise and consistent before adding color washes.",
        "Place a few broad translucent fields behind or within the important shapes.",
        "Use overlap to add personality without creating unintended data or process relationships.",
        "Keep labels and connectors opaque enough to remain readable on every wash.",
        "Inspect the flattened light and dark outputs because a wash's apparent contrast depends on its background."
    ],
    "technical-blueprint": [
        "Use a consistent drafting grid, fine orthogonal paths, and a restrained registration vocabulary.",
        "Use measurement leaders only for real dimensions; decorative drafting marks must not invent product specifications.",
        "Separate strong explanatory lines from low-contrast construction lines.",
        "Keep labels upright and sparse, reserving the bright accent for the main connection or result.",
        "Retain the intentionally dark blueprint surface when using this reference; both appearance variants are dark."
    ],
    "isometric-wire": [
        "Choose one projection and use it consistently for all planes and connecting edges.",
        "Draw the planes as open contours with dashed construction lines where they clarify stacking.",
        "Use a contrasting registration edge to identify how independent inputs align.",
        "Place short labels outside the projected planes whenever text would become difficult to read.",
        "Reduce wire grids and fine detail before shrinking the diagram for a help dialog."
    ],
    "isometric-solid": [
        "Use a consistent projection, extrusion depth, and lighting direction for every volume.",
        "Assign distinct flat colors to top and side facets so depth reads without gradients.",
        "Separate the inputs and combined result with enough space to preserve their identities.",
        "Keep shadows hard and small enough that they do not resemble additional objects.",
        "Use this visual weight deliberately; simplify volume and labels for compact placements."
    ],
    "paper-layers": [
        "Represent independent inputs as overlapping sheets with small, deliberate rotations.",
        "Use restrained offset shadows to show stacking and keep a consistent direction for light.",
        "Place cut-paper motifs within the sheets without obscuring their edges.",
        "Keep the relationship between the source sheets and the assembled result visible.",
        "Adapt the warm paper palette to the project while preserving sufficient separation between sheets."
    ],
    "pencil-notebook": [
        "Use lightly doubled contours and sparse imperfect hatching to suggest a working sketch.",
        "Keep the ruled notebook background lighter than every essential connector and label.",
        "Use quiet hand-drawn arrows whose direction remains unambiguous.",
        "Reserve a small muted accent for the point being taught.",
        "Increase contrast or remove pencil texture at small sizes rather than accepting indistinct paths."
    ],
    "marker-workshop": [
        "Use broad rounded marker strokes, imperfect corners, and a few loose repeated motifs.",
        "Place flat highlighter swipes behind key content, with enough contrast for the labels.",
        "Make each connector look deliberate even when its contour is informal.",
        "Use one or two emphatic colors and keep the surrounding canvas open.",
        "Reduce stroke weight or decoration when this energetic tone overwhelms nearby help text."
    ],
    "chalkboard": [
        "Use a dark green-black ground with broken dry contours and warm chalk accents.",
        "Keep chalk dust sparse and away from labels and important junctions.",
        "Use secondary contours to suggest hand drawing without creating double meanings.",
        "Retain one clear path through the explanation and large plain labels.",
        "Both supplied themes intentionally use a dark board; simplify grain at small sizes."
    ],
    "risograph-duo": [
        "Restrict the drawing to two spot-color roles plus the paper background.",
        "Use a small consistent registration offset and visible overprint where shapes overlap.",
        "Apply sparse print grain to large image areas rather than instructional labels.",
        "Keep broad silhouettes and short text so the intentional imprecision remains readable.",
        "Do not use registration error or blended color where the diagram depends on exact color discrimination."
    ],
    "cut-paper": [
        "Build a small vocabulary of irregular cut silhouettes and offset paper edges.",
        "Use flat organic color fields, reserving sufficient negative space between pieces.",
        "Treat text as a pasted layer with a clean readable surface.",
        "Let connectors feel hand-cut while preserving explicit direction and attachment points.",
        "Reduce the number of overlapping pieces for short, small help illustrations."
    ],
    "halftone-manual": [
        "Use firm keylines, a restricted monochrome palette, and clear knockout lettering.",
        "Confine dots and diagonal hatching to meaningful picture areas.",
        "Keep labels and thin connectors clear of texture.",
        "Choose one consistent screen size and test it at the intended rendering scale.",
        "Remove or enlarge the halftone texture when downscaling produces interference or visual noise."
    ],
    "pixel-schematic": [
        "Construct silhouettes and connectors on a discrete shared grid.",
        "Use stepped corners, hard edges, and chunky directional glyphs.",
        "Keep instructional text large and real rather than simulating unreadably tiny pixel lettering.",
        "Use a few strongly separated colors and preserve gaps between adjacent forms.",
        "Prefer integer scaling when possible, and inspect browser interpolation at the target width."
    ],
    "terminal": [
        "Use monospace labels, corner-bracket frames, and spare orthogonal geometry.",
        "Limit bright phosphor colors to important entities and paths.",
        "Use actual SVG shapes for the diagram while retaining terminal character in typography and framing.",
        "Keep the dark canvas open and avoid dense simulated terminal output around the explanation.",
        "Both supplied appearance variants retain the intrinsic dark terminal identity."
    ],
    "circuit-route": [
        "Route paths with consistent right-angle bends and repeat a small port and junction vocabulary.",
        "Distinguish actual explanatory connections from decorative substrate details.",
        "Keep route colors meaningful and stable across the documentation set.",
        "Use a restrained substrate palette and high-contrast short labels.",
        "For real signal diagrams preserve the application's audio, CV, gate, or other semantic color assignments."
    ],
    "transit-wayfinding": [
        "Use thick routed lines, round station rings, and clear transfer geometry.",
        "Assign route colors to meaningful input or process categories and retain those meanings.",
        "Place bold labels beside stations and keep them clear of branches.",
        "Show only the branches and destinations that the product actually supports.",
        "Reduce station detail and route complexity for small diagrams without changing the explanation."
    ],
    "modular-geometric": [
        "Build motifs from circles, quarter circles, rectangles, and a small repeated tile vocabulary.",
        "Use deliberate open space and a limited balanced palette.",
        "Keep explanatory connectors simple enough to read separately from decorative geometry.",
        "Repeat motifs only when their relationship to the source and assembled result stays understandable.",
        "Use a separate control reference when the reader needs to locate an exact interface element."
    ],
    "luminous-glass": [
        "Use a few overlapping translucent planes with consistent luminous edges.",
        "Restrict the glow to selected contours and keep labels crisp and opaque.",
        "Use restrained cyan-violet highlights against generous dark space.",
        "Preserve the identity of each input layer before showing their combined result.",
        "Both supplied variants are intrinsically dark; simplify filters or choose a quieter tone for small help slots."
    ]
}

REFERENCES = {
    "line": {"title": "IBM Design Language — line illustration principles", "url": "https://www.ibm.com/design/language/illustration/line-style/design/"},
    "flat": {"title": "IBM Design Language — flat illustration principles", "url": "https://www.ibm.com/design/language/illustration/flat-style/design/"},
    "iso": {"title": "IBM Design Language — isometric illustration principles", "url": "https://www.ibm.com/design/language/illustration/isometric-style/design/"},
    "ui": {"title": "IBM Design Language — hybrid UI illustration", "url": "https://www.ibm.com/design/language/illustration/hybrid-ui-style/design/"},
    "technical": {"title": "IBM Design Language — technical diagrams", "url": "https://www.ibm.com/design/language/infographics/technical-diagrams/design/"},
    "atlassian": {"title": "Atlassian Design — illustration purposes and formats", "url": "https://atlassian.design/foundations/illustrations"},
    "rough": {"title": "Rough.js — sketch contours and vector hatching", "url": "https://roughjs.com/"},
    "gitlab": {"title": "GitLab Pajamas — illustration construction and sizes", "url": "https://design.gitlab.com/product-foundations/illustration/"},
    "indeed": {"title": "Indeed Design — a scalable illustration system", "url": "https://indeed.design/article/building-a-scalable-illustration-system/"},
    "stripe": {"title": "Stripe — Connect front-end design", "url": "https://stripe.com/blog/connect-front-end-experience"},
    "content": {"title": "Example content — zudo-pattern-gen Composer manual", "url": "https://github.com/zudolab/zudo-pattern-gen/blob/develop/manual/src/content/docs/composer/index.mdx"}
}

TONE_REFERENCE_KEYS = {
    "fine-outline": ["line", "technical"], "soft-fill": ["flat", "atlassian"],
    "ink-silhouette": ["flat"], "offset-blocks": ["flat"],
    "editorial-serif": ["indeed"], "swiss-grid": ["technical", "gitlab"],
    "ui-miniature": ["ui", "gitlab"], "contour-wash": ["line", "atlassian"],
    "technical-blueprint": ["technical"], "isometric-wire": ["iso"],
    "isometric-solid": ["iso", "stripe"], "paper-layers": ["flat", "atlassian"],
    "pencil-notebook": ["rough"], "marker-workshop": ["rough"], "chalkboard": ["rough"],
    "risograph-duo": ["flat", "indeed"], "cut-paper": ["flat", "atlassian"],
    "halftone-manual": ["technical", "rough"], "pixel-schematic": ["flat"],
    "terminal": ["technical"], "circuit-route": ["technical"],
    "transit-wayfinding": ["technical"], "modular-geometric": ["flat"],
    "luminous-glass": ["iso", "stripe"]
}

SELECTED_TONES = [
    "fine-outline", "soft-fill", "editorial-serif", "ui-miniature", "technical-blueprint",
    "isometric-wire", "paper-layers", "marker-workshop", "circuit-route", "modular-geometric"
]

PROJECT_OPTIONS = {
    "p-pattern": ("project-pattern-gen", "ui-miniature", "zudo-pattern-gen Composer help", 360, 200),
    "p-text": ("project-text", "ui-miniature", "zudo-text frame help", 280, 156),
    "p-doc-cloud": ("project-doc-cloud", "fine-outline", "zudo-doc-cloud collect changes help", 360, 200),
    "p-host": ("project-ez-host", "fine-outline", "zudo-ez-host save and publish help", 360, 200),
    "p-zzmod": ("project-zzmod", "circuit-route", "zzmod signal-path documentation", 480, 267)
}

PROJECT_FACTS = {
    "p-pattern": [
        "A pattern background and a text layer combine into one composition.",
        "PNG depicts an image export operation; the editable illustration's SVG format does not claim that all patterns export as SVG.",
        "Saving is not an export prerequisite. Optional image layers and saving are outside this drawing."
    ],
    "p-text": [
        "Split creates a new Empty frame while the existing Note Tray remains in its original frame.",
        "Choosing the new frame's component is a separate step after Split.",
        "Duplicate is a distinct operation. No note cloning is represented."
    ],
    "p-doc-cloud": [
        "In this successful Move example, selected changes A and B move from Workbench into the named Draft: Guide.",
        "Unselected change C remains on Workbench, which continues to exist.",
        "A, B, and C are illustrative changes. Dependency expansion, blockers, stale previews, and Keep a copy on Workbench are outside this drawing."
    ],
    "p-host": [
        "Local folder, saved cloud checkpoint, and live site are separate places.",
        "Save and Publish are separate actions. Saving alone does not mean the live site changed.",
        "The combined Push & publish action, failure states, history restore, and merge are outside this focused diagram."
    ],
    "p-zzmod": [
        "The cyan audio path runs from VCO through VCF and VCA to output.",
        "The envelope's purple control-voltage path controls VCA gain.",
        "Positions are conceptual rather than physical sockets. Envelope trigger and pitch inputs are outside this drawing."
    ]
}


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def copy_asset(source: Path, dest: Path) -> None:
    if not source.is_file():
        raise FileNotFoundError(f"Missing canonical asset: {source}. Restore bundled files or supply --atlas-dir.")
    dest.parent.mkdir(parents=True, exist_ok=True)
    if source.resolve() != dest.resolve():
        shutil.copyfile(source, dest)


def check_svg(path: Path, require_flat: bool = True) -> None:
    svg = path.read_text()
    node = ET.fromstring(svg)
    if node.tag != "{http://www.w3.org/2000/svg}svg" or node.get("viewBox") != "0 0 720 400":
        raise ValueError(f"Unexpected SVG root or geometry in {path}")
    if require_flat and ("var(" in svg or "oklch(" in svg):
        raise ValueError(f"Theme export contains unresolved CSS colors: {path}")


def good_for(text: str) -> list[str]:
    return [part.strip().rstrip(".") for part in re.split(r";\s*|,\s*", text) if part.strip()]


def reading_guide(slug: str) -> str:
    if slug == "swiss-grid":
        return "Read 01 / Pattern and 02 / Text as the two inputs. Aa previews editable lettering. The combined destination is numbered 03 / PNG: the numbers order this explanation, not application commands. MAKE SOMETHING is sample lettering, not an operation label. The aligned grid organizes the same merge/export story."
    if slug == "editorial-serif":
        return "Pattern and Text name the two inputs; Aa is a lettering preview. Make something. is sample copy inside the resulting composition. PNG marks the output image format. Serif lettering changes the editorial treatment, not what the composition contains."
    if slug in {"technical-blueprint", "isometric-wire", "isometric-solid", "paper-layers", "pencil-notebook", "marker-workshop", "chalkboard", "risograph-duo"}:
        return "Pattern and Text identify the two contributing layers. MAKE is sample text shown in the text input and the composed result, not a second action or duplicate output. PNG identifies the exported image. Perspective, stacked edges, sketch marks or print offsets describe this tone's visual construction; they do not introduce extra data stages."
    if slug in {"cut-paper", "halftone-manual", "pixel-schematic", "terminal", "circuit-route", "transit-wayfinding", "modular-geometric", "luminous-glass"}:
        return "Pattern identifies the repeated background; MAKE previews the Text input. MAKE SOMETHING is sample lettering in the composed result, and PNG marks its image export. Routes, cells, panels and layered shapes connect inputs to output; they are explanatory marks rather than controls, circuits or a claim about the product's internal implementation."
    return "Pattern and Text identify the two input layers. Aa is a lettering preview; MAKE SOMETHING is sample copy in their combined composition. PNG identifies the exported image. The connectors show that both inputs contribute to one result, not that text is transformed into a pattern."


def drawing_recipe(entry: dict) -> str:
    rows = []
    for index, row in enumerate(entry["recipe"]):
        bindings = "".join(
            f" <!-- scheme:{binding['path']}={binding['value']} -->"
            for binding in entry.get("recipeNumericReferences", [])
            if binding["recipeIndex"] == index
        )
        rows.append("- " + row + bindings)
    return "\n".join(rows)


def build_tones(out: Path, atlas: Path | None) -> list[dict]:
    tones_root = out / "packages/diagram-gen/tones"
    bundled_root = ROOT / "packages/diagram-gen/tones"
    for name in ("composition-meaning.md", "provenance.md"):
        copy_asset(bundled_root / "shared" / name, tones_root / "shared" / name)
    existing_catalog = tones_root / "catalog.json"
    if not existing_catalog.is_file():
        existing_catalog = bundled_root / "catalog.json"
    previous = {tone["id"]: tone for tone in json.loads(existing_catalog.read_text())["tones"]} if existing_catalog.is_file() else {}
    catalog = []
    for tone in TONES:
        slug = tone["slug"]
        source_name = tone["id"] + "-" + slug
        target = tones_root / slug
        source_svg = atlas / "svg" / (source_name + ".svg") if atlas else bundled_root / slug / "source.svg"
        copy_asset(source_svg, target / "source.svg")
        check_svg(target / "source.svg", require_flat=False)
        for theme in ("light", "dark"):
            source = atlas / "qa" / (theme + "-" + source_name + ".svg") if atlas else bundled_root / slug / (theme + ".svg")
            copy_asset(source, target / (theme + ".svg"))
            check_svg(target / (theme + ".svg"))
        small = tone["limitation"]
        if slug in {"technical-blueprint", "chalkboard", "terminal", "luminous-glass"}:
            small += " Both supplied appearance variants intentionally retain an intrinsic dark surface."
        entry = {
            "id": slug, "number": int(tone["id"]), "name": tone["name"],
            "family": tone["family"], "summary": tone["description"],
            "recipe": RECIPES[slug], "goodFor": good_for(tone["bestFor"]),
            "smallSizeNotes": small,
            "referenceFiles": {"light": slug + "/light.svg", "dark": slug + "/dark.svg"},
            "sourceReferences": [REFERENCES[key] for key in TONE_REFERENCE_KEYS[slug]],
            "bundledReferences": [
                {"id": "recipe", "title": tone["name"] + " drawing and reading guide", "path": slug + "/recipe.md", "required": True},
                {"id": "composition-meaning", "title": "Composition teaching example and glossary", "path": "shared/composition-meaning.md", "required": True},
                {"id": "provenance", "title": "Original content and redistribution decisions", "path": "shared/provenance.md", "required": True}
            ]
        }
        for field in ("scheme", "kit", "toneRevision", "recipeNumericReferences"):
            if field in previous.get(slug, {}):
                entry[field] = previous[slug][field]
                if field in ("scheme", "kit") and isinstance(entry[field], str):
                    source_root = tones_root if (tones_root / entry[field]).is_file() else bundled_root
                    copy_asset(source_root / entry[field], tones_root / entry[field])
        if "scheme" in entry:
            # Authored recipe templates and checked numeric references must survive
            # regeneration; RECIPES is only the legacy, nonscheme source.
            entry["recipe"] = previous[slug]["recipe"]
            template_path = Path(slug) / "kit.template.svg"
            source_root = tones_root if (tones_root / template_path).is_file() else bundled_root
            if (source_root / template_path).is_file():
                copy_asset(source_root / template_path, tones_root / template_path)
        catalog.append(entry)
        recipe = f"# {tone['id']} {tone['name']}\n\n{tone['description']}\n\n"
        recipe += "This profile describes an original exploratory drawing. The linked external references informed broad construction principles; this SVG is not a copied brand asset. Project facts and design rules take precedence over its sample palette.\n\n"
        recipe += "## Drawing recipe\n\n" + drawing_recipe(entry) + "\n\n"
        recipe += "## Useful placements\n\n" + tone["bestFor"] + "\n\n## Size and theme notes\n\n" + small + "\n\n"
        if "scheme" in entry:
            recipe += "The original example is preserved. The pilot canvas uses {{scheme:coordinateSystem.viewBox.2}} × {{scheme:coordinateSystem.viewBox.3}} user units. Essential pilot labels use fontSize {{scheme:typography.label.fontSize}}, with minimum {{scheme:typography.label.minCssPx}}px after contain placement. Check actual line breaks, Japanese glyphs, transformations and overlap; nominal size is not readability evidence.\n\n"
        else:
            recipe += "The supplied artwork has a 720 × 400 viewBox. Most essential labels are at least 26 units tall; at 360px display width that is approximately 13px. Check the actual host slot, longer translations, and available fonts before integration.\n\n"
        recipe += "`light.svg` and `dark.svg` are self-contained literal-color exports intended for an image element. `source.svg` retains theme variables and is an editable reference; changing its root `data-theme` selects the palette when the SVG's CSS is supported. Both exports retain editable text and geometry.\n\n"
        recipe += "## Shared example meaning\n\nA pattern background and a text layer combine into a composition that can be exported as an image. The example uses PNG as its export label. The shapes and sample typography are invented teaching material, not screenshots. Optional image layers and saving are omitted.\n\n"
        recipe += "Read the bundled [composition meaning and glossary](../shared/composition-meaning.md) for the full input/output vocabulary and [provenance decisions](../shared/provenance.md) for reuse limits.\n\n"
        recipe += "## Reading this drawing\n\n" + reading_guide(slug) + "\n\n"
        recipe += "## Optional public inspiration\n\nThese links explain broad visual construction principles. Reading them is optional; all example meaning is bundled locally.\n\n" + "\n".join(f"- [{r['title']}]({r['url']})" for r in entry["sourceReferences"]) + "\n"
        if "scheme" in entry:
            try:
                scheme = json.loads((tones_root / entry["scheme"]).read_text())
            except json.JSONDecodeError:
                scheme = None
            # Unknown future scheme formats are copied opaquely; runtime validation
            # remains responsible for rejecting unsupported or malformed resources.
            if isinstance(scheme, dict) and scheme.get("schemaVersion") == 1:
                recipe += "\n## Pilot scheme and kit — authored revision " + scheme["toneRevision"] + "\n\n"
                recipe += "The scheme is the numeric authority for new pilot drawings; original example geometry stays unchanged. Read `scheme.json` and the seven symbols in `kit.svg` together. `kit.template.svg` is authoring source, checked in this repository by `node scripts/build-pilot-kits.mjs --check`; it is not a runtime materialization API. Palette-bearing marks carry semantic attributes and literal light defaults. Inline needed geometry for a self-contained candidate and use the common experiment palette; do not reference the kit as an external image.\n\n"
                recipe += "Nominal label/detail sizes: {{scheme:typography.label.fontSize}} / {{scheme:typography.detail.fontSize}} user units. Connector stroke: {{scheme:geometry.strokeWidths.connector}} user units. Texture seed/amplitude/frequency: {{scheme:texture.seed}} / {{scheme:texture.amplitude}} / {{scheme:texture.frequency}}. These expressions resolve from the scheme; do not copy their values into an independent recipe.\n\n"
                for group in ("required", "preferred", "flexible"):
                    recipe += "### " + group.capitalize() + "\n\n"
                    recipe += "\n".join("- **" + rule["id"] + "**: " + rule["description"] for rule in scheme["rules"][group]) + "\n\n"
                recipe += "### Composition vocabulary\n\n"
                recipe += "\n".join("- **" + role + "**: " + description for role, description in scheme["composition"].items()) + "\n\n"
                recipe += "This pack is prepared for the frozen paired pilot, not accepted by a visual gate. Schemas, deterministic generation and nominal text size cannot establish tone character, factual accuracy or Japanese readability. No fixture is user approval.\n"
        (target / "recipe.md").write_text(recipe)
    write_json(tones_root / "catalog.json", {"schemaVersion": 1, "version": VERSION, "tones": catalog})
    return catalog


def base_session(id_: str, title: str, description: str, width: int = 360, height: int = 200) -> dict:
    return {"schemaVersion": 1, "id": id_, "title": title, "description": description,
            "target": {"width": width, "height": height, "label": "Proposed help illustration size"},
            "toneCollectionVersion": VERSION}


def candidate(id_: str, title: str, tone_id: str, description: str, order: int, parent: str | None = None) -> dict:
    return {"schemaVersion": 1, "id": id_, "title": title, "toneId": tone_id,
            "description": description, "order": order,
            "assets": {"light": "light.svg", "dark": "dark.svg"}, "parentCandidateId": parent}


def refine_connectors(svg: str) -> str:
    paths = [
        "M210 123 H246 Q284 123 284 162 V199", "M210 296 H246 Q284 296 284 258 V205",
        "M285 202 H369 M359 192 L369 202 L359 212", "M536 278V295 M529 288L536 295L543 288"
    ]
    for path in paths:
        pattern = r'(<path d="' + re.escape(path) + r'"[^>]*stroke-width=")1\.6(")'
        svg, count = re.subn(pattern, r'\g<1>2.8\2', svg)
        if count != 1:
            raise ValueError("Expected one original connector for targeted edit: " + path)
    return svg.replace(">01 Fine outline</title>", ">Fine outline — stronger connectors</title>")


def build_exploration(out: Path, catalog: list[dict]) -> None:
    root = out / "examples/tone-exploration"
    tones_root = out / "packages/diagram-gen/tones"
    lookup = {tone["id"]: tone for tone in catalog}
    session = base_session("composer-tone-exploration", "One explanation, ten directions",
        "A demonstration session: ten original tone studies explain the same composition relationship. Round 2 demonstrates a precise SVG refinement; it does not record a user-approved choice.")
    session["project"] = {"name": "zudo-pattern-gen — conceptual Composer example", "reference": REFERENCES["content"]["url"]}
    session["context"] = {"title": "Build a composition", "body": "Combine a pattern background with a text layer, then export the composition as an image. These drawings are conceptual examples rather than screenshots."}
    write_json(root / "session.json", session)
    brief = """# Composer help — tone exploration demonstration

## Teaching goal

Show that a pattern background and a text layer are independent inputs to one composition, which can be exported as an image.

## Shared facts and scope

- All ten candidates preserve that input–composition–export relationship.
- PNG is the depicted image export. The SVG drawing format does not claim that the app universally exports SVG.
- Saving is not an export prerequisite. Optional image layers and saving are outside this focused explanation.
- Sample patterns, lettering, and panel shapes are invented teaching examples. These are not screenshots or exact interface-control maps.
- Typography samples vary between drawings while retaining comparable complexity. This is a tone exploration, not a comparison of ten different features.

## Placement

The demonstration uses a 360 × 200px help slot and a 720 × 400 SVG viewBox. Colors are exploratory; adapt the selected drawing to the host's actual tokens. Intrinsically dark tones keep their dark artwork in both appearance variants.

## Round plan

Round 1 explores ten distinct drawing treatments. Round 2 is a clearly labeled sample continuation from r01-c01: strengthen its four essential connectors while preserving positions, words, surfaces, and palette. It demonstrates ancestry and bounded edits. It is not a preference or approval recorded from Takeshi.

## Source

[zudo-pattern-gen Composer manual](https://github.com/zudolab/zudo-pattern-gen/blob/develop/manual/src/content/docs/composer/index.mdx)

The feature interpretation and original artwork were prepared during the September 2026 source review. Re-read current implementation and design instructions when using this example in a live project.
"""
    (root / "brief.md").write_text(brief)
    write_json(root / "rounds/r01/round.json", {"schemaVersion": 1, "id": "r01", "title": "Explore ten tones", "description": "The explanation stays fixed; the illustration treatment varies.", "order": 1, "baselineCandidateId": None})
    for order, slug in enumerate(SELECTED_TONES, 1):
        tone = lookup[slug]
        id_ = f"r01-c{order:02d}"
        dest = root / "rounds/r01" / id_
        write_json(dest / "candidate.json", candidate(id_, tone["name"], slug, tone["summary"], order))
        for theme in ("light", "dark"):
            copy_asset(tones_root / slug / (theme + ".svg"), dest / (theme + ".svg"))
    write_json(root / "rounds/r02/round.json", {"schemaVersion": 1, "id": "r02", "title": "Demonstrate a bounded refinement", "description": "Illustrative continuation only: keep fine-outline geometry and colors, strengthen its four connectors.", "order": 2, "baselineCandidateId": "r01-c01"})
    dest = root / "rounds/r02/r02-c01"
    write_json(dest / "candidate.json", candidate("r02-c01", "Fine outline — stronger connectors", "fine-outline", "Demonstration revision of r01-c01. Only four connector stroke widths change from 1.6 to 2.8 SVG units; the accessible title identifies the revision. Labels, paths, positions, and palette remain intact.", 1, "r01-c01"))
    for theme in ("light", "dark"):
        refined = refine_connectors((root / "rounds/r01/r01-c01" / (theme + ".svg")).read_text())
        (dest / (theme + ".svg")).write_text(refined)
        check_svg(dest / (theme + ".svg"))
    (root / "reviews").mkdir(exist_ok=True)
    (root / "reviews/r01-demo-feedback.md").write_text("""# Demonstration feedback — not a real user decision

This file documents how a bounded revision can be requested. It is explanatory Markdown, not an exported browser review and not an approval to integrate artwork.

- Session: composer-tone-exploration
- Baseline candidate for this demonstration: r01-c01
- Keep: all labels, geometry, positions, fills, palette, and outline weight on the objects.
- Change: the four explanatory connectors from 1.6 to 2.8 SVG units for a more visible connection at small width.
- Next action: one refinement, represented by r02-c01.

The original remains untouched. The revised candidate has parentCandidateId `r01-c01`, and the round has baselineCandidateId `r01-c01`. No favorites or accepted direction are preloaded into browser storage.
""")


def build_projects(out: Path, atlas: Path | None) -> None:
    for project in PROJECTS:
        id_ = project["id"]
        directory, tone_id, title, width, height = PROJECT_OPTIONS[id_]
        root = out / "examples" / directory
        dest = root / "rounds/r01/r01-c01"
        canonical = ROOT / "examples" / directory / "rounds/r01/r01-c01"
        session = base_session(directory, title, "A single project-grounded illustration study. This is a different teaching topic from the other project examples, not another tone candidate for the same explanation.", width, height)
        session["project"] = {"name": project["project"], "reference": project["sourceUrls"][0]}
        session["context"] = {"title": project["title"], "body": project["description"]}
        write_json(root / "session.json", session)
        write_json(root / "rounds/r01/round.json", {"schemaVersion": 1, "id": "r01", "title": "Project adaptation", "description": project["styleFamily"], "order": 1, "baselineCandidateId": None})
        write_json(dest / "candidate.json", candidate("r01-c01", project["title"], tone_id, project["description"] + " " + project["limitation"], 1))
        for theme in ("light", "dark"):
            source = atlas / "qa" / (theme + "-" + id_ + ".svg") if atlas else canonical / (theme + ".svg")
            copy_asset(source, dest / (theme + ".svg"))
            check_svg(dest / (theme + ".svg"))
        source = atlas / "project" / (id_ + ".svg") if atlas else canonical / "source.svg"
        copy_asset(source, dest / "source.svg")
        check_svg(dest / "source.svg", require_flat=False)
        brief = f"# {project['project']} — {project['title']}\n\n{project['description']}\n\n"
        brief += "## Shared facts\n\n" + "\n".join("- " + item for item in PROJECT_FACTS[id_]) + "\n\n"
        brief += "## Scope and limits\n\n" + project["limitation"] + "\n\n"
        brief += f"## Visual adaptation\n\n{project['styleFamily']}. The catalog tone ID `{tone_id}` locates the nearest general drawing family. This project adaptation follows its own meaning and design constraints; it is not a claim that the catalog palette is a project token.\n\n"
        if project.get("tokenBasis"):
            brief += project["tokenBasis"] + "\n\n"
        brief += "The preview size is a review fixture, not a guaranteed production slot. Test the actual component, language, and widths when integrating. The illustration retains a 720 × 400 viewBox. `source.svg` preserves the editable themed reference; the viewer uses explicit literal-color light and dark files.\n\n"
        brief += "## Provenance\n\nThese original studies were grounded in a September 2026 repository review. Source snapshots are listed below; branch URLs can change. Recheck current implementation before shipping a diagram. Each project example has its own session because the topics differ.\n\n"
        brief += "\n".join(f"- [{url.split('/blob/')[-1]}]({url})" for url in project["sourceUrls"]) + "\n"
        (root / "brief.md").write_text(brief)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--atlas-dir", type=Path, help="Optional original diagram-tone-work directory; imports previously flattened SVGs.")
    parser.add_argument("--out", type=Path, default=ROOT, help="Destination project root. Default: this repository.")
    parser.add_argument("--tones-only", action="store_true", help="Rebuild tone metadata/recipes and copy their existing resources without changing session examples.")
    args = parser.parse_args()
    out = args.out.resolve()
    atlas = args.atlas_dir.resolve() if args.atlas_dir else None
    catalog = build_tones(out, atlas)
    if args.tones_only:
        print(f"Built {len(catalog)} self-contained tone profiles without changing session examples.")
        return
    build_exploration(out, catalog)
    build_projects(out, atlas)
    print(f"Built {len(catalog)} tone profiles with 48 theme exports, a 10+1 candidate exploration, and 5 individual project sessions.")






if __name__ == "__main__":
    main()
