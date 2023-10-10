// Node Modules
import { TextToSpeechClient } from '@google-cloud/text-to-speech'
import { spawn, ChildProcess, spawnSync } from 'child_process'
import { execSync } from 'child_process'
import internal from 'stream'
import OpenAI from "openai"
import fs from 'fs-extra'
import path from 'path'
import util from 'util'

// Custom
import showLoadingAnimation, { stopLoadingAnimation } from './cli.js'
import getMp3Duration from './getDuration.js'
import crashManager from './crashManager.js'
import { __dirname } from "./__dirname.js"
import clear from './clear.js'
import wait from './wait.js'

// dotenv
import { DotenvConfigOptions, configDotenv } from 'dotenv'
import { ChatCompletion } from 'openai/resources/chat/index.mjs'
configDotenv({ path: path.join(__dirname, 'config', '.env') }) as DotenvConfigOptions

// Cleanup from last use
async function cleanup(): Promise<void> {

    // Directories specified for deletion
    const inputDir: string = path.join(__dirname as string, 'app' as string, 'input' as string) // used for renaming all the files
    const dir: string = path.join(__dirname as string, 'app' as string, 'output' as string) // Make temp dir
    const tempdir: string = path.join(__dirname as string, 'app' as string, 'output' as string, 'temp' as string) // Make temp dir
    const mp3dir: string = path.join(__dirname as string, 'app' as string, 'output' as string, 'temp' as string, 'mp3' as string) // Make mp3 folder

    async function renameClips(): Promise<void> {
        const files = fs.readdirSync(inputDir)

        files.forEach((file, index) => {
            const oldPath = path.join(inputDir, file)
            const newPath = path.join(inputDir, `${index + 1}${path.extname(file)}`)
            fs.renameSync(oldPath, newPath)
        })
    }

    //TODO: rename files from input
    async function main(): Promise<void> {
        await renameClips()
        fs.emptyDirSync(dir) as void
        fs.mkdirSync(tempdir) as void
        fs.mkdirSync(mp3dir) as void
    }

    async function UI(): Promise<void> {
        console.log('🗑️　Cleaning up from last use: ') as void
        showLoadingAnimation(`Deleting Directory Contents Of: ${tempdir}`, 3000) as Promise<void>
        await wait(3000) as void
        clear() as Promise<void>
    }

    await main() as void
    await UI() as void
}

// Create all combinations of videos possible
async function createCombinations(): Promise<void> {
    function main(): void {

        // This is the video directory where the user places the files for video creation
        // Must contain at least 3 files
        // Reccomended to not have more than 4 to 5 files due to long processing times
        const inputDir: string = path.join(__dirname as string, 'app' as string, 'input' as string)

        function getVideoFiles(dir: string): Array<string> {
            return fs.readdirSync(dir as string).filter(file => path.extname(file) === '.mp4') as Array<string>
        }

        // Generates all possible combinations that you can create with the videos you fed it
        // Max 3 clips per video
        // can generate from 9 videos to as many as you want
        function generateCombinations(files: Array<string>): Permutations {

            // Check types.d.ts for the type
            // Permutations type contains all the types of data it needs to store
            const permutations: Permutations = []
            const len: number = files.length as number

            // Loop that generates the combinations
            // Is created to make combinations of 3 videos concatenated
            for (let i: number = 0; i < len; i++) {
                for (let j: number = 0; j < len; j++) {
                    for (let k: number = 0; k < len; k++) {
                        if (i as number !== j as number && j as number !== k as number && k as number !== i as number) {
                            permutations.push([files[i] as string, files[j] as string, files[k] as string, false as boolean]) as number
                        }
                    }
                }
            }

            return permutations as Permutations
        }

        const videoFiles: Array<string> = getVideoFiles(inputDir as string) as Array<string>
        const combinations: Permutations = generateCombinations(videoFiles as Array<string>) // Correct type

        const combinationsJSON: string = JSON.stringify(combinations as Permutations, null as null, 2 as number) as string
        const combinationsFilePath: string = path.join(__dirname as string, 'config' as string, 'combinations.json' as string) as string

        fs.writeFileSync(combinationsFilePath as string, combinationsJSON as string) as void
    }

    async function UI(): Promise<void> {
        showLoadingAnimation(`Generating All Possible Combinations`, 2500) as Promise<void>
        await wait(2500) as void
    }

    main() as void
    await UI() as void
}

