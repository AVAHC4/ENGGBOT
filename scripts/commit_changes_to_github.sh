#!/bin/bash

# Script to automatically commit and push changes to GitHub
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
echo "💭 Generating commit message based on changes..."

# Generate appropriate commit message based on file changes
COMMIT_MSG=""
if echo "$CHANGED_FILES" | grep -q "\.tsx\|\.ts\|\.js\|\.jsx"; then
    if echo "$CHANGED_FILES" | grep -q "^D"; then
        COMMIT_MSG="Refactor: Remove and restructure components"
    elif echo "$CHANGED_FILES" | grep -q "components/"; then
        COMMIT_MSG="Update UI components and interfaces"
    elif echo "$CHANGED_FILES" | grep -q "pages\|app/"; then
        COMMIT_MSG="Update application pages and routing"
    else
        COMMIT_MSG="Update TypeScript/JavaScript code"
    fi
elif echo "$CHANGED_FILES" | grep -q "\.css\|\.scss"; then
    COMMIT_MSG="Update styles and CSS"
elif echo "$CHANGED_FILES" | grep -q "package\.json\|yarn\.lock\|package-lock\.json"; then
    COMMIT_MSG="Update dependencies"
elif echo "$CHANGED_FILES" | grep -q "\.md"; then
    COMMIT_MSG="Update documentation"
elif echo "$CHANGED_FILES" | grep -q "config\|\.json"; then
    COMMIT_MSG="Update configuration files"
else
    COMMIT_MSG="Update project files"
fi

# Add more specific details based on patterns
if echo "$CHANGED_FILES" | grep -q "teams"; then
    COMMIT_MSG="$COMMIT_MSG - Teams functionality"
fi
if echo "$CHANGED_FILES" | grep -q "chat"; then
    COMMIT_MSG="$COMMIT_MSG - Chat interface"
fi
if echo "$CHANGED_FILES" | grep -q "auth"; then
    COMMIT_MSG="$COMMIT_MSG - Authentication"
fi

echo "📝 Commit message: $COMMIT_MSG"
echo ""

echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG"

echo ""
echo "🚀 Pushing to origin main..."
git push origin main

echo ""
echo "✅ Successfully committed and pushed changes to GitHub!"
echo "📋 Commit message used: $COMMIT_MSG"
