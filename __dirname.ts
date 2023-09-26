import { dirname, join } from 'path'

const __filename = new URL(import.meta.url).pathname
const __dirname = dirname(__filename)
const parentDir = join(__dirname, '..').slice(1) // This will give you the parent directory

export { parentDir as __dirname }