async function trimVideos(): Promise<void> {
    async function main(): Promise<void> {
        try {
            const files: Array<string> = fs.readdirSync(path.join(__dirname as string, 'app' as string, 'input' as string))

            for (const file of files as Array<string>) {
                if (file.endsWith('.mp4') as boolean) {
                    UI.add('Trimming: ' as string + file as string)

                    await new Promise<void>((resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void) => {

                        // Input paths for the base videos
                        // will be trimmed
                        const inputFilePath: string = path.join(__dirname as string, 'app' as string, 'input' as string, file as string)

                        // output path for the videos which will be stored temporarily inside `temp` folder
                        const outputFilePath: string = path.join(__dirname as string, 'app' as string, 'output' as string, 'temp' as string, file as string)

                        const process: ChildProcess = spawn('ffmpeg', [
                            '-y' as string,  // Overwrite output files without asking
                            '-i' as string, inputFilePath as string,  // Input file path

                            // Remove Audio
                            '-an' as string,

                            // Specify the framerate
                            '-r' as string, '60' as string,

                            // Specify video codec (H.264), resolution (720x1280), and framerate (30 fps)
                            '-c:v' as string, 'libx264' as string,
                            '-vf' as string, 'scale=720:1280' as string,

                            // Use a preset for libx264 for speed/quality trade-off
                            '-preset' as string, 'medium' as string,

                            // Set a target video bitrate (adjust the value as needed)
                            '-b:v' as string, '2M' as string,

                            // Set the Constant Rate Factor for quality (adjust the value as needed)
                            '-crf' as string, '20' as string,

                            // Set the pixel format to yuv420p
                            '-pix_fmt' as string, 'yuv420p' as string,

                            // Specify audio codec (AAC) and sample rate (44100 Hz)
                            '-c:a' as string, 'aac' as string,
                            '-ar' as string, '44100' as string,

                            // Specify start time (0 seconds) and duration (5 seconds)
                            '-ss' as string, '0' as string,
                            '-t' as string, '5' as string,

                            // Output file path
                            outputFilePath as string
                        ])

                        process.on('close', (code: number) => {
                            if (code === 0) {
                                resolve() as void
                            } else {
                                reject(new Error(`FFmpeg process exited with code ${code}` as string) as Error) as void
                            }
                        }) as ChildProcess
                    }) as void
                    UI.remove() as void
                }
            }
        } catch (err) {
            console.log('\n') as void
            console.error('GENERIC ERROR MESSAGE: expected directory not found: ' as string + path.join(__dirname as string, 'app' as string, 'input' as string) as string) as void
            console.error('ACTUAL ERROR MESSAGE: ' + err) as void
            console.log('\n') as void
        }
    }

    // UI library
    // Experimenting with object based ui instead of function based
    const UI: UI = {
        add: (message: string): void => {
            showLoadingAnimation(message, 2_147_483_647) as Promise<void>
        },

        remove: (): void => {
            stopLoadingAnimation() as void
        }
    }

    await main() as void
}

async function getVideoTheme(videos: Array<string>): Promise<Array<string>> {
    const comments: Array<string> = []

    for (let i: number = 0; i < videos.length; i++) {
        const video: string = videos[i]
        const mediaInfo: ChildProcess = spawn('mediainfo', [path.join(__dirname as string, 'app' as string, 'input' as string, video as string) as string])
        let metadata: string = ''

        await new Promise<void>((resolve: (value: void | PromiseLike<void>) => void) => {
            mediaInfo.stdout!.on('data', (data: string) => {
                metadata += data.toString() as string
            }) as internal.Readable

            mediaInfo.on('close' as string, () => {
                const commentMatch: RegExpMatchArray | null = metadata.match(/Comment\s*:\s*(.*)/i)
                if (commentMatch && commentMatch[1]) {
                    comments.push(commentMatch[1] as string) as number
                } else {
                    console.log(i + ' No comment found for this video.' as string) as void
                }
                resolve() as void // Resolve the promise once comments are processed
            })
        })
    }

    return comments as Array<string>
}

