# Contributing Guidelines 🤝

Welcome to the project! To keep code quality high and commit history clean, follow strict development standards.

## 1. Workflow (Branching)

We use a **dev/main** flow:

- `main` — stable, always deployable. Only updated by merging `dev` into it.
- `dev` — integration branch. All feature/fix branches are created from `dev` and merged back into `dev`.
- **No direct pushes:** Pushing directly to `main` or `dev` is strictly forbidden. All changes go **only through a Pull Request (PR)**.
- **Short-lived branches:** Feature/fix branches should be short-lived (1-2 days), branched from `dev`, merged back into `dev`.
- `dev → main` is a separate, deliberate PR when `dev` is in a stable, working state (not on every merge).

**Branch naming rules:**

- `feat/` — new features.
- `fix/` — bug fixes.
- `refactor/` — code rewrites without changing behavior.
- `chore/` — technical tasks, environment and dependency setup.
- `docs/` — documentation updates.

## 2. Commit Message Convention

We use the **Conventional Commits** standard. This allows automatic changelog generation and keeps the history clean.

**Format:** `<type>(<scope>): <description>`

- **Example:** `feat(database): add user entity and drizzle migrations`
- **Example:** `fix(auth): resolve jwt expiration issue`

## 3. Development and Code Standards

- **Validation (Zod):** Using **Zod** schemas for endpoints (DTOs) is mandatory. Without them, data validation and automatic Swagger typing won't work.
- **Linting & Formatting:** Run `pnpm lint` and `pnpm format` before every commit. Code that fails linting will not be accepted.
- **Drizzle Migrations:** **No manual database changes.** Every schema change must come with a migration.
  - Command: `pnpm db:generate`
- **No God-commits:** Split your changes into small, logical commits.

## 4. Pull Request (PR) Process

Before submitting a PR, make sure that:

1. **Self-Review:** You've re-read your own code and removed debug logs (`console.log`).
2. **Checks:** All automated tests (`pnpm test`) and linting pass successfully.
3. **Description:** The PR description clearly states what was done and why.

_A PR is not accepted if tests or linting fail in CI._

## 5. Local Setup

For a quick local environment setup, see the **Quick Start** section in [README.md](./README.md).

Quick command list to get started:

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
pnpm start:dev
```