Write-Host ""
Write-Host "=================================="
Write-Host " Sideline Review Gate"
Write-Host "=================================="
Write-Host ""
Write-Host "Before commit:"
Write-Host "1. Run /sideline-review"
Write-Host "2. Run sideline-reviewer"
Write-Host "3. Verify npm run build"
Write-Host "4. Complete manual QA"
Write-Host ""

if (Get-Command git -ErrorAction SilentlyContinue) {
  Write-Host "Changed files:"
  git diff --name-only
  Write-Host ""
  Write-Host "Diff stat:"
  git diff --stat
  Write-Host ""
} else {
  Write-Host "Git not found. Skipping diff output."
  Write-Host ""
}
