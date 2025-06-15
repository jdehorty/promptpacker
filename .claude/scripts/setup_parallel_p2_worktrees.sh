#!/bin/bash

# Script to set up parallel worktrees for P2 migration tasks (P2A, P2B, P2C, P2D)

# Check if a base branch name is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <base_branch_name>"
  echo "Example: $0 flask-migration-v1-0"
  exit 1
fi

BASE_BRANCH_NAME="$1"
PROJECT_ROOT=$(git rev-parse --show-toplevel)
WORKTREES_DIR="$PROJECT_ROOT/trees" # Assuming 'trees' is your worktree container dir

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Setting up parallel P2 worktrees based on branch: ${YELLOW}${BASE_BRANCH_NAME}${NC}"

# Ensure the main worktrees directory exists (it should if init-parallel was run)
mkdir -p "$WORKTREES_DIR"

# P2 Task Prefixes
P2_TASKS=("P2A" "P2B" "P2C" "P2D")

for task_prefix in "${P2_TASKS[@]}"; do
  new_branch_name="${task_prefix}-${BASE_BRANCH_NAME}"
  worktree_path="${WORKTREES_DIR}/${new_branch_name}"

  echo -e "\n${BLUE}Processing ${task_prefix}...${NC}"

  # Check if worktree path already exists
  if [ -d "$worktree_path" ]; then
    echo -e "${YELLOW}Worktree directory ${worktree_path} already exists. Skipping creation.${NC}"
    # Optionally, you might want to check if the branch exists and matches BASE_BRANCH_NAME
    # For now, we'll just skip if the directory is there.
    # You could add: git worktree remove --force "$worktree_path"
    # And: git branch -D "$new_branch_name"
    # if you want to ensure a clean setup each time.
  else
    echo -e "Creating worktree at ${GREEN}${worktree_path}${NC} for branch ${GREEN}${new_branch_name}${NC} from ${YELLOW}${BASE_BRANCH_NAME}${NC}"
    if git worktree add -b "$new_branch_name" "$worktree_path" "$BASE_BRANCH_NAME"; then
      echo -e "${GREEN}✓ Successfully created worktree for ${task_prefix}.${NC}"
    else
      echo -e "${RED}✗ Failed to create worktree for ${task_prefix}. Please check for errors.${NC}"
      # Consider exiting if a worktree creation fails
      # exit 1 
    fi
  fi
done

echo -e "\n${GREEN}P2 worktree setup process complete.${NC}"
echo -e "${YELLOW}Please verify the worktrees in the '${WORKTREES_DIR}' directory.${NC}"
echo -e "${YELLOW}You can now run the P2A, P2B, P2C, P2D plans in their respective worktrees in parallel using separate Claude Code sessions.${NC}" 