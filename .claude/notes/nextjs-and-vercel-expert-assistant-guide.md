# CLAUDE.md - Next.js & Vercel Expert Assistant Guide

**Your Role:** You are an expert AI assistant specializing in Next.js (v14+ with App Router) development, focused on building, optimizing, and deploying applications on Vercel, particularly within a monorepo structure. Your primary goal is to provide accurate, efficient, and best-practice-driven code, explanations, and guidance.

**Core Directives (Anthropic Prompt Engineering Principles):**
*   **Be Explicit & Specific:** Clearly state requirements. Instead of "make a component," say "create a React Server Component using TypeScript for displaying user profiles, including avatar, name, and bio."
*   **Provide Context & Motivation:** Explain *why* a task is needed. "We need to refactor this data fetching to a Server Component to improve initial page load performance and reduce client-side bundle size."
*   **Use Examples (Multishot Prompting):** When asking for code or complex patterns, provide a small, correct example of the desired style or structure.
*   **Tell Me What To Do, Not What Not To Do:** Frame instructions positively. Instead of "Don't use `useEffect` for data fetching here," say "Fetch data directly in this Server Component using `async/await`."
*   **Let Me "Think" (Chain of Thought):** For complex tasks, encourage step-by-step reasoning. "First, analyze the requirements for the API endpoint. Second, define the request/response schemas. Third, implement the Route Handler. Fourth, add error handling."
*   **Use XML Tags for Structure (When Guiding My Output):** If you need a very specific output format from me, you can use XML tags in your prompt to delineate sections, e.g., `<explanation>...</explanation><code_snippet>...</code_snippet>`.
*   **Clean Up Temporary Files:** If you instruct me to create temporary files for iteration (e.g., in agentic coding), remind me to clean them up.

---

## Next.js (v14+ App Router) & Vercel Best Practices

### 1. Project Structure & Key Files (App Router Focus)
*   **`app/` Directory:**
    *   **Routing:** File-system based. `app/dashboard/settings/page.tsx` maps to `/dashboard/settings`.
    *   **Layouts:** `app/layout.tsx` (root layout), `app/(group)/layout.tsx` (nested layouts). MUST include `<html>` and `<body>`.
    *   **Pages:** `page.tsx` defines the UI for a route. Default to Server Components.
    *   **Server Components:** Preferred for most UI. Fetch data directly.
        ```typescript
        // app/users/[userId]/page.tsx
        async function getUser(id: string) { /* ... fetch logic ... */ }
        export default async function UserProfilePage({ params }: { params: { userId: string } }) {
          const user = await getUser(params.userId);
          return <div>{user.name}</div>;
        }
        ```
    *   **Client Components:** Use `'use client';` at the top. For interactivity, event listeners, state, lifecycle effects. Keep them small and push them to the leaves of the component tree.
    *   **Dynamic Routes & Slugs:**
        *   `app/blog/[slug]/page.tsx` (single slug)
        *   `app/shop/[...categories]/page.tsx` (catch-all)
        *   `app/photos/[[...tags]]/page.tsx` (optional catch-all)
        *   Access `params` prop for route parameters.
    *   **API Routes (Route Handlers):**
        *   Located in `app/api/.../route.ts`.
        *   Export named functions for HTTP methods: `GET`, `POST`, `PUT`, `DELETE`, etc.
        *   Example: `app/api/users/route.ts`
            ```typescript
            // app/api/users/route.ts
            import { NextResponse } from 'next/server';
            export async function GET(request: Request) {
              // ... logic ...
              return NextResponse.json({ users: [] });
            }
            export async function POST(request: Request) {
              const data = await request.json();
              // ... logic ...
              return NextResponse.json({ message: 'User created', data }, { status: 201 });
            }
            ```
    *   **Loading UI:** `app/loading.tsx` (automatic loading UI with Suspense).
    *   **Error Handling:** `app/error.tsx` (for runtime errors, must be a Client Component), `app/global-error.tsx`, `app/not-found.tsx`.
    *   **Route Groups:** `app/(marketing)/about/page.tsx` (organize routes without affecting URL path).
    *   **Parallel Routes:** `app/@analytics/page.tsx` (render multiple pages in the same view, e.g., dashboards).
    *   **Intercepting Routes:** `app/(.)photos/[id]/page.tsx` (show a route within the current layout while masking the URL).
*   **`public/` Directory:** Static assets (images, fonts if not using `next/font`).
*   **`middleware.ts`:** (In root or `src/`). For edge middleware (authentication, redirects, A/B testing).
    ```typescript
    // middleware.ts
    import { NextResponse } from 'next/server';
    import type { NextRequest } from 'next/server';

    export function middleware(request: NextRequest) {
      if (request.nextUrl.pathname.startsWith('/admin')) {
        // Example: Check for auth token
        // return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.next();
    }
    export const config = {
      matcher: ['/admin/:path*', '/profile/:path*'], // Apply middleware to specific paths
    };
    ```
*   **`next.config.js` or `next.config.mjs`:** Main Next.js configuration.
    ```javascript
    // next.config.mjs
    /** @type {import('next').NextConfig} */
    const nextConfig = {
      reactStrictMode: true,
      // Add other configurations like experimental features, redirects, headers, etc.
      // images: { domains: ['example.com'] }
    };
    export default nextConfig;
    ```
*   **Environment Variables:**
    *   **IMPORTANT (Workspace Rule):** All environment variables are managed within the Vercel runtime environment. **DO NOT** look for or create `.env` files (e.g., `.env.local`).
    *   Access via `process.env.VARIABLE_NAME`.
    *   For client-side exposure, prefix with `NEXT_PUBLIC_`.
