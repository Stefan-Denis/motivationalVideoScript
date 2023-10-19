# Get the directory of the script
$scriptDirectory = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

# Define the relative paths to ffmpeg and MediaInfo
$ffmpegPath = Join-Path -Path $scriptDirectory -ChildPath 'windowsPackages\ffmpeg'

# Check if the paths exist
if (Test-Path $ffmpegPath -PathType Container -ErrorAction SilentlyContinue) {
    $ffmpegPath = Join-Path -Path $ffmpegPath -ChildPath 'bin'
}

# Set the system path variables
[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', [System.EnvironmentVariableTarget]::Machine) + ";$ffmpegPath;$mediaInfoPath", [System.EnvironmentVariableTarget]::Machine)

# Inform the user
Write-Host "Path variable for ffmpeg has been set."
