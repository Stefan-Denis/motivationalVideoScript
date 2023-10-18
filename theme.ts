// UI
import chalkAnimation from 'chalk-animation'
import gradient from 'gradient-string'
import inquirer from 'inquirer'
import figlet from 'figlet'
import chalk from "chalk"
import { createSpinner } from 'nanospinner'

// Custom
import { __dirname } from './__dirname.js'

// Node.js
import fs from 'fs-extra'
import path from 'path'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function welcomeMessage(init?: boolean) {
    switch (init) {
        case true:
            const msg: string = `Welcome, please pick an option`
            figlet(msg, (err, data) => {
                console.log(gradient.mind.multiline(data))
            })
            await sleep(50)
            break

        case false:
            console.log(gradient.mind.multiline(`Please pick an option`))
            break

        default:
            break
    }
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
        message: 'Main Menu',
        choices: [
            'Edit a video theme',
            'Reset all video themes',
            'Show themes',
            'Exit'
        ]
    })

    return answer.option
}

(async () => {
    // Initialise variables
    const themeFile: string = path.join(__dirname, 'config', 'videoThemes.json')

    await welcomeMessage(true)
    const mainMenuOption: string = await ask()

    // See what the picked option was
    switch (mainMenuOption) {
        case 'Edit a video theme':

            break

        case 'Reset all video themes':

            break

        case 'Show themes':
            console.clear()
            const data: Array<string> = JSON.parse(fs.readFileSync(themeFile, 'utf-8'))

            for (let x = 0; x < data.length; x++) {
                const item = data[x]
                console.log('\n')
                console.log(chalk.yellow() + gradient.mind(`${item[0]}:`))
                await sleep(50)
                console.log('   ' + gradient.retro(`Theme:`))
                await sleep(150)
                console.log('       ' + chalk.white(item[1]))
                await sleep(300)
            }

            const answer = await inquirer.prompt({
                name: 'option',
                type: 'input',
                message: 'Press enter to exit',
            })

            break

        case 'Exit':
            console.clear()
            const spinner = createSpinner('Exiting app . . .').start()
            await sleep(1000)
            process.exit(0)

        default:
            await defaultError('Menu Bug', 4000)
    }
})()
