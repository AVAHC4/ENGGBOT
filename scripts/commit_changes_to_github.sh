#!/bin/bash

# Script to automatically commit and push changes to GitHub with AI-generated commit messages
# Usage: ./scripts/commit_changes_to_github.sh

set -e  # Exit on any error

echo "🔍 Checking git status..."
git status

echo ""
echo "📝 Staging all changes..."
git add .

echo ""
echo "🔍 Checking what changes are being committed..."
CHANGED_FILES=$(git diff --cached --name-status)
if [ -z "$CHANGED_FILES" ]; then
    echo "❌ No changes to commit!"
    exit 1
fi

echo "Changed files:"
echo "$CHANGED_FILES"

echo ""
echo "💭 Analyzing changes to generate commit message..."

# Get detailed diff for analysis (limit to prevent huge outputs)
DIFF_STAT=$(git diff --cached --stat | head -20)
DIFF_CONTENT=$(git diff --cached --unified=3 | head -100)

# Extract file changes summary
ADDED_FILES=$(echo "$CHANGED_FILES" | grep "^A" | wc -l | tr -d ' ')
MODIFIED_FILES=$(echo "$CHANGED_FILES" | grep "^M" | wc -l | tr -d ' ')
DELETED_FILES=$(echo "$CHANGED_FILES" | grep "^D" | wc -l | tr -d ' ')

# Analyze what kind of changes were made
COMMIT_MSG=""
COMMIT_TYPE=""

# Detect new features
if [ "$ADDED_FILES" -gt 0 ]; then
    if echo "$CHANGED_FILES" | grep -q "projects/"; then
        COMMIT_TYPE="feat"
        COMMIT_MSG="Add ChatGPT-style projects feature with workspaces and custom instructions"
    elif echo "$CHANGED_FILES" | grep -q "components/.*dialog"; then
        COMMIT_TYPE="feat"
        COMMIT_MSG="Add new dialog components for enhanced UX"
    elif echo "$CHANGED_FILES" | grep -q "page\.tsx"; then
        COMMIT_TYPE="feat"
        COMMIT_MSG="Add new $(echo "$CHANGED_FILES" | grep "page\.tsx" | sed 's/.*app\/\([^/]*\).*/\1/' | head -1) page"
    elif echo "$CHANGED_FILES" | grep -q "\.tsx\|\.ts"; then
        COMMIT_TYPE="feat"
        COMMIT_MSG="Add new components and functionality"
    fi
fi

# Detect fixes
if echo "$DIFF_CONTENT" | grep -qi "fix\|bug\|error\|issue"; then
    COMMIT_TYPE="fix"
    if echo "$DIFF_CONTENT" | grep -qi "calendar"; then
        COMMIT_MSG="Fix calendar visibility and formatting issues"
    elif echo "$DIFF_CONTENT" | grep -qi "404\|route\|url"; then
        COMMIT_MSG="Fix routing and navigation 404 errors"
    elif echo "$DIFF_CONTENT" | grep -qi "background\|style\|css"; then
        COMMIT_MSG="Fix styling and background color issues"
    else
        COMMIT_MSG="Fix bugs and improve stability"
    fi
fi

# Detect refactoring
if [ "$DELETED_FILES" -gt 0 ] && [ "$ADDED_FILES" -gt 0 ]; then
    COMMIT_TYPE="refactor"
    COMMIT_MSG="Refactor code structure and reorganize components"
elif echo "$DIFF_CONTENT" | grep -qi "refactor\|rename\|move"; then
    COMMIT_TYPE="refactor"
    COMMIT_MSG="Refactor codebase for better maintainability"
fi

# Detect style changes
if [ -z "$COMMIT_MSG" ] && echo "$CHANGED_FILES" | grep -q "\\.css\|\\.scss"; then
    COMMIT_TYPE="style"
    COMMIT_MSG="Update styles and visual design"
fi

# Detect documentation
if echo "$CHANGED_FILES" | grep -q "\\.md"; then
    COMMIT_TYPE="docs"
    COMMIT_MSG="Update documentation"
fi

# Detect configuration changes
if echo "$CHANGED_FILES" | grep -q "package\\.json\|yarn\\.lock\|package-lock\\.json"; then
    COMMIT_TYPE="chore"
    COMMIT_MSG="Update dependencies and packages"
elif echo "$CHANGED_FILES" | grep -q "config\|\.json\|\.env"; then
    COMMIT_TYPE="chore"
    COMMIT_MSG="Update configuration files"
fi

# If still no commit message, analyze the actual diff content
if [ -z "$COMMIT_MSG" ]; then
    # Look for common patterns in the diff
    if echo "$DIFF_CONTENT" | grep -qi "props\|interface\|type"; then
        COMMIT_TYPE="feat"
        COMMIT_MSG="Update TypeScript interfaces and component props"
    elif echo "$DIFF_CONTENT" | grep -qi "onClick\|onChange\|onSubmit"; then
        COMMIT_TYPE="feat"
        COMMIT_MSG="Improve event handling and user interactions"
    elif echo "$DIFF_CONTENT" | grep -qi "className\|style=\|bg-\|text-"; then
        COMMIT_TYPE="style"
        COMMIT_MSG="Update component styling and layout"
    elif echo "$DIFF_CONTENT" | grep -qi "import.*from"; then
        COMMIT_TYPE="refactor"
        COMMIT_MSG="Update imports and dependencies"
    else
        COMMIT_TYPE="chore"
        COMMIT_MSG="Update project files"
    fi
fi

# Add specific context based on changed files
SCOPE=""
if echo "$CHANGED_FILES" | grep -q "projects/"; then
    SCOPE="projects"
elif echo "$CHANGED_FILES" | grep -q "calendar"; then
    SCOPE="calendar"
elif echo "$CHANGED_FILES" | grep -q "sidebar"; then
    SCOPE="sidebar"
elif echo "$CHANGED_FILES" | grep -q "chat"; then
    SCOPE="chat"
elif echo "$CHANGED_FILES" | grep -q "teams"; then
    SCOPE="teams"
elif echo "$CHANGED_FILES" | grep -q "auth"; then
    SCOPE="auth"
fi

# Format final commit message (Conventional Commits style)
if [ -n "$SCOPE" ]; then
    FINAL_MSG="$COMMIT_TYPE($SCOPE): $COMMIT_MSG"
else
    FINAL_MSG="$COMMIT_TYPE: $COMMIT_MSG"
fi

echo "📝 Generated commit message:"
echo "   $FINAL_MSG"
echo ""

# Ask for confirmation (optional - comment out if you want auto-commit)
# read -p "❓ Proceed with this commit message? (y/n) " -n 1 -r
# echo
# if [[ ! $REPLY =~ ^[Yy]$ ]]; then
#     echo "❌ Commit cancelled"
#     exit 1
# fi

echo "💾 Committing changes..."
git commit -m "$FINAL_MSG"

echo ""
echo "🚀 Pushing to origin main..."
git push origin main

echo ""
echo "✅ Successfully committed and pushed changes to GitHub!"
echo "📋 Commit message used: $FINAL_MSG"
