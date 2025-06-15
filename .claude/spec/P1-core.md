This plan is designed for a sophisticated coding agent like Claude Code. It is exhaustive, leaves no room for ambiguity, and integrates modern best practices directly into the TDD workflow. Every single file from the Flask API is accounted for.

---

```markdown
# MIGRATION_CHECKLIST_P1_CORE.md
# Project: Port `flask-api` to `ai-edge-docs` Next.js App Router API.
# Part 1: Foundation & Core Services
# Source of Truth: The behavior and test suite of the `flask-api` directory.
# Status: IN-PROGRESS

This document is the master checklist and stateful scratchpad for this part of the migration. It must be updated after each task is completed.

## Phase 0: Project Foundation & Environment Setup

- [ ] **Task 0.1: Install Core Production Dependencies**
  - [ ] Execute in `ai-edge-docs` root: `pnpm add @azure/data-tables stytch patreon stripe zod @upstash/ratelimit @vercel/kv`.

- [ ] **Task 0.2: Install Testing Framework & Dependencies**
  - [ ] Execute in `ai-edge-docs` root: `pnpm add -D vitest @vitest/ui jsdom`.

- [ ] **Task 0.3: Configure Vitest**
  - [ ] Create `vitest.config.ts` in the project root with the following content:
    ```typescript
    import { defineConfig } from 'vitest/config';
    import react from '@vitejs/plugin-react';
    import path from 'path';

    export default defineConfig({
      plugins: [react()],
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './src'),
        },
      },
    });
    ```
  - [ ] Create the global test setup file: `src/test/setup.ts`.

- [ ] **Task 0.4: Environment Variable Synchronization**
  - [ ] Create the file `.env.local` in the `ai-edge-docs` root.
  - [ ] Open `flask-api/.env.test.example` as a reference.
  - [ ] Open the existing `.env` in the `ai-edge-docs` root.
  - [ ] Merge and copy every variable from the Flask environment into the Next.js `.env.local` file. **This is critical.**
  - [ ] **Verification Step (Agent):** Read the contents of `flask-api/requirements.txt`, the Flask `.env`, and the new Next.js `.env.local`. List any discrepancies and confirm all necessary variables are present.

- [ ] **Task 0.5: Create Library Directory Structure**
  - [ ] In `ai-edge-docs/src`, create a directory named `lib`.
  - [ ] Inside `src/lib`, create the following files and folders:
    - [ ] `storage.ts`
    - [ ] `cookies.ts`
    - [ ] `admin.ts`
    - [ ] `tradingview.ts`
    - [ ] `stripe.ts`
    - [ ] `logger.ts`
    - [ ] `schemas.ts`
    - [ ] `auth/` (directory)
      - [ ] `auth/discord.ts`
      - [ ] `auth/patreon.ts`
      - [ ] `auth/stytch.ts`
      - [ ] `auth/session.ts`

- [ ] **Task 0.6: Create API Directory Structure**
  - [ ] In `ai-edge-docs`, create the directory `app/api`.
  - [ ] Preemptively create the subdirectory structure based on the Flask routes to ensure organization.

---
## Phase 1: Porting Core Services (TDD Workflow)
Each task must follow the strict Analyze -> Write Failing Test -> Implement -> Refactor cycle.

- [ ] **Task 1.1: Port `flask-api/helper_storage_service.py` -> `src/lib/storage.ts`**
  - [ ] **Analyze:** Review all public methods in `helper_storage_service.py` and the mock implementation in `flask-api/tests/conftest.py`.
  - [ ] **Create Test File:** Create `src/lib/storage.test.ts`.
  - [ ] **TDD - Singleton:** Write a Vitest test for a static `StorageService.getInstance()`. Implement the singleton pattern.
  - [ ] **TDD - `_ensure_tables_exist`:** Write a test mocking `TableClient.createTableIfNotExists`. Implement the method.
  - [ ] **TDD - `getUserProfile`:** In `storage.test.ts`, `vi.mock('@azure/data-tables')`. Mock `TableClient.getEntity` resolving and throwing a 404 error. Implement `getUserProfile`.
  - [ ] **TDD - `isDisplayNameTaken`:** Write tests mocking `TableClient.listEntities`. Implement `isDisplayNameTaken`.
  - [ ] **TDD - `createOrUpdateUserProfile`:** Write test mocking `TableClient.upsertEntity`. Implement the method.
  - [ ] **TDD - `userProfileExists`:** Write test and implement.
  - [ ] **TDD - `addBlogComment`:** Write test mocking `TableClient.createEntity`, asserting correct keys. Implement `addBlogComment`.
  - [ ] **TDD - `getBlogComments`:** Write test mocking `TableClient.listEntities`. Implement `getBlogComments`.
  - [ ] **TDD - `getBlogComment`:** Write test and implement.
  - [ ] **TDD - `deleteBlogComment`:** Write test mocking `TableClient.deleteEntity`. Implement `deleteBlogComment`.
  - [ ] **TDD - `insert_or_replace_access_token`:** Write test and implement.
  - [ ] **TDD - `get_access_token_metadata`:** Write test and implement.
  - [ ] **TDD - `delete_access_token`:** Write test and implement.
  - [ ] **TDD - `get_public_composite_index_entities`:** Write test and implement.
  - [ ] **TDD - `get_composite_index_entities_for_user_id`:** Write test and implement.
  - [ ] **TDD - `insert_or_replace_composite_index`:** Write test and implement.
  - [ ] **TDD - `delete_composite_index`:** Write test and implement.
  - [ ] **TDD - `get_composite_index_components`:** Write test and implement.
  - [ ] **TDD - `insert_or_replace_tv_alert`:** Write test and implement.
  - [ ] **TDD - `insert_or_update_aie_subscriber`:** Write test and implement.
  - [ ] **TDD - `get_aie_subscriber`:** Write test and implement.
  - [ ] **TDD - `assign_role_to_user`:** Write test and implement.
  - [ ] **TDD - `remove_role_from_user`:** Write test and implement.
  - [ ] **TDD - `get_user_roles`:** Write test and implement.
  - [ ] **TDD - `user_has_role`:** Write test and implement.
  - [ ] **Final Check:** Confirm every public method from `helper_storage_service.py` has a corresponding, tested method in `storage.ts`.

- [ ] **Task 1.2: Port Auth Logic to Middleware**
  - [ ] **Analyze:** Review `@discord_token_required`, `@patreon_token_required`, `@discord_admin_required`. The goal is to replace this pattern with a central `middleware.ts` for cleaner, more secure, and more performant route protection.
  - [ ] **Create `middleware.ts`**: Create `src/middleware.ts` in the project root.
  - [ ] **TDD - `getSessionFromCookie` helper:**
    - [ ] Create `src/lib/auth/session.test.ts`.
    - [ ] Write tests for a `getSessionFromCookie` function. Test cases must include: no cookie, invalid/expired cookie, and valid cookie. Use `vi.mock` for `next/headers` and the ported `StorageService`.
    - [ ] Implement the helper in `src/lib/auth/session.ts` to pass the tests.
  - [ ] **Implement Middleware Logic:** In `middleware.ts`, import `getSessionFromCookie`. If the session is invalid for a protected path, return `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`. If valid, use `NextResponse.next()`.
  - [ ] **Define Middleware Matcher:** Configure the `matcher` in `middleware.ts`. This list will be populated in Phase 2 as each protected route is ported.

- [ ] **Task 1.3: Commit Core Setup**
  - [ ] Commit all changes to the current branch with the message "P1: Core services and environment setup complete".
```

---
End of P1-core.md 