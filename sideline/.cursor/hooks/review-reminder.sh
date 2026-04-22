#!/usr/bin/env bash

echo ""
echo "=================================="
echo " Sideline Review Gate"
echo "=================================="
echo ""
echo "Before commit:"
echo "1. Run /sideline-review"
echo "2. Run sideline-reviewer"
echo "3. Verify npm run build"
echo "4. Complete manual QA"
echo ""

if command -v git >/dev/null 2>&1; then
  echo "Changed files:"
  git diff --name-only
  echo ""
  echo "Diff stat:"
  git diff --stat
  echo ""
else
  echo "Git not found. Skipping diff output."
  echo ""
fi
