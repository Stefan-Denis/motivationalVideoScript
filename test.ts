import path from 'path'; import { __dirname } from "./__dirname.js"

console.log(path.join(__dirname, 'app', 'output', 'temp', 'concatenated.mp4').replace(/\\/g, '\\\\'))
console.log(path.join(__dirname, 'config', 'subtitles.srt').replace(/\\/g, '\\\\'))
console.log(path.join(__dirname, 'app', 'output', 'temp', 'subtitled.mp4').replace(/\\/g, '\\\\'))