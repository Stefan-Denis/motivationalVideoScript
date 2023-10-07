// Node Modules
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { spawn, ChildProcess, spawnSync } from 'child_process'
import { execSync } from 'child_process'
import OpenAI from "openai"
import fs from 'fs-extra'
import path from 'path'
import util from 'util'

// Custom
import showLoadingAnimation, { stopLoadingAnimation } from './cli.js'
import crashManager from './crashManager.js'
import { __dirname } from "./__dirname.js"
import clear from './clear.js'
import wait from './wait.js'

// dotenv
import { configDotenv } from 'dotenv'
import { createLogUpdate } from 'log-update'
configDotenv({ path: path.join(__dirname, 'config', '.env') })

// Cleanup from last use
async function cleanup() {
    const dir: string = path.join(__dirname, 'app/output/temp')
    const mp3dir: string = path.join(__dirname, 'app/output/temp/mp3')

    async function main() {
        fs.emptyDirSync(dir)
        fs.mkdirSync(mp3dir)
    }

    async function UI() {
        console.log('🗑️　Cleaning up from last use: ')
        showLoadingAnimation(`Deleting Directory Contents Of: ${dir}`, 3000)
        await wait(3000)
        clear()
    }

    await main()
    await UI()
}

// Create all combinations of videos possible
async function createCombinations() {
    function main() {
        const inputDir: string = path.join(__dirname, 'app', 'input')

        function getVideoFiles(dir: string): string[] {
            return fs.readdirSync(dir).filter(file => path.extname(file) === '.mp4')
        }

        function generateCombinations(files: string[]): Array<[string, string, string, boolean]> {
            const permutations: Array<[string, string, string, boolean]> = [] // Modify the type to include the boolean value
            const len: number = files.length

            for (let i = 0; i < len; i++) {
                for (let j = 0; j < len; j++) {
                    for (let k = 0; k < len; k++) {
                        if (i !== j && j !== k && k !== i) {
                            permutations.push([files[i], files[j], files[k], false])
                        }
                    }
                }
            }

            return permutations
        }

        const videoFiles: string[] = getVideoFiles(inputDir)
        const combinations: Array<[string, string, string, boolean]> = generateCombinations(videoFiles) // Correct type

        const combinationsJSON: string = JSON.stringify(combinations, null, 2)
        const combinationsFilePath: string = path.join(__dirname, 'config', 'combinations.json')

        fs.writeFileSync(combinationsFilePath, combinationsJSON)
    }

    async function UI() {
        showLoadingAnimation(`Generating All Possible Combinations`, 2500)
        await wait(2500)
    }

    main()
    await UI()
}

async function trimVideos() {
    async function main(): Promise<void> {
        try {
            const files: string[] = fs.readdirSync(path.join(__dirname, 'app', 'input'))

            for (const file of files) {
                if (file.endsWith('.mp4')) {
                    UI.add('Trimming: ' + file)

                    await new Promise<void>((resolve, reject) => {
                        const inputFilePath: string = path.join(__dirname, 'app', 'input', file)
                        const outputFilePath: string = path.join(__dirname, 'app', 'output', 'temp', file)

                        const process: ChildProcess = spawn('ffmpeg', [
                            '-y',  // Overwrite output files without asking
                            '-i', inputFilePath,  // Input file path

                            // Specify the framerate
                            '-r', '60',

                            // Specify video codec (H.264), resolution (720x1280), and framerate (30 fps)
                            '-c:v', 'libx264',
                            '-vf', 'scale=720:1280',
                            '-r', '30',

                            // Use a preset for libx264 for speed/quality trade-off
                            '-preset', 'medium',

                            // Set a target video bitrate (adjust the value as needed)
                            '-b:v', '2M',

                            // Set the Constant Rate Factor for quality (adjust the value as needed)
                            '-crf', '20',

                            // Set the pixel format to yuv420p
                            '-pix_fmt', 'yuv420p',

                            // Specify audio codec (AAC) and sample rate (44100 Hz)
                            '-c:a', 'aac',
                            '-ar', '44100',

                            // Specify start time (0 seconds) and duration (5 seconds)
                            '-ss', '0',
                            '-t', '5',

                            // Output file path
                            outputFilePath
                        ])

                        process.on('close', (code: number) => {
                            if (code === 0) {
                                resolve()
                            } else {
                                reject(new Error(`FFmpeg process exited with code ${code}`))
                            }
                        })
                    })

                    UI.remove()
                }
            }

        } catch (err) {
            console.log('\n')
            console.error('GENERIC ERROR MESSAGE: expected directory not found: ' + path.join(__dirname, 'app', 'input'))
            console.error('ACTUAL ERROR MESSAGE: ' + err)
            console.log('\n')
        }
    }

    const UI: UI = {
        add: (message: string): void => {
            showLoadingAnimation(message, 2_147_483_647)
        },

        remove: (): void => {
            stopLoadingAnimation()
        }
    }

    await main()
}

