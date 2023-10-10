Write-Host "Starting..."

# Wait for 3.5 seconds
Start-Sleep -Seconds 3.5

# Clear the host
Clear-Host

# Wait for an additional 0.5 seconds (optional)
Start-Sleep -Seconds 0.5

Clear-Host
$outDirectory = ".\out"
Set-Location $outDirectory

# Execute main.js
node main.js

Pause
Clear-Host
Set-Location ".."