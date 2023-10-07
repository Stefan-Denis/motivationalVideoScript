import { __dirname } from './__dirname.js'
import fs from 'fs-extra'
import path from 'path'

export default function crashManager(script: string) {
    try {
        if (script == 'start') {
            fs.writeFileSync(path.join(__dirname, 'config', 'crash.txt'), 'running', 'utf-8')
        } else if (script == 'stop') {
            fs.writeFileSync(path.join(__dirname, 'config', 'crash.txt'), 'notRunning', 'utf-8')
        } else {
            console.error('error: Unknown parameter given to the function: ' + script)
        }
    } catch (error) {
        console.error('Error in crashManager:', error)
    }
}
