// UI
import chalkAnimation from 'chalk-animation'
import gradient from 'gradient-string'
import inquirer from 'inquirer'
import figlet from 'figlet'
import chalk, { Chalk } from "chalk"
import { createSpinner } from 'nanospinner'

// Custom
import { __dirname } from './__dirname.js'

// Node.js
import fs from 'fs-extra'
import path from 'path'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function welcomeMessage() {
    const msg: string = `Main Menu`
    figlet(msg, (err, data) => {
        console.log(gradient.mind.multiline(data))
    })
    await sleep(50)
}

async function defaultError(extraMessage?: string, time?: number) {
    const exitSpinner = createSpinner()

    // I know it looks weird but leave it like this
    // It is for formatting reasons
    console.log(`
    ${chalk.bgRed('ERROR!')}
            `)

    exitSpinner.error({
        text: `An error has occoured, 
    ${extraMessage}                            
        ` })

    await sleep(time || 3000)

    process.exit(1)
}

async function ask() {
    const answer = await inquirer.prompt({
        name: 'option',
        type: 'list',
        message: '-------------------------------',
        choices: [
            'Video Theme Editor',
            'Reset all video themes',
            'Show themes',
            'Exit'
        ]
    })

    return answer.option
}

async function renameScreen(themeFile: string) {
    console.clear()

    const askAboutChoice = await inquirer.prompt({
        name: 'choice',
        type: 'list',
        message: 'Select an option',
        choices: [
            `Edit just a single video's comment`,
            'Create the Video Theme data (Erases previous data)',
            'Back'
        ]
    })

    if (askAboutChoice.choice === `Edit just a single video's comment`) {
        console.clear()
        const videoDir = path.join(__dirname as string, 'app', 'input')
        const videos = fs.readdirSync(videoDir).filter(file => {
            return path.extname(file).toLowerCase() === '.mp4'
        })

        const askWhichVideo = await inquirer.prompt({
            name: 'video',
            type: 'list',
            message: 'Select a video',
            choices: videos
        })

        console.clear()
        console.log(chalk.bold(chalk.white('Selected video: ' + chalk.gray(askWhichVideo.video))))
        process.stdout.write(chalk.bold(chalk.white(`Enter the video's theme: `)))

        const videoTheme = await inquirer.prompt({
            name: 'theme',
            type: 'input',
            message: ` `,
        })

        // Read and write the videoTheme Array
        const data: Array<Array<string>> = JSON.parse(fs.readFileSync(themeFile, 'utf-8'))

        for (let x = 0; x < data.length; x++) {
            if (data[x][0] === askWhichVideo.video) {
                data[x][1] = videoTheme.theme
                continue
            }
        }

        fs.writeFileSync(themeFile, JSON.stringify(data, null, 2), 'utf-8')

        createSpinner().success({ text: 'Edit successful' })

        await sleep(2000)

        callRenameScreen(themeFile)
    }

    else if (askAboutChoice.choice === 'Create the Video Theme data (Erases previous data)') {
        const videoDir = path.join(__dirname as string, 'app', 'input')
        const videos = fs.readdirSync(videoDir).filter(file => {
            return path.extname(file).toLowerCase() === '.mp4'
        })

        let data: Array<Array<string>> = []

        for (let x = 0; x < videos.length; x++) {
            data[x] = [videos[x], '']
        }

        fs.writeFileSync(themeFile, JSON.stringify(data, null, 2), 'utf-8')

        createSpinner().success({ text: 'Video Theme file successfully re-written!' })
        await sleep(4000)
        callMain()
    }

    else if ('Back') {
        callMain()
    }
}

async function callRenameScreen(themeFile: string) {
    console.clear()
    await renameScreen(themeFile)
}

async function callMain() {
    console.clear()
    await main()
}

async function main() {
    // Initialise variables
    const themeFile: string = path.join(__dirname, 'config', 'videoThemes.json')

    await welcomeMessage()
    const mainMenuOption: string = await ask()

    // See what the picked option was
    switch (mainMenuOption) {
        case 'Video Theme Editor':
            await renameScreen(themeFile)
            break

        case 'Reset all video themes':
            console.clear()

            const askForPermission = await inquirer.prompt({
                name: 'choice',
                type: 'list',
                message: 'Are you sure you want to delete the themes of the video?',
                choices: [
                    'Yes',
                    'No'
                ]
            })

            if (askForPermission.choice === 'Yes') {
                const spinner = createSpinner('Resetting combination . . .').start()

                fs.writeFile(themeFile, JSON.stringify([]), async (err) => {
                    if (err) {
                        await sleep(750)
                        spinner.error({ text: chalk.bgRed('Error resetting themes') })
                        await sleep(2000)
                        callMain()
                    } else {
                        await sleep(750)
                        spinner.success({ text: 'Themes resetted successfully' })
                        await sleep(2000)
                        callMain()
                    }
                })
            }

            else if (askForPermission.choice === 'No') {
                console.clear()
                const spinner = createSpinner('Files will not be deleted, returning to main menu . . .').start()
                await sleep(2000)
                spinner.stop()
                callMain()
            }

            else {
                console.clear()
                console.log(chalk.bgRed('A critical error has occoured, the themes have not been deleted'))
                await sleep(2000)
                callMain()
            }

            break

        case 'Show themes':
            console.clear()
            const data: Array<string> = JSON.parse(fs.readFileSync(themeFile, 'utf-8'))

            const msg: string = 'Video Themes'
            figlet(msg, (err, data) => {
                console.log(gradient.mind.multiline(data))
            })

            for (let x = 0; x < data.length; x++) {
                const item = data[x]
                console.log('\n')
                console.log(chalk.yellow() + gradient.mind(`${item[0]}:`))
                await sleep(50)
                console.log('   ' + gradient.retro(`Theme:`))
                await sleep(150)
                console.log('       ' + chalk.white(item[1]))
                await sleep(150)
            }

            console.log('\n')

            const answer = await inquirer.prompt({
                name: 'option',
                type: 'input',
                message: 'Press enter to exit',
            })

            await callMain()
            break

        case 'Exit':
            console.clear()
            createSpinner('Exiting app . . .').start()
            await sleep(1000)
            process.exit(0)

        default:
            await defaultError('Menu Bug', 4000)
    }
}

(async () => {
    await main()
})()

/* // ^ TEST DATA

[
    [
        "video1",
        "A video about cars"
    ],
    [
        "video2",
        "A video with a pc"
    ],
    [
        "vasdasdeo1",
        "A video about cars"
    ],
    [
        "avasdasdideo3",
        "A video with a pc"
    ],
    [
        "dsafsafga1",
        "A video about cars"
    ],
    [
        "cars",
        "A video with a pc"
    ],
    [
        "life.mp4",
        "A video about cars"
    ],
    [
        "sanjldsabnjofboaidfidasfidas.mp4",
        "A video with a pc"
    ]
]

*/