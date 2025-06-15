# MIGRATION_CHECKLIST_P2C_OAUTH.md
# Project: Port `flask-api` to `ai-edge-docs` Next.js App Router API.
# Part 2C: API Routes - OAuth & Auth Callbacks
# Source of Truth: The behavior and test suite of the `flask-api` directory.
# Status: IN-PROGRESS

This document is for migrating OAuth and various auth callback routes. Assumes P1 (Core Services) is complete.

---
## Phase 2: Porting API Routes (Granular TDD & Enhancement Workflow) - Continued

- [x] **Task 2.5: Port OAuth and Auth Routes**
  - [x] **Sub-Task 2.5.1: Port `flask-api/route_stytch_auth.py` and `flask-api/helper_stytch_auth.py`**
    - [x] Port `handle_signup` logic to `app/api/auth/signup/route.ts`.
    - [x] Port `handle_login` logic to `app/api/auth/login/route.ts`.
    - [x] Port `handle_logout` logic to `app/api/auth/logout/route.ts`.
    - [x] Port `handle_google_oauth_callback` to `app/api/auth/oauth-callback/google/route.ts`.
  - [x] **Sub-Task 2.5.2: Port `flask-api/helper_oauth2_patreon.py`**
    - [x] Port `oauth2_patreon` logic to `app/api/auth/patreon/callback/route.ts`.
  - [x] **Sub-Task 2.5.3: Port `flask-api/helper_oauth2_discord.py`**
    - [x] Port `oauth2_discord` logic to `app/api/connections/discord/callback/route.ts`.

- [x] **Final Step: Commit Changes**
  - [x] Commit all changes to the current branch with the message "P2C: OAuth and auth callback routes complete".

---
End of P2C-oauth.md 