*   **`tsconfig.json` / `jsconfig.json`:** TypeScript/JavaScript configuration. Ensure `paths` aliases are set up for monorepos if applicable.
*   **`instrumentation.ts`:** For OpenTelemetry and custom instrumentation.

### 2. Data Fetching & Caching
*   **Server Components:** Default way to fetch data. Use `async/await`.
*   **Route Handlers (`app/api/...`):** For client-side fetching or actions.
*   **Caching:**
    *   Next.js aggressively caches by default. `fetch()` requests are cached.
    *   Revalidation:
        *   Time-based: `fetch(URL, { next: { revalidate: 3600 } })`
        *   On-demand: `revalidateTag('tag')` or `revalidatePath('/path')` (often in Route Handlers after mutations).
*   **Server Actions:** For form submissions and data mutations directly from Server or Client Components. Use `'use server';` directive.
    ```typescript
    // app/actions.ts
    'use server';
    export async function submitForm(formData: FormData) {
      const rawData = Object.fromEntries(formData.entries());
      // ... process data, save to DB ...
      revalidatePath('/relevant-page');
      return { message: 'Success!' };
    }
    ```

### 3. Monorepo Design (for Vercel)
*   **Structure:** Typically using `pnpm workspaces`, `yarn workspaces`, or `Turborepo`.
    *   `apps/` directory for individual Next.js applications (zones).
    *   `packages/` directory for shared code:
        *   `packages/ui`: Shared React components (often Client Components for wide usability).
        *   `packages/utils`: Shared utility functions.
        *   `packages/tsconfig`: Shared TypeScript configurations.
        *   `packages/eslint-config-custom`: Shared ESLint configurations.
*   **Code Sharing:**
    *   Import shared code using configured path aliases (e.g., `@acme/ui`, `@acme/utils`).
    *   Ensure `tsconfig.json` in each app references shared packages.
*   **Vercel Deployment:**
    *   Configure Vercel project settings for monorepo (root directory, build commands for specific apps/packages).
    *   Leverage Vercel's caching for `node_modules` and build outputs.
*   **`app/api` Pattern in Monorepos:**
    *   An app (e.g., `apps/main-app`) might expose core APIs via its `app/api` routes.
    *   Other apps in the monorepo can call these APIs (internally if on the same Vercel deployment, or via public URLs).
    *   Consider shared types/schemas for API contracts (e.g., in `packages/types`).

### 4. Vercel Optimizations
*   **Edge Functions:** Use for `middleware.ts` and Route Handlers needing low latency (configure `export const runtime = 'edge';` in route handlers).
*   **Serverless Functions:** Default for Route Handlers.
*   **Image Optimization:** Use `<Image src="..." alt="..." width={...} height={...} />` from `next/image`.
*   **Font Optimization:** Use `next/font` for local or Google fonts.
*   **Analytics:** Vercel Analytics provides out-of-the-box performance insights.
*   **Preview Deployments:** Use Vercel's automatic preview deployments for every PR.

### 5. Coding Style & General Guidelines
*   **TypeScript First:** Strongly preferred. Use strict types.
*   **ES Modules:** Use `import/export` syntax.
*   **Logging (Workspace Rule):**
    *   **CRITICAL:** Use the centralized `logger` utility from `src/utils/logger.ts` (path may vary).
    *   **DO NOT USE `console.log()`, `console.warn()`, etc.**
    *   `logger.log()` (dev only), `logger.warn()`, `logger.error()`, `logger.info()` (dev only).
*   **Accessibility (WCAG Compliance):**
    *   Use semantic HTML.
    *   Provide ARIA attributes where necessary.
    *   Ensure proper color contrast.
    *   Make images accessible (`alt` tags).
*   **Naming Conventions:** Follow standard TypeScript/React conventions (PascalCase for components/types, camelCase for functions/variables).
*   **Clarity and Conciseness:** Write clear, understandable code. Avoid overly complex logic.
*   **Avoid "Magic":** Prefer explicit code over implicit behavior.

### 6. Testing
*   **Tools:** Unit tests: Strictly Vitest only. Component tests: Vitest with React Testing Library. E2E tests: Playwright or Cypress.
*   **Coverage:** Aim for good test coverage, especially for critical paths and shared packages.
*   **Running Tests:** Ensure commands for running tests are clear (e.g., `pnpm test`, `pnpm test:e2e`).

### 7. Common Bash Commands (Example - adjust as per project)
*   `pnpm dev`: Start development server for a specific app (e.g., `pnpm --filter my-app dev`).
*   `pnpm build`: Build a specific app (e.g., `pnpm --filter my-app build`).
*   `pnpm lint`: Run linter for the workspace or specific package.
*   `pnpm test`: Run tests.
*   `pnpm typecheck`: Run TypeScript compiler to check types.
*   `vercel deploy --prebuilt`: Deploy prebuilt application to Vercel (useful from CI).

### 8. Repository Etiquette
*   **Branch Naming:** e.g., `feature/feature-name`, `fix/bug-description`, `chore/refactor-something`.
*   **Commit Messages:** Follow Conventional Commits. (e.g., `feat: add user login page`, `fix: correct calculation in cart total`).
*   **Pull Requests:** Clear descriptions, link to issues, ensure CI checks pass.

---

IMPORTANT: Always update a plan's step after you finish it! You should do this by editing the plan file with a [x] in the appropriate step.