async function getVideoTheme(videos: string[]): Promise<string[]> {
    const comments: string[] = []

    for (let i = 0; i < videos.length; i++) {
        const video = videos[i]
        const mediaInfo = spawn('mediainfo', [path.join(__dirname, 'app', 'input', video)])
        let metadata = ''

        await new Promise<void>((resolve) => {
            mediaInfo.stdout.on('data', (data) => {
                metadata += data.toString()
            })

            mediaInfo.on('close', () => {
                const commentMatch = metadata.match(/Comment\s*:\s*(.*)/i)
                if (commentMatch && commentMatch[1]) {
                    comments.push(commentMatch[1] as string)
                } else {
                    console.log(i + ' No comment found for this video.')
                }
                resolve() // Resolve the promise once comments are processed
            })
        })
    }

    return comments
}

async function createScript(video1: string, video2: string, video3: string) {
    const prompt: string = `Generate a concise .srt script for a motivational video with three 5-second clips (max 15 seconds total). The script should align with a text-to-speech engine. Avoid long pauses or filler text. Keep it impactful and provide assertive, red-pill style motivation inspired by the following themes:

    Video 1 Theme: ${video1}
    Video 2 Theme: ${video2}
    Video 3 Theme: ${video3}

    Each clip should be exactly 15 seconds long. Ensure that the script fits within this time frame and make sure that the letter count does not exceed 50 words but try to be above 45 and between 45 - 50.
    Don't mess up a large business and make the scripts so that the google tts engine can say them under 4.9 seconds or you will bankrupt a big business
    this is an example of a bad sentence "Embrace adversity, push through the pain, and conquer your fears." IT HAS 65 LETTERS, OUT OF THE 50 MAX
    THIS is ANOTHER bad sentence "Greatness is earned, never given." AS IT IS 33 LETTERS, NOT CLOSE TO 45 

    1
    00:00:00,000 --> 00:00:05,000
    <generate text dont exceed 50 letters (45 - 50 letters range try to aim for) and keep it one line>

    2
    00:00:05,000 --> 00:00:10,000
    <generate text dont exceed 50 letters (45 - 50 letters range try to aim for) and keep it one line>

    3
    00:00:10,000 --> 00:00:15,000
    <generate text dont exceed 50 letters (45 - 50 letters range try to aim for) and keep it one line>
    `

    const openai = new OpenAI({
        apiKey: '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'
    })

    const completion = await openai.chat.completions.create({
        messages: [{ role: "system", content: prompt }],
        model: "gpt-3.5-turbo",
    })

    const generatedScript = completion.choices[0].message.content

    return generatedScript // Return the generated script
}

