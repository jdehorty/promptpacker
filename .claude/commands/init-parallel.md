# Parallel Task Execution for Multiple Features and Worktrees

<prompt_purpose>
This script is designed to automate the creation of multiple git worktrees for one or more software features.
For each specified feature, it will set up a defined number of parallel development environments.
Each environment will have its own branch, a copy of the server environment configuration, and independently installed client and server dependencies.
Client ports will be assigned dynamically and sequentially to ensure no conflicts.
</prompt_purpose>

<usage_example>
  To run this command in the Claude Code terminal, you would type something like:
  `/init-parallel "stripe-subscription-refactor blog-comments-api" 2`

  This would initialize two features, "stripe-subscription-refactor" and "blog-comments-api", each with 2 parallel worktrees for development and comparison.
</usage_example>

<variables_definition>
  <variable>
    <name>FEATURE_NAMES_ARG</name>
    <description>A space-separated string of feature names. Each word will be treated as a distinct feature. Example: "feature-A feature-B"</description>
    <source>$ARGUMENTS</source>
  </variable>
  <variable>
    <name>WORKTREES_PER_FEATURE_ARG</name>
    <description>The number of parallel worktrees to create for *each* feature specified in FEATURE_NAMES_ARG. Example: 3</description>
    <source>$ARGUMENTS</source>
  </variable>
</variables_definition>

<execution_plan>
  <step>
    <description>Create the main directory to house all worktrees if it doesn't already exist.</description>
    <command>CREATE new directory `trees/`</command>
  </step>
  <step>
    <description>Initialize a global counter. This counter ensures that each client across all worktrees and all features receives a unique port number, starting from 5173.</description>
    <command>SET `_global_worktree_index = 0`</command>
  </step>
  <loop_over_features>
    <description>Iterate through each feature name provided in the FEATURE_NAMES_ARG.</description>
    <iterator>each_feature</iterator>
    <collection>FEATURE_NAMES_ARG (split by space)</collection>
    <loop_body>
      <loop_over_worktrees_per_feature>
        <description>For the current feature (`each_feature`), create the specified number of parallel worktrees (`WORKTREES_PER_FEATURE_ARG`).</description>
        <iterator>i</iterator>
        <collection>WORKTREES_PER_FEATURE_ARG</collection>
        <loop_body>
          <step>
            <description>Calculate a unique port for the current worktree's client.</description>
            <command>SET `_current_port = 5173 + _global_worktree_index`</command>
          </step>
          <step>
            <description>Create a new git worktree. The branch name will be `each_feature-i` and it will be located in `./trees/each_feature-i`.</description>
            <command>RUN `git worktree add -b each_feature-i ./trees/each_feature-i`</command>
          </step>
          <step>
            <description>Copy the base server environment configuration to the new worktree's server directory.</description>
            <command>RUN `cp ./server/.env ./trees/each_feature-i/server/.env`</command>
          </step>
          <step>
            <description>Navigate to the server directory of the new worktree and install server-side dependencies using `uv sync`.</description>
            <command>RUN `cd ./trees/each_feature-i/server`, `uv sync`</command>
          </step>
          <step>
            <description>Navigate to the client directory of the new worktree and install client-side dependencies using `pnpm install`.</description>
            <command>RUN `cd ../client`, `pnpm install`</command>
          </step>
          <step>
            <description>Update the client's Vite configuration file to use the dynamically assigned `_current_port`.</description>
            <command>UPDATE `./trees/each_feature-i/client/vite.config.ts`:</command>
            <details>
              <change>Set `port` to `_current_port`.</change>
            </details>
          </step>
          <step>
            <description>Verify that the client port was updated correctly by displaying the contents of the Vite config file.</description>
            <command>RUN `cat ./trees/each_feature-i/client/vite.config.ts`</command>
          </step>
          <step>
            <description>Validate the worktree by listing its files.</description>
            <command>RUN `cd trees/each_feature-i`, `git ls-files`</command>
          </step>
          <step>
            <description>Increment the global worktree index to ensure the next worktree (if any) gets a new unique port.</description>
            <command>INCREMENT `