# ==============================================================================
# CampusConnect - Turnkey Zero-Effort Deployment to Google Cloud Run & AI Studio
# ==============================================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " CampusConnect - Turnkey Google Cloud Run Deployment     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Detect or prompt for Google Cloud Project ID
$projectId = (gcloud config get-value project 2>$null)
if (-not $projectId -or $projectId -eq "(unset)") {
    $projectId = Read-Host "Enter your Google Cloud Project ID"
    gcloud config set project $projectId
}
Write-Host "==> Using Google Cloud Project: $projectId" -ForegroundColor Green

# 2. Check for Google AI Studio API Key
$key = $env:GEMINI_API_KEY
if (-not $key) {
    $key = Read-Host "Enter your Google AI Studio GEMINI_API_KEY (optional, press Enter to skip)"
}

$envVars = "GEMINI_MODEL=gemini-2.5-flash-lite,NODE_ENV=production"
if ($key) {
    $envVars += ",GEMINI_API_KEY=$key"
}

Write-Host "==> Deploying container directly from source to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy campusconnect `
    --source . `
    --project $projectId `
    --region us-central1 `
    --allow-unauthenticated `
    --set-env-vars $envVars `
    --memory 512Mi `
    --cpu 1 `
    --quiet

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Deployment successful! Your CampusConnect app is live.   " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
