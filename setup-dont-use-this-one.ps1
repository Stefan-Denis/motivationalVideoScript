# Get the directory of the script
$scriptDirectory = Split-Path -Parent -Path $MyInvocation.MyCommand.Definition

# Define the relative paths to ffmpeg and MediaInfo
$ffmpegPath = Join-Path -Path $scriptDirectory -ChildPath 'windowsPackages\ffmpeg'
$mediaInfoPath = Join-Path -Path $scriptDirectory -ChildPath 'windowsPackages\mediainfo'

# Check if the paths exist
if (Test-Path $ffmpegPath -PathType Container -ErrorAction SilentlyContinue) {
    $ffmpegPath = Join-Path -Path $ffmpegPath -ChildPath 'bin'
}

if (Test-Path $mediaInfoPath -PathType Container -ErrorAction SilentlyContinue) {
    $mediaInfoPath = Join-Path -Path $mediaInfoPath -ChildPath ''
}

# Set the system path variables
[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path', [System.EnvironmentVariableTarget]::Machine) + ";$ffmpegPath;$mediaInfoPath", [System.EnvironmentVariableTarget]::Machine)

# Inform the user
Write-Host "Path variables for ffmpeg and MediaInfo have been set."
