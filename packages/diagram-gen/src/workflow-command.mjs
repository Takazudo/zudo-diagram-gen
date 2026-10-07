import path from 'node:path';
import { createRequire } from 'node:module';
import { createProject } from './scaffold.mjs';
import { loadContent } from './project.mjs';
import { readStyleRevision } from './style.mjs';
import {
  validateSessionReview,
  validateProjectReview,
  reviewCompatibility,
} from '../client/review.mjs';
import { captureSetup } from './capture-runtime.mjs';
import {
  argumentError,
  envelope,
  machineRequested,
  parseOptions,
  readInput,
  reportError,
} from './command-contract.mjs';

function captureCapability() {
  let library = false;
  try {
    createRequire(import.meta.url).resolve('playwright');
    library = true;
  } catch {
    /* Optional consumer dependency. */
  }
  return { library, browser: 'unknown', setup: captureSetup, inspected: false };
}
function reviewEvidence(review, data) {
  const sessions =
    data.kind === 'project'
      ? data.sessions.filter((entry) => entry.data)
      : [{ id: data.session.id, data }];
  const records = data.kind === 'project' ? review.sessions : [review];
  return records.map((record) => {
    const session = sessions.find((entry) => entry.id === record.sessionId).data;
    const snapshots = [
      ...record.records,
      ...record.shortlist,
      ...(record.chosenDirection ? [record.chosenDirection] : []),
      ...(record.reviewedCandidate ? [record.reviewedCandidate] : []),
    ];
    return {
      sessionId: record.sessionId,
      candidates: snapshots.map((snapshot) => {
        const candidate = session.candidates.find((item) => item.id === snapshot.id);
        return {
          id: snapshot.id,
          fingerprint: snapshot.fingerprint,
          compatibility: reviewCompatibility(candidate, snapshot, {
            styleHash: session.styleHash,
            placementHash: session.placementHash,
          }),
        };
      }),
    };
  });
}
export async function runWorkflowCommand(args) {
  const command = args[0];
  if (!['new', 'inspect', 'resume'].includes(command)) return false;
  const machine = machineRequested(args);
  let recovery = null;
  try {
    const parsed = parseOptions(
      args.slice(1),
      command === 'new'
        ? {
            out: { type: 'string' },
            brief: { type: 'string' },
            project: { type: 'boolean' },
            install: { type: 'boolean' },
            json: { type: 'boolean' },
            'engine-package': { type: 'string' },
          }
        : { review: { type: 'string' }, json: { type: 'boolean' } },
    );
    const { options, positionals } = parsed;
    if (command === 'new') {
      if (positionals.length || !options.out || !options.brief)
        throw argumentError(
          'Usage: new --out <new-directory> --brief <file> [--project] [--install] [--engine-package <spec>] [--json]. Existing content uses resume <directory>.',
        );
      const brief = await readInput(options.brief);
      const data = await createProject({
        destination: options.out,
        brief,
        project: options.project,
        enginePackage: options['engine-package'],
        install: options.install,
        installOutput: machine ? 'stderr' : 'inherit',
      });
      if (machine) envelope(command, data);
      else
        console.log(
          `Created ${data.projectId ? 'project' : 'session'} ${data.directory}. Author candidates, then check and capture; no artwork was generated.`,
        );
      return true;
    }
    if (positionals.length !== 1)
      throw argumentError(`Usage: ${command} <session-or-project> [--review <file>] [--json].`);
    const content = await loadContent(path.resolve(positionals[0]));
    recovery = {
      content,
      review: null,
      reviewEvidence: [],
      capabilities: { capture: captureCapability(), browserReview: 'explicit-transfer-only' },
    };
    const errors = content.kind === 'project' ? [...content.diagnostics] : [];
    let review = null,
      evidence = [],
      style = null;
    if (content.kind === 'project' && content.project.style) {
      try {
        style = await readStyleRevision(positionals[0], content.project.style.revision, {
          expectedHash: content.project.style.hash,
          sessions: content.sessions,
        });
      } catch {
        /* loadProject already reported missing/stale immutable style diagnostics. */
      }
    }
    if (options.review) {
      review = await readInput(options.review, { json: true });
      try {
        if (content.kind === 'project') validateProjectReview(review, content);
        else validateSessionReview(review, content);
      } catch (error) {
        error.code = 'VALIDATION_FAILED';
        throw error;
      }
      evidence = reviewEvidence(review, content);
      for (const session of evidence)
        for (const candidate of session.candidates)
          if (Object.values(candidate.compatibility).includes('stale'))
            errors.push({
              code: 'STALE_INPUT',
              message: `Review evidence for ${session.sessionId}/${candidate.id} is stale; inspect the current image and transfer a new explicit review.`,
              path: candidate.id,
            });
    }
    const data = {
      content,
      review,
      reviewEvidence: evidence,
      style,
      capabilities: { capture: captureCapability(), browserReview: 'explicit-transfer-only' },
    };
    recovery = data;
    const warnings = [
      {
        code: 'VISUAL_INSPECTION_REQUIRED',
        message:
          'Check and capture do not inspect an image. Browser storage is not read; supply --review with copied/downloaded JSON.',
      },
    ];
    if (machine) envelope(command, data, { errors, warnings });
    else {
      console.log(
        `${command === 'resume' ? 'Resume' : 'Inspect'} ${content.kind} ${content.project?.id ?? content.session.id}: ${errors.length ? 'incomplete or stale' : 'valid'}.`,
      );
      for (const diagnostic of errors) console.error(`${diagnostic.code}: ${diagnostic.message}`);
      console.log(
        'Run check, capture and actual image inspection before review/export. Supply --review to transfer browser feedback.',
      );
      process.exitCode = errors.length ? 1 : 0;
    }
  } catch (error) {
    reportError(command, error, machine, false, recovery);
  }
  return true;
}
