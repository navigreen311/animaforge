# Contributing to AnimaForge

Thank you for your interest in contributing to AnimaForge. This guide covers the development setup, workflow, and standards expected for all contributions.

---

## Development Setup

### Prerequisites

- Node.js 20+ and npm 10+
- Python 3.11+
- Docker and Docker Compose
- PostgreSQL 16 (or use the Docker setup)
- Redis 7+
- Git

### Getting Started

```bash
# Clone the repository
git clone https://github.com/navigreen311/animaforge.git
cd animaforge

# Start infrastructure (Postgres, Redis, Kafka, Elasticsearch)
docker-compose -f docker/docker-compose.yml up -d

# Install Node.js dependencies
npm install

# Install Python dependencies (AI API)
cd services/ai-api && pip install -r requirements.txt && cd ../..

# Copy environment file and configure
cp .env.example .env
# Edit .env with your local values

# Run database migrations
npm run db:migrate

# Seed development data (optional)
npm run db:seed

# Start all services
npm run dev:all
```

### Service Ports

| Service | Port | URL |
|---------|------|-----|
| Web App | 3000 | http://localhost:3000 |
| Platform API | 3001 | http://localhost:3001 |
| AI API | 8001 | http://localhost:8001 |
| WebSocket Hub | 3002 | http://localhost:3002 |
| Gateway | 4000 | http://localhost:4000 |

---

## Branch Naming

All branches must follow this convention:

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New features | `feature/avatar-studio-blend-shapes` |
| `fix/` | Bug fixes | `fix/shot-reorder-race-condition` |
| `refactor/` | Code restructuring | `refactor/governance-pipeline-stages` |
| `docs/` | Documentation only | `docs/api-reference-wave-4` |
| `test/` | Test additions | `test/marketplace-integration` |
| `ai-feature/` | AI-assisted feature branches | `ai-feature/physics-simulation` |
| `hotfix/` | Urgent production fixes | `hotfix/auth-token-expiry` |

Always branch from `develop`. Only `hotfix/` branches may branch from `main`.

---

## Commit Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, semicolons, etc. (no code change) |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Build process, tooling, or dependency changes |
| `ci` | CI/CD configuration changes |

### Scopes

Use the service or package name: `platform-api`, `ai-api`, `web`, `realtime`, `governance`, `auth`, `billing`, `workers`, `db`, `shared`, `docs`.

### Examples

```
feat(ai-api): add physics simulation endpoint
fix(platform-api): resolve race condition in shot reordering
docs(api-reference): add Wave 4-5 endpoint documentation
test(governance): add integration tests for C2PA signing
chore(deps): upgrade fastapi to 0.111
```

---

## Pull Request Process

1. **Create a branch** from `develop` using the naming convention above.
2. **Make your changes** with clear, atomic commits.
3. **Run all checks locally** before pushing:
   ```bash
   npm run lint
   npm run format:check
   npm run test
   npm run test:e2e  # if touching UI or API routes
   ```
4. **Push your branch** and open a PR against `develop`.
5. **Fill out the PR template** with a summary, test plan, and any breaking changes.
6. **Request review** from at least one code owner for the affected service.
7. **Address feedback** with new commits (do not force-push during review).
8. **Merge** once approved and all CI checks pass. Use "Squash and merge" for feature branches.

### PR Title Format

Follow the same conventional commit format:
```
feat(ai-api): add physics simulation endpoint
```

---

## Code Review Checklist

Reviewers should verify each of the following:

### Correctness
- [ ] Logic is correct and handles edge cases
- [ ] Error handling is comprehensive (no swallowed errors)
- [ ] Database queries are efficient (check for N+1 queries)
- [ ] Race conditions are addressed for concurrent operations

### Security
- [ ] Input validation on all user-provided data
- [ ] Authorization checks on protected routes
- [ ] No secrets or credentials in the code
- [ ] SQL injection and XSS prevention

### Testing
- [ ] New code has corresponding unit tests
- [ ] Integration tests cover the happy path and key error paths
- [ ] Test assertions are meaningful (not just "does not throw")
- [ ] Coverage meets the 80% threshold for business logic

### Style and Standards
- [ ] Code follows the project ESLint / Ruff configuration
- [ ] TypeScript types are explicit (no `any` unless justified)
- [ ] Python type hints are present on function signatures
- [ ] File and function naming follows project conventions

### Documentation
- [ ] Public API changes are reflected in `docs/api-reference.md`
- [ ] Complex logic has inline comments explaining "why"
- [ ] New environment variables are documented in `.env.example`
- [ ] Breaking changes are noted in the PR description

### Performance
- [ ] No unnecessary database round-trips
- [ ] Large payloads are paginated
- [ ] Expensive operations are queued (BullMQ/Celery), not synchronous

---

## Getting Help

- Open a [Discussion](https://github.com/navigreen311/animaforge/discussions) for questions
- Check existing issues before filing a new one
- Tag `@animaforge/core` for architecture-level questions
