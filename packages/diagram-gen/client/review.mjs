/** Validate before applying any state, including across project session boundaries. */
export function validateSessionReview(review, data) {
  if (review?.schemaVersion !== 1 || review.type !== 'zudo-diagram-review')
    throw new Error('This is not a supported diagram review JSON file.');
  if (review.sessionId !== data.session.id)
    throw new Error(`This review belongs to “${review.sessionId}”, not this session.`);
  if (!Array.isArray(review.records) || !Array.isArray(review.shortlist))
    throw new Error('The review is missing its candidate records or shortlist.');
  const ids = new Set(data.candidates.map((candidate) => candidate.id));
  const actions = new Set(['refine', 'integrate', 'explore']);
  for (const record of [
    ...review.records,
    ...review.shortlist,
    ...(review.chosenDirection ? [review.chosenDirection] : []),
    ...(review.reviewedCandidate ? [review.reviewedCandidate] : []),
  ]) {
    if (!record || !ids.has(record.id))
      throw new Error(`Candidate “${record?.id || 'unknown'}” is missing from this session.`);
    if (typeof record.fingerprint !== 'string' || !record.fingerprint)
      throw new Error(`Candidate “${record.id}” has no artwork fingerprint.`);
  }
  const seen = new Set();
  for (const record of review.records) {
    if (seen.has(record.id)) throw new Error('Duplicate candidate feedback records.');
    seen.add(record.id);
    if (
      typeof record.keep !== 'string' ||
      typeof record.change !== 'string' ||
      !actions.has(record.action)
    )
      throw new Error(`Feedback for “${record.id}” is invalid.`);
  }
  if (
    review.reviewedCandidate &&
    review.feedback &&
    (typeof review.feedback.keep !== 'string' ||
      typeof review.feedback.change !== 'string' ||
      !actions.has(review.feedback.action))
  )
    throw new Error('The selected candidate’s feedback is invalid.');
  return review;
}

export function validateProjectReview(review, data) {
  if (
    review?.schemaVersion !== 1 ||
    review.type !== 'zudo-diagram-project-review' ||
    review.projectId !== data.project.id ||
    !Array.isArray(review.sessions)
  )
    throw new Error('Unsupported or foreign project review.');
  const seen = new Set();
  for (const record of review.sessions) {
    const entry = data.sessions.find((session) => session.id === record?.sessionId);
    if (!entry?.data || seen.has(record.sessionId))
      throw new Error('Unknown, unavailable or duplicate project review session.');
    seen.add(record.sessionId);
    validateSessionReview(record, entry.data);
  }
  return review;
}