async function main(testingMode = false) {
    // Crash manager START
    await crashManager('start')

    // Clean up the directory
    await cleanup()
    console.log('✅ Finished cleanup')

    // begin the process of creating the video combinations:
    await createCombinations()
    console.log('✅ Generated all video combinations')

    await trimVideos()
    console.log('✅ Trimmed all the videos')

    // Grab video theme
    const videos: string[] = fs.readdirSync(path.join(__dirname, 'app', 'input'))
    const themes: string[] = await getVideoTheme(videos)
    console.log('✅ Theme retrieved from each video')

    // Load combinations
    const combinationsPath = path.join(__dirname, 'config', 'combinations.json')
    let combinations = JSON.parse(await fs.readFile(combinationsPath, 'utf-8'))
    let currentIndex = 0

    // Determine the end index based on testing mode
    let endIndex = testingMode ? currentIndex + 1 : combinations.length

    // Process each combination
    for (let i = currentIndex; i < endIndex; i++) {
        const startTime = Date.now() // Record the start time

        const combination = combinations[i]
        const [firstVideo, secondVideo, thirdVideo] = combination.slice(0, 3)

        console.log('\n')
        console.log(`Processing combination ${(i + 1)}:`, combinations[i])

        // Create script with AI 
        console.log('Generating script...')
        const generatedScript = await createScript(firstVideo, secondVideo, thirdVideo)
        fs.writeFileSync(path.join(__dirname, 'config', 'subtitles.srt'), generatedScript as string)
        console.log('Generated script!')

        // Concat each clip together
        console.log('Concatenating videos...')
        const concat = () => {
            return new Promise((resolve, reject) => {
                const process = spawn('ffmpeg', [
                    '-i', path.join(__dirname, `./app/output/temp/${firstVideo}`),
                    '-i', path.join(__dirname, `./app/output/temp/${secondVideo}`),
                    '-i', path.join(__dirname, `./app/output/temp/${thirdVideo}`),
                    '-filter_complex', '[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]',
                    '-map', '[outv]',
                    '-map', '[outa]',
                    '-an', // Remove audio
                    path.join(__dirname, './app/output/temp/concatenated.mp4')
                ])

                process.on('close', (code) => {
                    if (code === 0) {
                        resolve(true)
                    } else {
                        reject(`ffmpeg process exited with code ${code}`)
                    }
                })
            })
        }
        await concat()
        console.log('concatenated videos!')


        // Create TTS
        console.log('creating tts...')
        const createTTS: Function = () => {
            return new Promise(async (resolve, reject) => {
                const client = new TextToSpeechClient()

                // Read the content of subtitles.srt file
                const srtContent = fs.readFileSync(path.join(__dirname, 'config', 'subtitles.srt'), 'utf8')

                // Parse the subtitles content to extract text and timings
                const subtitles = srtContent.split(/\n\s*\n/).map(entry => {
                    const lines = entry.trim().split('\n')
                    return {
                        index: lines[0],
                        time: lines[1],
                        text: lines.slice(2).join('\n')
                    }
                })

                // Generate TTS audio for each subtitle
                for (let i = 0; i < subtitles.length; i++) {
                    const entry: any = subtitles[i]

                    const request: any = {
                        "audioConfig": {
                            "audioEncoding": "LINEAR16",
                            "effectsProfileId": [
                                "small-bluetooth-speaker-class-device"
                            ],
                            "pitch": 0,
                            "speakingRate": 0.90
                        },
                        "input": {
                            "text": entry.text
                        },
                        "voice": {
                            "languageCode": "en-US",
                            "name": "en-US-Neural2-I" || "en-AU-Neural2-B" || "en-AU-Neural2-D" || "en-GB-News-J"
                        }
                    }

                    const [response] = await client.synthesizeSpeech(request)

                    const writeFile = util.promisify(fs.writeFile)

                    await writeFile(path.join(__dirname, 'app', 'output', 'temp', 'mp3', `output_${i}.mp3`), response.audioContent as string, 'binary')
                }

                resolve(true)
            })

        }
        await createTTS()
        console.log('created tts!')

        console.log('modifying script...')
        const modifySubtitles: Function = () => {
            const subtitlePath = path.join(__dirname, 'config', 'subtitles.srt')
            const mp3Folder = path.join(__dirname, 'app', 'output', 'temp', 'mp3')

            // Step 1: Read the subtitle file
            const subtitlesContent = fs.readFileSync(subtitlePath, 'utf8')
            const subtitlesLines = subtitlesContent.split('\n')

            // Step 2: Get lengths of the MP3 files
            const mp3Files = fs.readdirSync(mp3Folder)

            for (let i = 0; i < mp3Files.length; i++) {
                const file = mp3Files[i]
                const filePath = path.join(mp3Folder, file)

                // Use ffprobe to get the audio duration
                const ffprobeOutput = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`, { encoding: 'utf-8' })
                const duration = parseFloat(ffprobeOutput)

                let startTime = 0
                let endTime = 0

                if (i === 0) {
                    startTime = 0
                    endTime = duration
                } else if (i === 1) {
                    startTime = 5
                    endTime = duration + startTime
                } else if (i === 2) {
                    startTime = 10
                    endTime = duration + startTime
                }

                subtitlesLines[i * 4 + 1] = `${formatTime(startTime)} --> ${formatTime(endTime)}`
            }

            // Step 3: Save the modified subtitle file
            const modifiedSubtitlesContent = subtitlesLines.join('\n')
            fs.writeFileSync(subtitlePath, modifiedSubtitlesContent)
        }

        // Helper function to format time in SRT format
        const formatTime = (seconds: number) => {
            const hours = Math.floor(seconds / 3600)
            const minutes = Math.floor((seconds % 3600) / 60)
            const remainingSeconds = Math.floor(seconds % 60)
            const milliseconds = Math.floor((seconds - Math.floor(seconds)) * 1000)

            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
        }

        await modifySubtitles()
        console.log('Modified script!')

        console.log('Adding subtitles to video...')
        async function addSubtitles() {
            const process = spawnSync('ffmpeg', [
                '-i', /* path.join(__dirname, 'app', 'output', 'temp', 'concatenated.mp4') */ '../app/output/temp/concatenated.mp4',
                '-vf', `subtitles=../config/subtitles.srt:force_style='Alignment=10'`,
                /* path.join(__dirname, 'app', 'output', 'temp', 'subtitled.mp4') */ '../app/output/temp/subtitled.mp4'
            ])
        }
        await addSubtitles()
        console.log('Added subtitles!')

        // END OF PROCESSING
        // FINISHING UP

        // Mark combination as processed
        combination[3] = true

        // Save combinations back to file
        await fs.writeFile(combinationsPath, JSON.stringify(combinations, null, 2))

        // Update current index
        currentIndex = i + 1
        console.log('✅ Processed combination: ' + (i + 1))
        const endTime = Date.now() // Record the end time
        const elapsedTime = endTime - startTime // Calculate elapsed time in milliseconds

        // KEEP AT END
        // Check if less than 22 seconds have passed, and add delay if needed
        if (elapsedTime < 22000) {
            const waitTime = 22000 - elapsedTime
            console.log(`⏳ Waiting for ${waitTime / 1000} seconds before processing the next combination...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
        }

        console.log('\n')
    }

    // End the script
    await crashManager('stop')
    process.exit()
}

const testingMode = process.argv.includes('--test')

// Script as of now only does:
// sets app mode as running when starting
// cleans up the temp directory (./app/output/temp)
// creates combinations of clips
// trims videos
// grab video theme
// loads combinations
// generates subtitles based on combinations
// Update subtitle length according to each tts clip

//TODO:
//* add subtitles to video
//* add tts

main(testingMode)