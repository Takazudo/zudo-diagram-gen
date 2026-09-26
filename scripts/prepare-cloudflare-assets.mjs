import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await writeFile(
  'dist/404.html',
  `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found | zudo-diagram-gen</title>
  <style>body{font:1rem/1.6 system-ui,sans-serif;max-width:42rem;margin:12vh auto;padding:0 1.5rem;color:#222}a{color:#2459a5}</style>
</head>
<body>
  <main><h1>Page not found</h1><p>That page is not in this documentation site.</p><p><a href="/">Return to the project home</a></p></main>
</body>
</html>
`,
);
