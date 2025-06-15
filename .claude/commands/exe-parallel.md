# Parallel Task Execution for Multiple Features and Worktrees

<prompt_purpose>
This script orchestrates the parallel execution of a given engineering plan across multiple pre-initialized git worktrees.
For each feature and its corresponding worktrees (as set up by a script like 'init-parallel-advanced.md'), this script will delegate tasks to subagents.
Each subagent will independently implement the engineering plan within its assigned worktree.
The primary goal is to enable concurrent development and testing of different approaches or versions of features, facilitating comparison and selection of the best implementation.
</prompt_purpose>

<usage_example>
  To run this command in the Claude Code terminal, you would type something like:
  `/exe-parallel "patreon-oauth-v2 tv-webhook-processing" 2 "./api-specs/patreon_oauth_v2_implementation.md"`

  This would execute the plan for two Flask API features, "patreon-oauth-v2" and "tv-webhook-processing", across 2 worktrees each, using the engineering plan found in "./api-specs/patreon_oauth_v2_implementation.md".
</usage_example>

<variables_definition>
  <variable>
    <name>FEATURE_NAMES_ARG</name>
    <description>A space-separated string of feature names. This must match the feature names used during the initialization phase. Example: "feature-A feature-B"</description>
    <source>$ARGUMENTS</source>
  </variable>
  <variable>
    <name>WORKTREES_PER_FEATURE_ARG</name>
    <description>The number of parallel worktrees that were created for *each* feature. This must match the number used during initialization. Example: 3</description>
    <source>$ARGUMENTS</source>
  </variable>
  <variable>
    <name>PLAN_TO_EXECUTE_ARG</name>
    <description>The file path to the markdown document containing the detailed engineering plan to be executed by each subagent. Example: "./docs/my_feature_plan.md"</description>
    <source>$ARGUMENTS</source>
  </variable>
</variables_definition>

<execution_plan>
  <initial_verification_steps>
    <step>
      <description>Display the directory structure of the 'flask-api' directory for context.</description>
      <command>RUN `eza flask-api --tree --git-ignore`</command>
    </step>
    <step>
      <description>Display the directory structure of the 'src' directory for context.</description>
      <command>RUN `eza src --tree --git-ignore`</command>
    </step>
    <step>
      <description>Display the directory structure of the 'pages' directory for context.</description>
      <command>RUN `eza pages --tree --git-ignore`</command>
    </step>
    <step>
      <description>Display the directory structure of the 'app' directory for context (assuming App Router structure).</description>
      <command>RUN `eza app --tree --git-ignore`</command>
    </step>
    <step>
      <description>Display the top-level structure of the 'trees' directory to confirm worktree locations.</description>
      <command>RUN `eza trees --tree --level 3`</command>
    </step>
    <step>
      <description>Fetch Next.js best practices for Vercel using the App Router pattern for context.</description>
      <command>WEBSEARCH: "Next.js App Router Vercel best practices"</command>
    </step>
    <step>
      <description>Read and confirm the content of the engineering plan that will be executed.</description>
      <command>READ: PLAN_TO_EXECUTE_ARG</command>
    </step>
  </initial_verification_steps>
  </initial_verification_steps>

  <parallel_execution_instructions>
    <introduction>
      The following tasks will create `WORKTREES_PER_FEATURE_ARG` subagents for each feature listed in `FEATURE_NAMES_ARG`.
      Each subagent will use the Task tool to implement the engineering plan from `PLAN_TO_EXECUTE_ARG` within its designated worktree.
      This allows for concurrent development and isolated testing of each feature version.
    </introduction>

    <loop_over_features>
      <description>Iterate through each feature name provided in `FEATURE_NAMES_ARG`.</description>
      <iterator>each_feature</iterator>
      <collection>FEATURE_NAMES_ARG (split by space)</collection>
      <loop_body>
        <loop_over_worktrees_per_feature>
          <description>For the current feature (`each_feature`), iterate `WORKTREES_PER_FEATURE_ARG` times to address each parallel worktree.</description>
          <iterator>i</iterator>
          <collection>WORKTREES_PER_FEATURE_ARG</collection>
          <loop_body>
            <subagent_task>
              <description>Define the task for the subagent operating on `each_feature` in worktree `i`.</description>
              <target_worktree_path>./trees/each_feature-i/</target_worktree_path>
              <instructions_for_subagent>
                You are an AI assistant assigned to work within the directory: `{{target_worktree_path}}`.
                Your task is to implement the engineering plan detailed in the document specified by `PLAN_TO_EXECUTE_ARG` (which is '{{PLAN_TO_EXECUTE_ARG}}' in the parent context).
                Focus exclusively on making the necessary code changes as per the plan.
                Do NOT run any scripts that would start a server or client (e.g., `start.sh`, `dev` scripts).
                Upon completion of your work, create a comprehensive markdown file named `RESULTS.md` at the root of your workspace (`{{target_worktree_path}}RESULTS.md`). This file should detail all changes you made, including file modifications, creations, and deletions, along with explanations for your key decisions.
              </instructions_for_subagent>
            </subagent_task>
          </loop_body>
        </loop_over_worktrees_per_feature>
      </loop_body>
    </loop_over_features>
  </parallel_execution_instructions>

  <final_notes>
    <note>After all subagents complete their tasks, review the `RESULTS.md` file in each respective worktree (e.g., `trees/feature-A-1/RESULTS.md`, `trees/feature-A-2/RESULTS.md`, etc.).</note>
    <note>Compare the implementations to select the best approach or to merge desirable changes.</note>
  </final_notes>
</execution_plan> 