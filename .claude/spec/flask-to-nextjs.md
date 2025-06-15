This plan is designed for a sophisticated coding agent like Claude Code. It is exhaustive, leaves no room for ambiguity, and integrates modern best practices directly into the TDD workflow. Every single file from the Flask API is accounted for.

---

```markdown
# MIGRATION_CHECKLIST.md
# Project: Port `flask-api` to `ai-edge-docs` Next.js App Router API.
# Source of Truth: The behavior and test suite of the `flask-api` directory.
# Status: IN-PROGRESS

This document is the master checklist and stateful scratchpad for the migration. It must be updated after each task is completed. The `flask-api` directory in the root is the read-only reference.

## Phase 0: Project Foundation & Environment Setup

- [ ] **Task 0.1: Install Core Production Dependencies**
  - [ ] Execute in `ai-edge-docs` root: `npm install @azure/data-tables stytch patreon stripe zod @upstash/ratelimit @vercel/kv`.

- [ ] **Task 0.2: Install Testing Framework & Dependencies**
  - [ ] Execute in `ai-edge-docs` root: `npm install -D vitest @vitest/ui jsdom`.

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

---
## Phase 2: Porting API Routes (Granular TDD & Enhancement Workflow)
For each endpoint, follow all sub-steps. This ensures fidelity and incorporates best practices.

- [ ] **Task 2.1: Port `flask-api/route_app_version.py`**
  - [ ] **Source:** `flask-api/route_app_version.py`
  - [ ] **Target:** `app/api/app-version/route.ts`
  - [ ] 1. Create test file `app/api/app-version/route.test.ts`.
  - [ ] 2. Write a failing Vitest test for the `GET` handler asserting a 200 status and a plain text response identical to the Flask API's output.
  - [ ] 3. Implement the `GET` handler in `route.ts`.
  - [ ] 4. Enhance (Caching): Add `export const revalidate = 86400;` to the `route.ts` file.
  - [ ] 5. Delete the old Next.js file: `pages/api/app-version.ts`.

- [ ] **Task 2.2: Port `flask-api/route_users.py` Endpoints**
  - [ ] **Sub-Task 2.2.1: Endpoint `/api/users/check-displayname`**
    - [ ] **Source:** `flask-api/route_users.py`
    - [ ] **Target:** `app/api/users/check-displayname/route.ts`
    - [ ] 1. Create test file `app/api/users/check-displayname/route.test.ts`.
    - [ ] 2. Write failing `POST` tests mocking the request body and the ported `StorageService.isDisplayNameTaken`.
    - [ ] 3. Implement the `POST` handler in `route.ts`.
    - [ ] 4. Enhance (Validation): In `src/lib/schemas.ts`, define `CheckDisplayNameSchema = z.object({ displayName: z.string().min(1) })`. Apply it in the handler.
    - [ ] 5. Enhance (Rate Limiting): Implement `@upstash/ratelimit` with Vercel KV.
    - [ ] 6. Delete old file: `pages/api/users/check-displayname.ts`.
  - [ ] **Sub-Task 2.2.2: Endpoint `/api/users/profile` (PUT)**
    - [ ] **Source:** `flask-api/route_users.py`
    - [ ] **Target:** `app/api/users/profile/route.ts`
    - [ ] 1. Create test file.
    - [ ] 2. Write failing `PUT` tests mocking middleware (auth) and storage service calls.
    - [ ] 3. Implement the `PUT` handler in `route.ts`.
    - [ ] 4. Enhance with a Zod schema for the request body.
    - [ ] 5. Add `/api/users/profile` to the middleware matcher in `src/middleware.ts`.
    - [ ] 6. Delete old file `pages/api/users/profile.ts`.
  - [ ] **Sub-Task 2.2.3: Endpoint `/api/users/profile/[user_id]` (GET)**
    - [ ] **Source:** `flask-api/route_users.py`
    - [ ] **Target:** `app/api/users/profile/[user_id]/route.ts`.
    - [ ] 1. Create test file. Write a test for a public profile GET. Mock `StorageService.getUserProfile`.
    - [ ] 2. Implement the `GET` handler.
    - [ ] 3. Enhance (Caching): This is a candidate for `revalidateTag` caching, invalidated by the `PUT` endpoint.
    - [ ] 4. Delete old file `pages/api/users/profile/[user_id].ts`.

- [ ] **Task 2.3: Unify and Port `me` Endpoints**
  - [ ] **Source:** `flask-api/route_me.py`, `flask-api/route_patreon_me.py`, `flask-api/route_discord_me.py`
  - [ ] **Target:** `app/api/auth/me/route.ts`
  - [ ] 1. Create test file `app/api/auth/me/route.test.ts`.
  - [ ] 2. Write a failing test that asserts the unified response structure: `{ user: ..., isAuthenticated: true, connections: { discord: ..., patreon: ... } }`.
  - [ ] 3. Implement the `GET` handler in `route.ts` to fetch core user data and all connection statuses from the ported services.
  - [ ] 4. Add `/api/auth/me` to the `matcher` in `middleware.ts`.
  - [ ] 5. Delete old files: `pages/api/auth/me.ts`, `pages/api/patreon/me.ts`, `pages/api/discord/me.ts`.

- [ ] **Task 2.4: Port `flask-api/route_blog_comments.py`**
  - [ ] **Sub-Task 2.4.1: Endpoint `/api/blog/[slug]/comments` (GET & POST)**
    - [ ] **Target:** `app/api/blog/[slug]/comments/route.ts`.
    - [ ] 1. Create test file. Write failing tests for `GET` (public) and `POST` (authenticated).
    - [ ] 2. Implement `GET` and `POST` handlers.
    - [ ] 3. Enhance `GET` with `tags` based caching.
    - [ ] 4. Enhance `POST` with `revalidateTag` and a Zod schema for the comment body.
    - [ ] 5. Delete old file `pages/api/blog/[slug]/comments.ts`.
  - [ ] **Sub-Task 2.4.2: Endpoint `/api/blog/[slug]/comments/[comment_id]` (DELETE)**
    - [ ] **Target:** `app/api/blog/[slug]/comments/[comment_id]/route.ts`.
    - [ ] 1. Create test file. Write failing `DELETE` test mocking auth and ownership check.
    - [ ] 2. Implement `DELETE` handler.
    - [ ] 3. Enhance `DELETE` with `revalidateTag`.
    - [ ] 4. Delete old file `pages/api/blog/[slug]/comments/[comment_id].ts`.

- [ ] **Task 2.5: Port OAuth and Auth Routes**
  - [ ] **Sub-Task 2.5.1: Port `flask-api/route_stytch_auth.py` and `flask-api/helper_stytch_auth.py`**
    - [ ] Port `handle_signup` logic to `app/api/auth/signup/route.ts`.
    - [ ] Port `handle_login` logic to `app/api/auth/login/route.ts`.
    - [ ] Port `handle_logout` logic to `app/api/auth/logout/route.ts`.
    - [ ] Port `handle_google_oauth_callback` to `app/api/auth/oauth-callback/google/route.ts`.
  - [ ] **Sub-Task 2.5.2: Port `flask-api/helper_oauth2_patreon.py`**
    - [ ] Port `oauth2_patreon` logic to `app/api/auth/patreon/callback/route.ts`.
  - [ ] **Sub-Task 2.5.3: Port `flask-api/helper_oauth2_discord.py`**
    - [ ] Port `oauth2_discord` logic to `app/api/connections/discord/callback/route.ts`.

- [ ] **Task 2.6: Port Administrative and Other Routes**
  - [ ] **Sub-Task 2.6.1: Port `flask-api/route_beta_register.py`** to `app/api/beta/register/route.ts` (Add Zod & Rate Limiting).
  - [ ] **Sub-Task 2.6.2: Port `flask-api/route_tv_admin_find_terminated.py`** to `app/api/tv-admin/find-terminated/route.ts`.
  - [ ] **Sub-Task 2.6.3: Port `flask-api/route_tv_admin_revoke_access.py`** to `app/api/tv-admin/revoke-access/route.ts`.
  - [ ] **Sub-Task 2.6.4: Port `flask-api/routes_composite_symbols.py`** to `app/api/composite-symbols/...` (Consider caching).
  - [ ] **Sub-Task 2.6.5: Port `flask-api/alert_tv.py`** to `app/api/tv-alert/route.ts`.
  - [ ] **Sub-Task 2.6.6: Port `flask-api/route_stripe.py`** to `app/api/stripe/...`. The webhook endpoint must be configured to receive the raw body for signature verification.

---
## Phase 3: Final Verification & Cleanup (Agent-Executable)

- [ ] **Task 3.1: Final Code Review & Linting**
  - [ ] Execute `npx eslint . --fix`.
  - [ ] Search the project for the string ` any` and replace with specific TypeScript types.

- [ ] **Task 3.2: Final Test Suite Execution**
  - [ ] Execute `npm test`.
  - [ ] Confirm 100% pass rate.

- [ ] **Task 3.3: Directory Cleanup**
  - [ ] Confirm `pages/api` is empty.
  - [ ] Execute `rm -rf pages/api`.

---
## Phase 4: Human-in-the-Loop Verification & Deployment

- [ ] **Task 4.1: Secure Production Environment Variables on Vercel**
  - [ ] **Action (Human):** Manually add all secrets from `.env.local` to the Production environment in the Vercel project settings.

- [ ] **Task 4.2: Vercel Preview Deployment & E2E Testing**
  - [ ] **Action (Agent):** Commit all changes and push to a new Git branch. Create a Pull Request.
  - [ ] **Action (Human):** Perform a full manual regression test on the Vercel Preview URL.

- [ ] **Task 4.3: Production Go-Live**
  - [ ] **Action (Human):** Merge the Pull Request. Monitor the production deployment on Vercel.

- [ ] **Task 4.4: Decommissioning**
  - [ ] **Action (Human):** After a confirmation period, archive the `flask-api` project and shut down its Vercel deployment.

## Notes & Scratchpad
*(Agent: Log command outputs, issues, and decisions here.)*
-
```