# Clear the host
Clear-Host

Write-Host "Starting..."

# Wait for 3.5 seconds
Start-Sleep -Seconds 3.5

# Clear the host
Clear-Host

Write-Host 'The contents in the "withMusic" directory'
Write-Host 'and the "withoutMusic" directory will be'
Write-Host "deleted!!! ARE YOU SURE YOU WANT TO"
Write-Host "PROCEED?? BACK UP ANY DATA FROM THERE!"
Write-Host "Are you sure you are ready?"
Write-Host "Press enter to continue . . ."
$null = Read-Host

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
