# Optimize prompt engineering for Anthropic models
_Exported on 6/14/2025 at 22:20:50 CDT from Cursor (1.0.0)_

---

**User**

@Web Look up the best practices according to Anthropic on how to prompt engineer for the Anthropic models.  Using what you learn in terms of best practices for prompt engineering anthropic models, please take my prompt and optimize it accordingly. @CLAUDE.md 

---

**Cursor**

Based on my research into Anthropic's prompt engineering best practices, I've identified several key principles to improve the effectiveness of prompts for Claude models. I will first summarize these practices and then apply them to optimize your `CLAUDE.md` file.

### Key Prompt Engineering Best Practices for Anthropic Models

According to Anthropic's documentation, the most effective prompts are clear, direct, and provide context. Here are the core strategies:

1.  **Be Explicit and Direct**: Clearly state what you want the model to do. For more complex tasks, providing detailed instructions helps the model understand the goal and deliver better results. Instead of saying "Create an analytics dashboard," a more effective prompt would be "Create an analytics dashboard. Include as many relevant features and interactions as possible. Go beyond the basics to create a fully-featured implementation" ([Anthropic Docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)).

2.  **Provide Context**: Explain *why* a particular instruction is important. This helps the model grasp the underlying motivation and generate a more targeted response. For example, instead of just saying "NEVER use ellipses," it's better to explain: "Your response will be read aloud by a text-to-speech engine, so never use ellipses since the text-to-speech engine will not know how to pronounce them" ([Anthropic Docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)).

3.  **Use XML Tags for Structure**: Organize your prompt using XML tags (e.g., `<context>`, `<instructions>`). This helps the model differentiate between different parts of the prompt, such as background information, examples, and specific instructions, leading to a more structured and accurate output ([Anthropic Docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)).

4.  **Frame Instructions Positively**: Tell the model what to do, rather than what *not* to do. Instead of "Do not use markdown," a better instruction is "Your response should be composed of smoothly flowing prose paragraphs" ([Anthropic Docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)).

5.  **Assign a Role**: Start the prompt by giving the model a role (e.g., "You are an expert AI software engineer"). This helps frame the interaction and sets the tone and context for the desired output ([Anthropic Docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview)).

I will now apply these principles to optimize your `CLAUDE.md` file to be more effective. The new version will be more structured, provide clearer context, and use positive framing for its instructions.

I will now update the `CLAUDE.md` file with the improved prompt.

```markdown
# AI Assistant Development Guidelines

<role>
You are an expert AI software engineer. Your primary goal is to assist in developing a robust, maintainable, and high-quality Next.js application. You will be helping to deploy this application to Vercel.
</role>

<project_context>
## Current State
The project has recently migrated its backend from a Python/Flask API to a Next.js framework. We are now in the critical phase of making our first deployments to the Vercel preview environment.

## Historical Artifacts
The codebase contains a `flask-api` directory. This is a legacy artifact from the previous implementation, kept for historical reference only. For all development tasks, you must treat the Next.js implementation as the single source of truth and not draw upon the `flask-api` code.
</project_context>

<key_guidelines>
## Guiding Principle: Quality and Sustainability
Our core principle is to build for the long term. This means prioritizing code quality, maintainability, and robust solutions over quick fixes.

## Handling Build Errors
When you encounter build errors, especially during Vercel deployment, your task is to diagnose and resolve the root cause. 
- **Prioritize Root Cause Analysis:** Invest the effort to understand *why* an error is occurring.
- **Implement Robust Fixes:** Create solutions that are correct and sustainable.
- **Avoid Technical Debt:** Do not implement "solutions" that disable or bypass parts of the application (e.g., commenting out components) to get the build to pass. This approach is strictly forbidden as it introduces technical debt and undermines the stability of our application. A failing build is a signal that something needs to be fixed properly.
</key_guidelines>

<final_instruction>
Always adhere to these guidelines to ensure our development practices lead to a successful and maintainable product.
</final_instruction>

```

I have updated `CLAUDE.md` with the optimized prompt based on Anthropic's best practices. This new version should provide clearer, more effective guidance for our interactions. If you have any other prompts or files you'd like me to review, please let me know

---

**User**

Now please do this again for the following task.  Put your final prompt in this file.  

Here is the task. 

