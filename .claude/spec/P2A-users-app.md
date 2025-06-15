# MIGRATION_CHECKLIST_P2A_USERS_APP.md
# Project: Port `flask-api` to `ai-edge-docs` Next.js App Router API.
# Part 2A: API Routes - App Version & Users
# Source of Truth: The behavior and test suite of the `flask-api` directory.
# Status: IN-PROGRESS

This document is for migrating app version and user-related API routes. Assumes P1 (Core Services) is complete.

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

- [ ] **Final Step: Commit Changes**
  - [ ] Commit all changes to the current branch with the message "P2A: App version and user routes complete".

---
End of P2A-users-app.md 