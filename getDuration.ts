import ffmpeg from 'fluent-ffmpeg'

export default async function getMp3Duration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err)
            } else {
                const durationInSeconds = metadata.format?.duration || 0
                resolve(durationInSeconds)
            }
        })
    })
}