What are you trying to do right now? I'm trying to get our first deployment with the new Next.js backend to build cleanly and deploy successfully on Vercel. And I need you to help me brainstorm ways to design a task that would lead I need Claude code to optimally solving this and fulfilling my task without going off the rails. By going off the rails, I mean things like disabling core components as a lazy way to circumnavigate build problems. All that does is create additional technical debt. 

I want you now to once again research the best practices and apply them to creating a prompt that will allow this task to be fulfilled with high fidelity and minimal distractions. @fix-build.md 

---

**Cursor**

Of course. Based on my research and understanding of Anthropic's prompt engineering best practices, I will create a detailed, structured prompt to guide the AI in successfully deploying the Next.js application to Vercel while avoiding common pitfalls.

The key is to create a prompt that acts as a comprehensive plan, guiding the AI through a systematic process of diagnosis and resolution, rather than just stating the end goal. This involves setting a clear role, defining the objective and context, establishing a step-by-step execution plan, and explicitly stating the guiding principles and constraints.

I will now write this new, optimized prompt into the `.claude/spec/fix-build.md` file.

```markdown
# Vercel First Deployment Troubleshooting Protocol

<role>
You are an expert Vercel deployment specialist and senior Next.js developer. Your mission is to diagnose and resolve any issues preventing the successful first deployment of our new Next.js application to the Vercel preview environment.
</role>

<objective>
To achieve a clean, successful, and sustainable first deployment of the Next.js application on Vercel. This means the build completes without errors, the site is deployed to a preview URL, and all core application functionality remains intact and enabled.
</objective>

<context>
The application was recently migrated from a Python/Flask backend to Next.js. This is our **first attempt** to deploy the new stack to Vercel. We anticipate potential issues related to environment configuration, build settings, dependency mismatches, or code incompatibilities with the Vercel environment. Your task is to act as the primary troubleshooter.
</context>

<execution_plan>
Follow this systematic process. Do not skip steps.

1.  **Initiate Build & Analyze Logs:**
    *   Trigger a new deployment on Vercel (or analyze the most recent failed one).
    *   Carefully and thoroughly analyze the complete build logs provided by Vercel. Isolate the specific error message that caused the failure.

2.  **Formulate Hypothesis:**
    *   Based on the error, formulate a precise hypothesis about the root cause.
    *   Examples: "The build is failing due to a missing environment variable (`XYZ_API_KEY`)." or "The error `Module not found: Can't resolve 'fs'` indicates that a server-side module is incorrectly being included in the client-side bundle."

3.  **Propose a Targeted Solution:**
    *   Based on your hypothesis, propose a specific, minimal, and correct code or configuration change.
    *   Provide the exact code modification or configuration adjustment needed.

4.  **Provide Rationale (Crucial Step):**
    *   For every proposed solution, you **must** provide a clear, step-by-step explanation of your reasoning.
    *   Explain how the identified error log points to your hypothesis and why your proposed solution is the correct, most effective way to solve it.
    *   Justify that your solution is robust and does not introduce technical debt.

5.  **Verify and Iterate:**
    *   After applying the fix, we will trigger a new build.
    *   If the build fails again, restart this process from Step 1, analyzing the new error logs. The iterative process of "analyze -> hypothesize -> solve -> explain" is the core of this task.
</execution_plan>

<guiding_principles>
-   **Root Cause Resolution is Mandatory:** Your primary directive is to find and fix the underlying cause of a problem.
-   **Sustainability Over Speed:** The goal is a healthy, maintainable codebase. A successful build achieved by crippling the application is a failure of the task.

<forbidden_actions>
To be perfectly clear, the following actions are **strictly prohibited** as they create technical debt and mask real problems:
-   Commenting out or disabling components, pages, or features.
-   Removing or "gutting" code that appears to be causing an issue without understanding its purpose.
-   Adding placeholder or "dummy" values to bypass type errors or validation.
-   Suppressing error messages without resolving the underlying issue.

If you are unable to find a robust solution, you should state that clearly and ask for guidance, rather than resorting to a prohibited action.
</guiding_principles>

```

I have created the detailed prompt in `.claude/spec/fix-build.md` as requested. It is structured to guide the AI through a methodical debugging process for your Vercel deployment, ensuring that solutions are robust and that technical debt is avoided. This prompt should provide the high-fidelity guidance you're looking for.

