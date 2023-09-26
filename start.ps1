# Write-Host "Starting..."
# 
# # Wait for 3.5 seconds
# Start-Sleep -Seconds 3.5
# 
# Clear the host
Clear-Host
# 
# # Wait for an additional 0.5 seconds (optional)
# Start-Sleep -Seconds 0.5

# Define the path to the directory
$outDirectory = ".\out"

# Change directory to ./out
Set-Location $outDirectory

# Execute main.js
node main.js

# Prompt to press Enter before exiting
Pause

# Clear the host again before exiting
Clear-Host
Set-Location ".."