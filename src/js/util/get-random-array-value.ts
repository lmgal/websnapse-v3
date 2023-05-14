export default function getRandomArrayValue<T>(array: Array<T>) {
    if (array.length === 0)
        return null
    return array[Math.floor(Math.random() * array.length)]
}