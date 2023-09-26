import cliSpinners from 'cli-spinners'

let interval: NodeJS.Timeout | null = null

export default async function showLoadingAnimation(message: string, time: number) {
    const spinner = cliSpinners.dots
    let i = 0

    interval = setInterval(() => {
        process.stdout.clearLine(0)  // Clear the previous line
        process.stdout.cursorTo(0)  // Move cursor to beginning of line
        process.stdout.write(spinner.frames[i] + ' ' + message)

        i = (i + 1) % spinner.frames.length
    }, spinner.interval)

    // Stop the animation
    setTimeout(() => {
        if (interval !== null) {
            clearInterval(interval)
            process.stdout.clearLine(0)
            process.stdout.cursorTo(0)
        }
    }, time)
}

// Function to stop the animation
export function stopLoadingAnimation() {
    if (interval !== null) {
        clearInterval(interval)
        process.stdout.clearLine(0)
        process.stdout.cursorTo(0)
    }
}
