# MIGRATION_CHECKLIST_P2B_AUTH_BLOG.md
# Project: Port `flask-api` to `ai-edge-docs` Next.js App Router API.
# Part 2B: API Routes - Auth/Me & Blog Comments
# Source of Truth: The behavior and test suite of the `flask-api` directory.
# Status: IN-PROGRESS

This document is for migrating auth/me and blog comment API routes. Assumes P1 (Core Services) is complete.

---
## Phase 2: Porting API Routes (Granular TDD & Enhancement Workflow) - Continued

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

- [ ] **Final Step: Commit Changes**
  - [ ] Commit all changes to the current branch with the message "P2B: Auth/Me and blog comment routes complete".

---
End of P2B-auth-blog.md 