async function createScript(video1: string, video2: string, video3: string): Promise<string> {

    // The prompt
    // Uses its own custom type
    // Check types.d.ts
    const prompt: Prompt = `Generate a concise .srt script for a motivational video with three 5-second clips (max 15 seconds total). Say something in the first subtitle that will HOOK the viewer to watch to the end. Use all the tricks in the book to get the viewer to watch to the end
    
    Make the script readable by humans. Provide assertive, red-pill style motivation:

    Video 1 Theme: ${video1 as string}
    Video 2 Theme: ${video2 as string}
    Video 3 Theme: ${video3 as string}

    Each clip should be exactly 15 seconds long. Ensure that the script fits within this time frame and make sure that the character count does not exceed 55 characters but try to be above 45 and between 45 - 55 characters.

    you must respect the word limit with your life, failure to respect this limit can bring many consequences that we do not want to face. If a quote or subtitle is SMALLER than 45 characters but LONGER than 55 we will both face the consequences. IF I DARE catch YOU somehow making quotes less than 45 characters or more than 55 characters, oh boy I don't want to face the consequences alongside you. You DEPEND on generating THIS CORRECTLY.

    1
    00:00:00,000 --> 00:00:05,000
    <generate text here and use the video 1 themes for it and keep it one line MAX 55 CHARACTERS>

    2
    00:00:05,000 --> 00:00:10,000
    <generate text here and use the video 2 themes for it and keep it one line MAX 55 CHARACTERS>

    3
    00:00:10,000 --> 00:00:15,000
    <generate text here and use the video 3 themes for it and keep it one line MAX 55 CHARACTERS>
    `

    const openai = new OpenAI({
        apiKey: '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' as string
    })

    const completion: ChatCompletion = await openai.chat.completions.create({
        messages: [{ role: 'system', content: prompt }] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        model: 'gpt-3.5-turbo' as string,
    })

    const generatedScript: string = completion.choices[0].message.content as string

    // Return the generated script
    return generatedScript as string
}

async function playVideo(videoPath: string) {
    const ffplay = spawn('ffplay', [videoPath])

    ffplay.on('error', (err) => {
        console.error('Error starting ffplay:', err)
    })

    ffplay.on('close', (code) => {
        console.log(`ffplay process exited with code ${code}`)
    })

    // Set a timeout to kill the process after 16 seconds
    setTimeout(() => {
        ffplay.kill('SIGINT') // This sends the interrupt signal to terminate the process
    }, 16000) // 16 seconds in milliseconds
}

