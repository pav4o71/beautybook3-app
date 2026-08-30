## Description

Brief description of changes and what problem this solves.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Security fix

## Related Issue

Closes #___

## Changes Made

### Database
- [ ] Schema changes (if applicable)
- [ ] Migration file created
- [ ] Migration tested on staging
- [ ] Indexes added for new queries
- [ ] Backwards compatibility maintained

### Code
- [ ] Organization scoping added (if applicable)
- [ ] Server actions follow patterns
- [ ] Error handling implemented
- [ ] Input validation added
- [ ] No console.log or debug statements
- [ ] TypeScript types are correct
- [ ] No `any` types or type assertions

### Testing
- [ ] Unit tests added/updated
- [ ] E2E tests added/updated
- [ ] Verify scripts pass (`npm run verify`)
- [ ] Manual testing completed
- [ ] Organization isolation tested (if multi-tenant)

### Documentation
- [ ] README updated (if applicable)
- [ ] API documentation updated (if applicable)
- [ ] Migration guide updated (if applicable)
- [ ] Comments added for complex logic

## Testing Checklist

### Manual Testing
- [ ] Tested locally with `npm run dev`
- [ ] Tested with demo accounts (admin & customer)
- [ ] Tested organization switching (if applicable)
- [ ] Tested booking flow
- [ ] Tested admin catalog management
- [ ] Tested on mobile viewport

### Automated Testing
```bash
# Run these commands and verify they pass
npm run lint
npm run build
npm run test:e2e
npm run verify
```

## Screenshots (if UI changes)

Before: 

After: 

## Deployment Notes

### Migration Required
- [ ] No database changes
- [ ] Migration will be auto-applied on deploy
- [ ] Migration requires manual intervention
- [ ] Backwards compatible (can deploy before migration)

### Environment Variables
- [ ] No new env vars
- [ ] New env vars added to `.env.example`
- [ ] New env vars configured in production

### Rollback Plan
If this needs to be reverted:
1. Revert this PR
2. Rollback migration: `npm run prisma:migrate:rollback`
3. Restore from backup (if needed)

## Security Checklist

- [ ] No sensitive data in logs
- [ ] Input validation on all user input
- [ ] Organization scoping verified
- [ ] No hardcoded secrets
- [ ] Rate limiting considered (if public API)
- [ ] SQL injection prevented (using Prisma)

## Performance Checklist

- [ ] Queries use indexes
- [ ] No N+1 queries
- [ ] Caching considered for expensive queries
- [ ] Pagination added for large lists
- [ ] Bundle size impact minimal

## Reviewer Checklist

- [ ] Code follows project conventions
- [ ] Organization isolation verified (if multi-tenant)
- [ ] Tests cover critical paths
- [ ] Error handling is adequate
- [ ] Documentation is clear
- [ ] No security issues
- [ ] Performance impact acceptable

## Post-Merge Checklist

- [ ] Deploy to staging
- [ ] Verify on staging
- [ ] Deploy to production
- [ ] Monitor logs for errors
- [ ] Update documentation if needed
