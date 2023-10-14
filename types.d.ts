interface UI {
    add: (message: string) => void
    remove: () => void
}

type Permutations = Array<[string, string, string, boolean]>

type Prompt = string

interface TTSEntry {
    index: string
    time: string
    text: string
}