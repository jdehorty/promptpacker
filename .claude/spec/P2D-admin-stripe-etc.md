# MIGRATION_CHECKLIST_P2D_ADMIN_STRIPE_ETC.md
# Project: Port `flask-api` to `ai-edge-docs` Next.js App Router API.
# Part 2D: API Routes - Administrative, Stripe, and Other Routes
# Source of Truth: The behavior and test suite of the `flask-api` directory.
# Status: IN-PROGRESS

This document is for migrating administrative, Stripe, and other miscellaneous API routes. Assumes P1 (Core Services) is complete.

---
## Phase 2: Porting API Routes (Granular TDD & Enhancement Workflow) - Continued

- [x] **Task 2.6: Port Administrative and Other Routes**
  - [x] **Sub-Task 2.6.1: Port `flask-api/route_beta_register.py`** to `app/api/beta/register/route.ts` (Add Zod & Rate Limiting).
  - [x] **Sub-Task 2.6.2: Port `flask-api/route_tv_admin_find_terminated.py`** to `app/api/tv-admin/find-terminated/route.ts`.
  - [x] **Sub-Task 2.6.3: Port `flask-api/route_tv_admin_revoke_access.py`** to `app/api/tv-admin/revoke-access/route.ts`.
  - [x] **Sub-Task 2.6.4: Port `flask-api/routes_composite_symbols.py`** to `app/api/composite-symbols/...` (Consider caching).
  - [x] **Sub-Task 2.6.5: Port `flask-api/alert_tv.py`** to `app/api/tv-alert/route.ts`.
  - [x] **Sub-Task 2.6.6: Port `flask-api/route_stripe.py`** to `app/api/stripe/...`. The webhook endpoint must be configured to receive the raw body for signature verification.

- [x] **Final Step: Commit Changes**
  - [x] Commit all changes to the current branch with the message "P2D: Admin, Stripe, and other routes complete".

---
End of P2D-admin-stripe-etc.md 