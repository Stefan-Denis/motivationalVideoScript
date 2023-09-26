import { __dirname } from './__dirname.js'
import fs from 'fs-extra'
import path from 'path'

export default async function crashManager(script: string): Promise<void> {
    try {
        if (script == 'start') {
            await fs.writeFile(path.join(__dirname, 'config', 'crash.txt'), 'running', 'utf-8')
        } else if (script == 'stop') {
            await fs.writeFile(path.join(__dirname, 'config', 'crash.txt'), 'notRunning', 'utf-8')
        } else {
            console.error('error: Unknown parameter given to the function: ' + script)
        }
    } catch (error) {
        console.error('Error in crashManager:', error)
    }
}
