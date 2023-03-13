type GetNext = ((
    configurationVector: number,
    delayStatusVector: number,
    transposedSpikingTransitionMatrix: number,
    delayVector: number,
    ruleCountVector: number,
    indicatorVector: number,
    ruleCount: number,
    neuronCount: number
) => void)

type GetPrevConfigVector = ((
    configurationVector: number,
    transposedSpikingTransitionMatrix: number,
    delayStatusVector: number,
    prevIndicatorVector: number,
    ruleCount: number,
    neuronCount: number
) => void)

export class SNPSystemModule {
    public static source = '../wasm/snp-system.wasm'

    // @ts-expect-error
    public getNext : GetNext
    // @ts-expect-error
    public getPrevConfigurationVector : GetPrevConfigVector
    public memory : WebAssembly.Memory

    private offset = 0

    public constructor(memory: WebAssembly.Memory){
        (async () => {
            const { instance } = await WebAssembly.instantiateStreaming(
                fetch(SNPSystemModule.source), { js: {mem: memory} })
            this.getNext = instance.exports.getNext as GetNext
            this.getPrevConfigurationVector 
                = instance.exports.getPrevConfigurationVector as GetPrevConfigVector
        })()
        this.memory = memory
    }

    public allocateInt8Array = (sourceArray: Int8Array) => {
        const array = new Int8Array(this.memory.buffer, this.offset, sourceArray.length)
        array.set(sourceArray)
        this.offset += sourceArray.length * Int8Array.BYTES_PER_ELEMENT
        return array
    }

}