# Check if running in Visual Studio Code terminal
if ($env:TERM_PROGRAM -ne "vscode") {
    $shell = New-Object -ComObject WScript.Shell
    $shell.SendKeys('{F11}')
}

# Rest of your script goes here
Clear-Host

$outDir = '.\out'
$initDir = '..'
Set-Location $outDir

node theme.js

Set-Location $initDir

Clear-Host
