// Node Modules
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { spawnSync } from 'child_process'
import { execSync } from 'child_process'
import OpenAI from "openai"
import fs from 'fs-extra'
import path from 'path'
import util from 'util'

// Custom
import crashManager from './crashManager.js'
import { __dirname } from "./__dirname.js"

// dotenv
import { configDotenv } from 'dotenv'
configDotenv({ path: path.join(__dirname, 'config', '.env') })

// Is synchronous
// Cleanup from last use
function cleanup(): void {
    const dir: string = path.join(__dirname, 'app/output/temp')
    const mp3dir: string = path.join(__dirname, 'app/output/temp/mp3')

    fs.emptyDirSync(dir)
    fs.mkdirSync(mp3dir)
}

// Is synchronous
// Create all combinations of videos possible
function createCombinations(): void {
    function getVideoFiles(dir: string): string[] {
        return fs.readdirSync(dir).filter((file: string) => path.extname(file) === '.mp4')
    }

    function generateCombinations(files: string[]): Array<[string, string, string, boolean]> {
        const permutations: Array<[string, string, string, boolean]> = []
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

    const inputDir: string = path.join(__dirname, 'app', 'input')
    const videoFiles: string[] = getVideoFiles(inputDir)
    const combinations: Array<[string, string, string, boolean]> = generateCombinations(videoFiles)

    const combinationsJSON: string = JSON.stringify(combinations, null, 2)
    const combinationsFilePath: string = path.join(__dirname, 'config', 'combinations.json')

    fs.writeFileSync(combinationsFilePath, combinationsJSON)
}

// Is synchronous
function trimVideos() {
    try {
        const files = fs.readdirSync(path.join(__dirname, 'app', 'input'))

        for (const file of files) {
            if (file.endsWith('.mp4')) {

                const inputFilePath = path.join(__dirname, 'app', 'input', file)
                const outputFilePath = path.join(__dirname, 'app', 'output', 'temp', file)

                const process = spawnSync('ffmpeg', [
                    '-y',
                    '-i', inputFilePath,
                    '-r', '60',
                    '-c:v', 'libx264',
                    '-vf', 'scale=720:1280',
                    '-r', '30',
                    '-preset', 'medium',
                    '-b:v', '2M',
                    '-crf', '20',
                    '-pix_fmt', 'yuv420p',
                    '-c:a', 'aac',
                    '-ar', '44100',
                    '-ss', '0',
                    '-t', '5',
                    outputFilePath
                ])

                if (process.status !== 0) {
                    console.error(`FFmpeg process exited with code ${process.status}`)

                }
            }
        }

    } catch (err) {
        console.log('\n')
        console.error('GENERIC ERROR MESSAGE: expected directory not found: ' + path.join(__dirname, 'app', 'input'))
        console.error('ACTUAL ERROR MESSAGE: ' + err)
        console.log('\n')
    }
}

// Is synchronous
function getVideoTheme(videos: string[]) {
    const comments = []

    for (let i = 0; i < videos.length; i++) {
        const video = videos[i]
        const mediaInfo = spawnSync('mediainfo', [path.join(__dirname, 'app', 'input', video)])
        const metadata = mediaInfo.stdout.toString()

        const commentMatch = metadata.match(/Comment\s*:\s*(.*)/i)
        if (commentMatch && commentMatch[1]) {
            comments.push(commentMatch[1])
        } else {
            console.log(i + ' No comment found for this video.')
        }
    }

    return comments
}

// Is synchronous
function createScript(video1: string, video2: string, video3: string) {
    function wrapper() {
        return new Promise<string>((resolve, reject) => {
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

            openai.chat.completions.create({
                messages: [{ role: "system", content: prompt }],
                model: "gpt-3.5-turbo",
            })
                .then((completion) => {
                    const generatedScript: string = completion.choices[0].message.content as string
                    resolve(generatedScript)
                })
                .catch((error) => {
                    reject(error)
                })
        })
    }

    return wrapper()
}

function main(testingMode = false) {
    // Crash manager START
    crashManager('start')

    // Clean up the directory
    cleanup()
    console.log('✅ Finished cleanup')

    // begin the process of creating the video combinations:
    createCombinations()
    console.log('✅ Generated all video combinations')

    trimVideos()
    console.log('✅ Trimmed all the videos')

    // Grab video theme
    const videos: string[] = fs.readdirSync(path.join(__dirname, 'app', 'input'))
    const themes: string[] = getVideoTheme(videos)
    console.log('✅ Theme retrieved from each video')

    // Load combinations
    const combinationsPath = path.join(__dirname, 'config', 'combinations.json')
    let combinations = JSON.parse(fs.readFileSync(combinationsPath, 'utf-8'))
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
        createScript('Theme1', 'Theme2', 'Theme3')
            .then((generatedScript) => {
                fs.writeFileSync(path.join(__dirname, 'config', 'subtitles.srt'), generatedScript)
            })

        // Concat each clip together
        const concat = () => {
            return new Promise((resolve, reject) => {
                const process = spawnSync('ffmpeg', [
                    '-i', path.join(__dirname, `./app/output/temp/${firstVideo}`),
                    '-i', path.join(__dirname, `./app/output/temp/${secondVideo}`),
                    '-i', path.join(__dirname, `./app/output/temp/${thirdVideo}`),
                    '-filter_complex', '[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[outv][outa]',
                    '-map', '[outv]',
                    '-map', '[outa]',
                    '-an', // Remove audio
                    path.join(__dirname, './app/output/temp/concatenated.mp4')
                ])

                if (process.status === 0) {
                    resolve(true)
                } else {
                    reject(`ffmpeg process exited with code ${process.status}`)
                }
            })
        }
        concat()

        function createTTS() {
            const client = new TextToSpeechClient()
            const srtContent = fs.readFileSync(path.join(__dirname, 'config', 'subtitles.srt'), 'utf8')
            const subtitles = srtContent.split(/\n\s*\n/).map(entry => {
                const lines = entry.trim().split('\n')
                return {
                    index: lines[0],
                    time: lines[1],
                    text: lines.slice(2).join('\n')
                }
            })

            console.log('Subtitles length: ' + subtitles.length)


            const promises = subtitles.map(async (entry, i) => {
                const request: any = {
                    input: { text: entry.text },
                    voice: { languageCode: 'en-US', name: 'en-US-Neural2-I' },
                    audioConfig: { audioEncoding: 'LINEAR16' },
                }
                const [response] = await client.synthesizeSpeech(request)
                const writeFile = util.promisify(fs.writeFile)
                await writeFile(path.join(__dirname, 'app', 'output', 'temp', 'mp3', `output_${i}.mp3`), response.audioContent as string, 'binary')
            })

            return Promise.all(promises)
        }
        createTTS()

        const modifySubtitles = () => {
            console.log('Running modify subtitles')
            const subtitlePath = path.join(__dirname, 'config', 'subtitles.srt')
            const mp3Folder = path.join(__dirname, 'app', 'output', 'temp', 'mp3')

            console.log(subtitlePath)
            console.log(mp3Folder)

            // Step 1: Read the subtitle file
            const subtitlesContent = fs.readFileSync(subtitlePath, 'utf8')
            const subtitlesLines = subtitlesContent.split('\n')

            // Step 2: Get lengths of the MP3 files
            const mp3Files = fs.readdirSync(mp3Folder)
            console.log(mp3Files)

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
        modifySubtitles()

        const addSubtitles = (): void => {
            const inputVideoPath: string = path.join(__dirname, 'app', 'output', 'temp', 'concatenated.mp4')
            const subtitlesPath: string = path.join(__dirname, 'config', 'subtitles.srt')
            const outputVideoPath: string = path.join(__dirname, 'app', 'output', 'temp', 'subtitled.mp4')

            try {
                const process = spawnSync('ffmpeg', [
                    '-i', inputVideoPath,
                    '-vf', `subtitles=${subtitlesPath}:force_style='Alignment=10'`,
                    outputVideoPath
                ], { stdio: 'inherit' })

                if (process.status === 0) {
                    console.log('Subtitles added successfully.')
                } else {
                    console.error(`FFmpeg process exited with code ${process.status}`)
                }
            } catch (error) {
                console.error('Error executing ffmpeg:', error)
            }
        }
        //addSubtitles()

        // END OF PROCESSING
        // FINISHING UP
        // Mark combination as processed
        combination[3] = true
        // Save combinations back to file
        fs.writeFileSync(combinationsPath, JSON.stringify(combinations, null, 2))
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
            new Promise(resolve => setTimeout(resolve, waitTime))
        }
        console.log('\n')
    }


    // End the script
    crashManager('stop')
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

if (process.argv.includes('--test')) {
    console.log('===== TEST MODE ENABLED =====')
    console.log('Google Application Credentials path: ' + process.env.GOOGLE_APPLICATION_CREDENTIALS)
    console.log('\n')
}

main(testingMode)