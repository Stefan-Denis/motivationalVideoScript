// Node Modules
import { spawn, ChildProcess } from 'child_process'
import OpenAI from "openai"
import fs from 'fs-extra'
import path from 'path'

// Custom
import showLoadingAnimation, { stopLoadingAnimation } from './cli.js'
import crashManager from './crashManager.js'
import { __dirname } from "./__dirname.js"
import clear from './clear.js'
import wait from './wait.js'

// Cleanup from last use
async function cleanup() {
    const dir: string = path.join(__dirname, 'app/output/temp')

    async function main() {
        fs.emptyDirSync(dir)
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

    Each clip should be exactly 15 seconds long. Ensure that the script fits within this time frame and make sure that the letter count does not exceed 50 words but try to be above 45 and between 45 - 55.

    1
    00:00:00,000 --> 00:00:05,000
    <generate text dont exceed 55 letters and keep it one line>

    2
    00:00:05,000 --> 00:00:10,000
    <generate text dont exceed 55 letters and keep it one line>

    3
    00:00:10,000 --> 00:00:15,000
    <generate text dont exceed 55 letters and keep it one line>
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

    // Trim Videos
    // await trimVideos()
    // console.log('✅ Trimmed all the videos')

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

        const generatedScript = await createScript(firstVideo, secondVideo, thirdVideo)

        fs.writeFileSync(path.join(__dirname, 'config', 'subtitles.srt'), generatedScript as string)

        // Mark combination as processed
        combination[3] = true

        // Save combinations back to file
        await fs.writeFile(combinationsPath, JSON.stringify(combinations, null, 2))

        // Update current index
        currentIndex = i + 1

        console.log('✅ Processed combination: ' + (i + 1))

        const endTime = Date.now() // Record the end time
        const elapsedTime = endTime - startTime // Calculate elapsed time in milliseconds

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
// cleans up the temp directory
// creates combinations of clips
// // trims videos
// grab video theme
// loads combinations
// generates subtitles based on combinations 

main(testingMode)