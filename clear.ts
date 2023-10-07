export default async function clear() {
    process.stdout.write('\x1Bc')
}
