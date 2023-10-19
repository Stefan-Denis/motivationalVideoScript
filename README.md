# Automated Content Creation App 🚀

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Requirements](#Requirements)
- [Usage](#usage)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Introduction

Welcome to the Automated Content Creation App! This innovative application leverages the power of cutting-edge technologies like GPT-3.5 Turbo 16K and Google's Deep Neural Text to Speech Networks to generate stunning 9:16 720P motivational videos effortlessly.

## Features

- 🎥 Create 9:16 720P motivational videos in minutes
- 🤖 Utilizes GPT-3.5 Turbo 16K for intelligent content generation
- 🔊 Harnesses Google's TTS Neural2 for natural-sounding voiceovers
- 🧰 Employs FFmpeg and a propietary system for processing video themes, for advanced video processing
- 💼 Uses TypeScript and PowerShell at the core

## Technologies Used

- [GPT-3.5 Turbo 16K](https://openai.com/)
- [Google's TTS Neural2](https://cloud.google.com/text-to-speech)
- [FFmpeg](https://ffmpeg.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [PowerShell](https://docs.microsoft.com/en-us/powershell/)

## Installation

1. Download this repository to your local machine:

```bash
use the UI or the releases tab for fast installation
```

2. Install the required dependencies:

```bash
npm install
```

3. Set up your GPT-3.5 Turbo API key and Google TTS credentials in the configuration file.

4. FFMpeg comes with the app by default

## Requirements
1. Active internet connection
2. minimum of 3 background videos, resolution of 720x1280 and 9:16 format, other resolutions are not officially supported and will lead to errors
3. GPT API key
4. Google JSON file from their cloud named 'serviceaccount.json'

## Usage

To create a motivational video, simply run the start.ps1 file:
Here is how to run it in a cli

```bash
.\start.ps1
```

To add videos for the app to use, add them inside app/input
For each video, use the powershell app called "setContent.ps1" to set their theme.

to start it through windows terminal, do:
```bash 
.\setContent.ps1
```

the app can do the following:

-   Show the user the themes of all the videos
-   Edit theme of each video
-   Re-create the video data (you must do this if you add or remove a new video)
-   Edit comments through it.

Themes and Commments explained:

Themes refers to all of the video's comments.
Comments are used to describe what is happening in a video
Comments should be as concise as possible to explain what is going on to the AI

---
