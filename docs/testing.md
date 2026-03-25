# AnimaForge Testing Strategy

This document defines the testing approach, tools, coverage targets, and conventions for the AnimaForge platform.

---

## Test Pyramid

AnimaForge follows the standard test pyramid with emphasis on fast, reliable unit tests as the foundation.

```
         /\
        /  \        E2E Tests (Playwright)
       /    \       ~50 tests, run on CI for PRs to develop/main
      /------\
     /        \     Integration Tests (Vitest + Pytest)
    /          \    ~300 tests, run on CI for every push
   /------------\
  /              \  Unit Tests (Vitest + Pytest)
 /                \ ~1500 tests, run locally + CI
/------------------\
```

| Layer | Scope | Speed | Count Target |
|-------|-------|-------|-------------|
| **Unit** | Single function/class, mocked dependencies | < 5 ms each | 70% of tests |
| **Integration** | Service endpoints, database queries, queue jobs | < 500 ms each | 25% of tests |
| **E2E** | Full user flows through the web app | < 30 s each | 5% of tests |

---

## Coverage Targets

| Area | Minimum Coverage | Notes |
|------|-----------------|-------|
| Business logic (services/) | **80%** | Core revenue and safety-critical code |
| API routes (controllers/) | **75%** | Request handling and validation |
| Utility functions (utils/) | **90%** | Shared helpers must be well-tested |
| Governance pipeline | **90%** | Safety-critical; moderation, consent, C2PA |
| Frontend components | **60%** | Focus on interactive components, not layout |
| Database migrations | **N/A** | Tested via integration tests against test DB |

Coverage is measured by Vitest (Istanbul) for TypeScript and pytest-cov for Python. CI fails if coverage drops below the configured thresholds.

---

## Test Frameworks

### TypeScript Services (Platform API, Realtime, Auth, Billing, etc.)

| Tool | Purpose |
|------|---------|
| **Vitest** | Unit and integration test runner |
| **@testing-library/react** | React component testing (web app) |
| **MSW (Mock Service Worker)** | HTTP request mocking |
| **Supertest** | HTTP integration testing for Express routes |
| **Faker.js** | Test data generation |
| **Testcontainers** | Dockerized Postgres/Redis for integration tests |

### Python Services (AI API)

| Tool | Purpose |
|------|---------|
| **Pytest** | Test runner and framework |
| **pytest-asyncio** | Async test support for FastAPI |
| **httpx** | Async HTTP client for testing FastAPI endpoints |
| **factory_boy** | Test data factories |
| **pytest-cov** | Coverage reporting |
| **responses** | HTTP request mocking |

### End-to-End

| Tool | Purpose |
|------|---------|
| **Playwright** | Browser automation for E2E tests |
| **@playwright/test** | Test runner with built-in assertions |
| **Playwright fixtures** | Shared authentication and setup |

---

## Running Tests

### All Tests

```bash
# Run all unit + integration tests across the monorepo
npm run test

# Run with coverage report
npm run test:coverage

# Run in watch mode (development)
npm run test:watch
```

### By Service

```bash
# Platform API
npm run test --workspace=services/platform-api

# AI API
cd services/ai-api && pytest

# Web App
npm run test --workspace=apps/web

# Specific test file
npx vitest run services/platform-api/src/__tests__/shots.test.ts
```

### End-to-End Tests

```bash
# Run all E2E tests (requires services running)
npm run test:e2e

# Run with UI mode for debugging
npx playwright test --ui

# Run a specific test file
npx playwright test tests/e2e/project-creation.spec.ts

# View the HTML report from the last run
npx playwright show-report
```

### Python Tests

```bash
cd services/ai-api

# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run a specific test file
pytest tests/test_physics.py

# Run tests matching a pattern
pytest -k "test_generate"
```

---

## Writing New Tests

### Unit Test Conventions

1. **File naming**: `<module>.test.ts` or `test_<module>.py`, colocated with the source file or in a `__tests__/` directory.
2. **Test naming**: Use descriptive names that state the expected behavior.
   ```typescript
   describe('ShotService', () => {
     it('should reorder shots without gaps in the order sequence', () => {
       // ...
     });

     it('should throw ValidationError when duration exceeds 60 seconds', () => {
       // ...
     });
   });
   ```
3. **Arrange-Act-Assert**: Structure every test with clear setup, execution, and verification phases.
4. **One assertion per concept**: Each test should verify one logical behavior (multiple `expect` calls are fine if they verify the same concept).
5. **No test interdependence**: Tests must pass in any order and in isolation.

### Integration Test Conventions

1. **Database setup**: Use transactions that roll back after each test, or use Testcontainers for isolated databases.
2. **Seed data**: Use factory functions, not shared fixtures that create coupling.
3. **Assert on HTTP responses**: Test status codes, response shapes, and error messages.
   ```typescript
   it('should return 404 for a non-existent project', async () => {
     const res = await request(app)
       .get('/api/v1/projects/proj_nonexistent')
       .set('Authorization', `Bearer ${token}`);

     expect(res.status).toBe(404);
     expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
   });
   ```

### E2E Test Conventions

1. **User-centric scenarios**: Each test represents a complete user workflow.
2. **Page Object Model**: Encapsulate page interactions in page objects.
3. **Authentication**: Use Playwright's `storageState` to avoid logging in for every test.
4. **Resilience**: Use `locator` with accessible roles and text, not CSS selectors.
5. **Visual regression**: Use `expect(page).toHaveScreenshot()` for critical UI flows.

---

## CI Integration

### Pull Request Checks

Every PR triggers the following pipeline:

```
1. Lint (ESLint + Ruff)          ~30s
2. Type check (tsc --noEmit)     ~45s
3. Unit tests + coverage         ~2min
4. Integration tests             ~4min
5. E2E tests (Playwright)        ~6min (only on PRs to develop/main)
6. Security scan (CodeQL)        ~3min
```

### Merge Requirements

- All CI checks must pass
- Coverage must not decrease below thresholds
- At least one approval from a code owner
- No unresolved review comments

### Nightly Runs

A nightly CI job runs the full test suite including:

- Extended E2E test suite (including slow visual regression tests)
- Performance benchmarks
- Dependency vulnerability audit
- Database migration forward/backward compatibility