// The main function
// all scripts execute here
// has a testing mode built in
async function main(testingMode = false) {
    // Crash manager START
    await crashManager('start') as void

    // begin the process of creating the video combinations:
    await createCombinations() as void
    console.log('✅ Generated all video combinations') as void

    // Grab video theme
    const videos: Array<string> = fs.readdirSync(path.join(__dirname as string, 'app' as string, 'input' as string) as string) as Array<string>
    const themes: Array<string> = await getVideoTheme(videos) as Array<string>
    console.log('✅ Theme retrieved from each video' as string) as void

    // Load combinations
    const combinationsPath = path.join(__dirname, 'config', 'combinations.json')
    let combinations = JSON.parse(await fs.readFile(combinationsPath, 'utf-8'))
    let currentIndex = 0

    // Determine the end index based on testing mode
    let endIndex = testingMode ? currentIndex + 1 : combinations.length

    // Process each combination
    for (let i = currentIndex; i < endIndex; i++) {
        const startTime = Date.now() // Record the start time

        // Clean up the directory
        await cleanup() as void
        console.log('✅ Finished cleanup') as void

        await trimVideos() as void
        console.log('✅ Trimmed all the videos') as void

        const combination = combinations[i]
        const [firstVideo, secondVideo, thirdVideo] = combination.slice(0, 3)

        console.log('\n')
        console.log(`Processing combination ${(i + 1)}:`, combinations[i])

        console.log('Video theme 1:', themes[(Number(firstVideo.slice(0, -4))) - 1])
        console.log('Video theme 2:', themes[(Number(secondVideo.slice(0, -4))) - 1])
        console.log('Video theme 3:', themes[(Number(thirdVideo.slice(0, -4))) - 1])

        // Create script with AI 
        console.log('Generating script...')
        const generatedScript = await createScript(themes[(Number(firstVideo.slice(0, -4))) - 1], themes[(Number(secondVideo.slice(0, -4))) - 1], themes[(Number(thirdVideo.slice(0, -4))) - 1])
        fs.writeFileSync(path.join(__dirname, 'config', 'subtitles.srt'), generatedScript as string)
        console.log('Generated script!')

        // Concat each clip together
        console.log('Concatenating videos...')
        const concat: Function = () => {
            return new Promise((resolve, reject) => {
                try {
                    const process = spawn('ffmpeg', [
                        '-i', path.join(__dirname, `./app/output/temp/${firstVideo}`),
                        '-i', path.join(__dirname, `./app/output/temp/${secondVideo}`),
                        '-i', path.join(__dirname, `./app/output/temp/${thirdVideo}`),
                        '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1:a=0[outv]',  // Removed audio references
                        '-map', '[outv]',
                        path.join(__dirname, './app/output/temp/concatenated.mp4')
                    ])

                    process.on('close', (code) => {
                        if (code === 0) {
                            resolve(true)
                        } else {
                            reject(`ffmpeg process exited with code ${code}`)
                        }
                    })
                } catch (error) {
                    console.log(error)
                }
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

                const voice: string = Math.random() > 0.5 ? "en-US-Neural2-D" : "en-US-Neural2-J"

                // Generate TTS audio for each subtitle
                for (let i = 0; i < subtitles.length; i++) {
                    const entry: any = subtitles[i]

                    const request: any = {
                        "audioConfig": {
                            "audioEncoding": "LINEAR16",
                            "effectsProfileId": [
                                "small-bluetooth-speaker-class-device"
                            ],
                            "pitch": -12,
                            "speakingRate": 0.90
                        },
                        "input": {
                            "text": entry.text
                        },
                        "voice": {
                            "languageCode": "en-US",
                            "name": voice
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

                console.log('File Duration ' + (i + 1) + ' ' + duration)

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

        async function createTTSFile() {
            console.log('Adding Text to Speech to video...')
            const ttsFiles: Array<string> = [
                '../app/output/temp/mp3/output_0.mp3',
                '../app/output/temp/mp3/output_1.mp3',
                '../app/output/temp/mp3/output_2.mp3'
            ]

            // Write code between these 2 comments
            let [duration1, duration2] = await Promise.all([
                getMp3Duration(ttsFiles[1] as string),
                getMp3Duration(ttsFiles[2] as string)
            ])

            duration1 = Math.round(duration1 * 1000)
            duration2 = Math.round(duration2 * 1000)

            console.log(
                'duration1: ' + duration1 + '\n' +
                'duration2: ' + duration2 + '\n'
            )

            // Calculate the delays
            const delay1 = 5000 - duration1
            const delay2 = 5000 - duration2

            console.log(
                'delay1: ' + delay1 + '\n' +
                'delay2: ' + delay2 + '\n'
            )

            // Make this for loop restart the for loop at the same index not higher
            if (delay1 < 0 || delay2 < 0) {
                return false as boolean
            }

            const ffmpegArgs = [
                '-i', ttsFiles[0],
                '-i', ttsFiles[1],
                '-i', ttsFiles[2],
                '-filter_complex',
                `[0:a]adelay=0|0[a0];` +
                `[1:a]adelay=${delay1}[a1];` +
                `[2:a]adelay=${delay2}[a2];` +
                `[a0][a1]concat=n=2:v=0:a=1[a01];` +
                `[a01][a2]concat=n=2:v=0:a=1[aout]`,
                '-map', '[aout]', '-b:a', '256k', // Setăm bitrate-ul aici
                '../app/output/temp/mp3/tts.mp3'
            ]

            const ffmpeg = spawnSync('ffmpeg', ffmpegArgs as Array<string>, { encoding: 'utf-8' })

            if (ffmpeg.stdout) {
                console.log(ffmpeg.stdout)
            }

            if (ffmpeg.stderr) {
                console.error(ffmpeg.stderr)
            }

            return true
        }

        async function applyTTS() {
            const inputVideo = '../app/output/temp/subtitled.mp4'
            const ttsFile = '../app/output/temp/mp3/tts.mp3'

            const ffmpegArgs: Array<string> = [
                '-i', inputVideo,
                '-i', ttsFile,

                // Copy video stream
                '-c:v', 'copy',

                // Map video from input
                '-map', '0:v:0',

                // Map audio from tts.mp3
                '-map', '1:a:0',

                // End the output when the shortest input ends
                '-shortest',
                `../app/output ${i + 1}.mp4` // ! DONT MODIFY, 
                // It is set like that because the cleanup
                // function deletes everything inside output
                // Will refactor in the future
                // TODO: Refactor the
            ]

            const result = spawnSync('ffmpeg', ffmpegArgs)

            if (result.error) {
                console.error('Error:', result.error)
            } else {
                console.log('TTS applied successfully!')
            }
        }

        const shouldRestart: boolean = await createTTSFile()

        if (!shouldRestart) {
            console.log('Delays are messed up, we will add the functionality later to make the function work')
            continue
        }

        await applyTTS()
        console.log('Added Text to Speech to video...')

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

        // await playVideo(path.join(__dirname as string, 'app' as string, `output ${i + 1}.mp4` as string))

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
// add subtitles to video
// add tts

main(testingMode)