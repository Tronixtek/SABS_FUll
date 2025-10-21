# View Logs Helper Script
# Usage: .\view-logs.ps1 [sync|error|all|search]

param(
    [Parameter(Position=0)]
    [ValidateSet("sync", "error", "all", "search", "tail", "help")]
    [string]$Action = "help",
    
    [Parameter(Position=1)]
    [string]$SearchTerm = ""
)

$logsPath = "logs"

function Show-Help {
    Write-Host "`n=== LOG VIEWER HELPER ===" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\view-logs.ps1 [command] [options]" -ForegroundColor White
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  sync       - View sync.log (last 50 lines)" -ForegroundColor White
    Write-Host "  error      - View error.log (last 50 lines)" -ForegroundColor White
    Write-Host "  all        - View combined.log (last 50 lines)" -ForegroundColor White
    Write-Host "  tail       - Live tail sync.log (auto-refresh)" -ForegroundColor White
    Write-Host "  search     - Search in logs (requires search term)" -ForegroundColor White
    Write-Host "  help       - Show this help" -ForegroundColor White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\view-logs.ps1 sync" -ForegroundColor Gray
    Write-Host "  .\view-logs.ps1 error" -ForegroundColor Gray
    Write-Host "  .\view-logs.ps1 tail" -ForegroundColor Gray
    Write-Host "  .\view-logs.ps1 search ""Employee NOT FOUND""" -ForegroundColor Gray
    Write-Host "  .\view-logs.ps1 search Dala" -ForegroundColor Gray
    Write-Host ""
}

function Show-SyncLog {
    Write-Host "`n=== SYNC LOG (Last 50 lines) ===" -ForegroundColor Cyan
    if (Test-Path "$logsPath\sync.log") {
        Get-Content "$logsPath\sync.log" -Tail 50
    } else {
        Write-Host "No sync.log file found. Run a sync first!" -ForegroundColor Red
    }
}

function Show-ErrorLog {
    Write-Host "`n=== ERROR LOG (Last 50 lines) ===" -ForegroundColor Red
    if (Test-Path "$logsPath\error.log") {
        Get-Content "$logsPath\error.log" -Tail 50
    } else {
        Write-Host "No error.log file found. Good news - no errors yet!" -ForegroundColor Green
    }
}

function Show-AllLog {
    Write-Host "`n=== COMBINED LOG (Last 50 lines) ===" -ForegroundColor Cyan
    if (Test-Path "$logsPath\combined.log") {
        Get-Content "$logsPath\combined.log" -Tail 50
    } else {
        Write-Host "No combined.log file found." -ForegroundColor Red
    }
}

function Tail-SyncLog {
    Write-Host "`n=== LIVE SYNC LOG (Press Ctrl+C to stop) ===" -ForegroundColor Cyan
    if (Test-Path "$logsPath\sync.log") {
        Get-Content "$logsPath\sync.log" -Wait -Tail 20
    } else {
        Write-Host "No sync.log file found. Run a sync first!" -ForegroundColor Red
    }
}

function Search-Logs {
    param([string]$term)
    
    if ([string]::IsNullOrWhiteSpace($term)) {
        Write-Host "Please provide a search term!" -ForegroundColor Red
        Write-Host "Example: .\view-logs.ps1 search ""Employee NOT FOUND""" -ForegroundColor Yellow
        return
    }
    
    Write-Host "`n=== SEARCH RESULTS for: $term ===" -ForegroundColor Cyan
    
    $files = @("sync.log", "error.log", "combined.log")
    $found = $false
    
    foreach ($file in $files) {
        $path = "$logsPath\$file"
        if (Test-Path $path) {
            $results = Select-String -Path $path -Pattern $term -Context 1,1
            if ($results) {
                Write-Host "`nIn $file" ":" -ForegroundColor Yellow
                $results | ForEach-Object {
                    Write-Host $_.Line -ForegroundColor White
                }
                $found = $true
            }
        }
    }
    
    if (-not $found) {
        Write-Host "No matches found for: $term" -ForegroundColor Red
    }
}

# Main execution
switch ($Action) {
    "sync" { Show-SyncLog }
    "error" { Show-ErrorLog }
    "all" { Show-AllLog }
    "tail" { Tail-SyncLog }
    "search" { Search-Logs -term $SearchTerm }
    "help" { Show-Help }
    default { Show-Help }
}

Write-Host ""
