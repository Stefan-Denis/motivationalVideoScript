Clear-Host
$outDirectory = ".\out"
Set-Location $outDirectory

# Execute main.js
node main.js --test

Pause
Clear-Host
Set-Location ".."
