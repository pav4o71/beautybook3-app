---
name: code-reviewer
description: Reviews a code diff for correctness, edge cases, error handling, naming, validation, and test gaps. Use when the user asks for a code review, diff review, PR review, or invokes the code-reviewer skill.
disable-model-invocation: true
---

# Code Reviewer

Review the requested diff and report findings only — do not rewrite the code unless asked.

## Scope

Review the diff for:

- correctness
- missed edge cases
- error handling
- naming/clarity
- missing input validation
- test coverage gaps

## Workflow

1. **Get the diff** — use `git diff`, PR diff, or the files the user pointed at. If no diff is provided, ask which changes to review.
2. **Read surrounding context** — open changed files for imports, callers, and types; don't review hunks in isolation.
3. **Check each dimension** — note concrete issues with file path and line when possible.
4. **Assign severity** — every finding gets exactly one level:
   - **Critical** — wrong behavior, data loss, security/auth bypass, crash in normal use
   - **High** — likely bug or broken flow under common edge cases
   - **Medium** — weak validation, unclear errors, maintainability risk
   - **Low** — naming, style, minor clarity, optional test additions
5. **Output** — use the format below. Omit empty severity sections. If nothing found, say so briefly.

## Output format

Use a short bulleted list grouped by severity:

```markdown
## Critical
- `path/to/file.ts:42` — [one-line issue and why it matters]

## High
- ...

## Medium
- ...

## Low
- ...
```

Rules for bullets:

- One issue per bullet; lead with location when known.
- State **what** is wrong and **impact** — not generic advice ("add tests").
- For test coverage gaps, name the behavior or path that lacks coverage.
- Do not include praise, summaries of the diff, or suggested rewrites unless severity is Critical/High and a one-line fix direction helps.

## Review checklist

- **Correctness** — logic matches intent; async/await, null/undefined, off-by-one, race conditions.
- **Edge cases** — empty input, missing relations, inactive/deleted records, concurrent updates, timezone/date boundaries.
- **Error handling** — failures surfaced to user/caller; no silent swallow; server actions return type matches form usage.
- **Naming/clarity** — names match domain; no misleading abbreviations; complex logic understandable.
- **Input validation** — server boundaries validate required fields, ranges, and auth before DB writes.
- **Test coverage gaps** — new behavior without `verify` script, unit, or e2e coverage where the project already tests similar flows.

## Example

```markdown
## High
- `lib/booking.ts:118` — clash check ignores TimeOff; double-book possible when admin adds overlapping block.

## Medium
- `app/dashboard/admin/services/actions.ts:26` — createService throws on bad price; form has no inline error path.

## Low
- `e2e/booking.spec.ts` — no case for customer role booking; only admin covered.
```
