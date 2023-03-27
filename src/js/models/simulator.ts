import { SNPSystemModel } from "./sn-p-system"
import { SNPSystemModule } from "../wasm-wrapper/snp-system"

export class SimulatorModel {
    // WASM memory
    private memory = new WebAssembly.Memory({
        initial: 10
    })
    private wasmModule : SNPSystemModule
    // Model definition
    private transposedSpikingTransitionMatrix : Int8Array
    private initialConfigurationVector : Int8Array
    private configurationVector : Int8Array
    private delayStatusVector : Int8Array
    private delayVector : Int8Array
    private ruleCountVector : Int8Array
    // Input to get next config
    private indicatorVector : Int8Array
    // History
    private indicatorVectorStack : Array<Int8Array> = []
    private delayStatusVectorStack : Array<Int8Array> = []

    public constructor(model: SNPSystemModel){
        const wasmModule = new SNPSystemModule(this.memory)

        this.transposedSpikingTransitionMatrix = 
            wasmModule.allocateInt8Array(model.getTransposedSpikingTransitionMatrix())
        this.initialConfigurationVector = model.getInitialConfigurationVector()
        this.configurationVector = 
            wasmModule.allocateInt8Array(model.getInitialConfigurationVector())
        this.delayStatusVector = 
            wasmModule.allocateInt8Array(model.getInitialDelayStatusVector())
        this.delayVector = 
            wasmModule.allocateInt8Array(model.getDelayVector())
        this.ruleCountVector = 
            wasmModule.allocateInt8Array(model.getRuleCountVector())
        this.indicatorVector = 
            wasmModule.allocateInt8Array(this.configurationVector.fill(0))

        this.wasmModule = wasmModule
    }

    public next(indicatorVector: Int8Array){
        this.indicatorVectorStack.push(indicatorVector)
        this.delayStatusVectorStack.push(new Int8Array(this.delayStatusVector))

        this.indicatorVector.set(indicatorVector)
        this.wasmModule.getNext(
            this.configurationVector.byteOffset,
            this.delayStatusVector.byteOffset,
            this.transposedSpikingTransitionMatrix.byteOffset,
            this.delayVector.byteOffset,
            this.ruleCountVector.byteOffset,
            this.indicatorVector.byteOffset,
            this.indicatorVector.length,
            this.configurationVector.length
        )
    }

    public prev(){
        const prevIndicatorVector = this.indicatorVectorStack.pop()
        if (!prevIndicatorVector)
            throw new Error('Reached starting configuration')

        this.indicatorVector.set(prevIndicatorVector)

        this.wasmModule.getPrevConfigurationVector(
            this.configurationVector.byteOffset,
            this.transposedSpikingTransitionMatrix.byteOffset,
            this.delayStatusVector.byteOffset,
            this.indicatorVector.byteOffset,
            this.indicatorVector.length,
            this.configurationVector.length
        )

        const prevDelayStatusVector = this.delayStatusVectorStack.pop()!
        this.delayStatusVector.set(prevDelayStatusVector)
    }

    public reset(){
        if (!this.initialConfigurationVector || !this.delayStatusVector)
            throw new Error('Model not set')

        this.configurationVector.set(this.initialConfigurationVector)
        this.delayStatusVector.set(this.delayStatusVector.map(_ => 0))
    }
}