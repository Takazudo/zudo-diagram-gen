import { readFile } from 'node:fs/promises';

const notFoundPage = await readFile('dist/404.html', 'utf8').catch((cause) => {
  throw new Error('The zudo-doc build must emit dist/404.html for Workers 404-page routing.', {
    cause,
  });
});

if (!notFoundPage.includes('Page not found.')) {
  throw new Error('The generated zudo-doc 404 page no longer contains its expected message.');
}
