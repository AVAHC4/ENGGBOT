#!/bin/bash

# Script to automatically commit and push changes to GitHub with accurate commit messages
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

# Get FULL diff for accurate analysis
DIFF_CONTENT=$(git diff --cached)

# Count file change types
ADDED_FILES=$(echo "$CHANGED_FILES" | grep "^A" | wc -l | tr -d ' ')
MODIFIED_FILES=$(echo "$CHANGED_FILES" | grep "^M" | wc -l | tr -d ' ')
DELETED_FILES=$(echo "$CHANGED_FILES" | grep "^D" | wc -l | tr -d ' ')
TOTAL_FILES=$((ADDED_FILES + MODIFIED_FILES + DELETED_FILES))

# Get list of changed file basenames for the message
get_changed_basenames() {
    echo "$CHANGED_FILES" | awk '{print $2}' | xargs -I {} basename {} | sort -u | head -5
}

# Extract meaningful changes from diff
extract_changes() {
    # Get added lines (excluding import statements and whitespace-only lines)
    ADDED_LINES=$(echo "$DIFF_CONTENT" | grep "^+" | grep -v "^+++" | grep -v "^+$" | grep -v "^+[[:space:]]*$" | grep -v "^+import" | grep -v "^+[[:space:]]*import" | head -20)
    
    # Get removed lines
    REMOVED_LINES=$(echo "$DIFF_CONTENT" | grep "^-" | grep -v "^---" | grep -v "^-$" | grep -v "^-[[:space:]]*$" | grep -v "^-import" | grep -v "^-[[:space:]]*import" | head -20)
    
    echo "$ADDED_LINES"
}

# Detect specific patterns in changes
detect_change_type() {
    local diff="$1"
    
    # Check for specific code patterns to understand what was changed
    if echo "$diff" | grep -qi "useState\|useEffect\|useCallback\|useMemo"; then
        echo "hooks"
    elif echo "$diff" | grep -qi "fetch\|axios\|api/\|endpoint"; then
        echo "api"
    elif echo "$diff" | grep -qi "className\|style=\|css\|backgroundColor\|color:"; then
        echo "styling"
    elif echo "$diff" | grep -qi "onClick\|onChange\|onSubmit\|addEventListener"; then
        echo "events"
    elif echo "$diff" | grep -qi "function\|const.*=.*=>\|async\|export"; then
        echo "logic"
    elif echo "$diff" | grep -qi "interface\|type\|Props"; then
        echo "types"
    else
        echo "general"
    fi
}

# Build accurate commit message based on actual changes
build_commit_message() {
    local files_changed="$1"
    local diff="$2"
    
    # Get the primary files changed (strip paths, get basenames)
    PRIMARY_FILES=$(echo "$files_changed" | awk '{print $2}' | xargs -I {} basename {} | sort -u | head -3 | tr '\n' ', ' | sed 's/,$//' | sed 's/,/, /g')
    
    # Detect what kind of changes
    CHANGE_TYPE=$(detect_change_type "$diff")
    
    # Determine commit type prefix
    if [ "$DELETED_FILES" -gt 0 ] && [ "$ADDED_FILES" -eq 0 ] && [ "$MODIFIED_FILES" -eq 0 ]; then
        PREFIX="remove"
    elif [ "$ADDED_FILES" -gt 0 ] && [ "$MODIFIED_FILES" -eq 0 ]; then
        PREFIX="add"
    elif echo "$diff" | grep -qi "fix\|bug\|error\|issue\|correct\|resolve"; then
        PREFIX="fix"
    elif [ "$MODIFIED_FILES" -gt 0 ] && [ "$ADDED_FILES" -eq 0 ]; then
        PREFIX="update"
    else
        PREFIX="update"
    fi
    
    # Build descriptive message
    if [ "$TOTAL_FILES" -eq 1 ]; then
        # Single file - be specific
        SINGLE_FILE=$(echo "$files_changed" | awk '{print $2}' | head -1)
        SINGLE_BASENAME=$(basename "$SINGLE_FILE")
        ACTION=$(echo "$files_changed" | awk '{print $1}' | head -1)
        
        case "$ACTION" in
            A) echo "Add $SINGLE_BASENAME" ;;
            D) echo "Remove $SINGLE_BASENAME" ;;
            M) 
                # Try to describe what was modified
                case "$CHANGE_TYPE" in
                    hooks) echo "Update React hooks in $SINGLE_BASENAME" ;;
                    api) echo "Update API logic in $SINGLE_BASENAME" ;;
                    styling) echo "Update styling in $SINGLE_BASENAME" ;;
                    events) echo "Update event handlers in $SINGLE_BASENAME" ;;
                    types) echo "Update TypeScript types in $SINGLE_BASENAME" ;;
                    logic) echo "Update logic in $SINGLE_BASENAME" ;;
                    *) echo "Update $SINGLE_BASENAME" ;;
                esac
                ;;
            *) echo "Update $SINGLE_BASENAME" ;;
        esac
    elif [ "$TOTAL_FILES" -le 3 ]; then
        # 2-3 files - list them
        echo "$PREFIX: $PRIMARY_FILES"
    else
        # Many files - summarize by directory or type
        # Get the most common directory
        COMMON_DIR=$(echo "$files_changed" | awk '{print $2}' | xargs -I {} dirname {} | sort | uniq -c | sort -rn | head -1 | awk '{print $2}')
        DIR_BASENAME=$(basename "$COMMON_DIR")
        
        if [ "$DIR_BASENAME" != "." ]; then
            echo "$PREFIX: $TOTAL_FILES files in $DIR_BASENAME"
        else
            echo "$PREFIX: $TOTAL_FILES files ($PRIMARY_FILES)"
        fi
    fi
}

# Generate the commit message
COMMIT_MSG=$(build_commit_message "$CHANGED_FILES" "$DIFF_CONTENT")

# Capitalize first letter
COMMIT_MSG="$(echo "${COMMIT_MSG:0:1}" | tr '[:lower:]' '[:upper:]')${COMMIT_MSG:1}"

echo ""
echo "📝 Generated commit message:"
echo "   $COMMIT_MSG"
echo ""

# Optional: Ask for confirmation
# Uncomment the following lines if you want to confirm before committing
# read -p "❓ Proceed with this commit message? (y/n/e for edit) " -n 1 -r
# echo
# if [[ $REPLY =~ ^[Ee]$ ]]; then
#     read -p "Enter custom commit message: " COMMIT_MSG
# elif [[ ! $REPLY =~ ^[Yy]$ ]]; then
#     echo "❌ Commit cancelled"
#     exit 1
# fi

echo "💾 Committing changes..."
git commit -m "$COMMIT_MSG"

echo ""
echo "🚀 Pushing to origin main..."
git push origin main

echo ""
echo "✅ Successfully committed and pushed changes to GitHub!"
echo "📋 Commit message used: $COMMIT_MSG"
