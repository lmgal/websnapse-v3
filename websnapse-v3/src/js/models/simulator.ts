/// <reference types="emscripten" />
import { SNPSystemModel } from "./sn-p-system.js"
// @ts-ignore
import SNPModule from '../wasm/sn-p-system.js'

type WasmInt8Array = { 
    data: Int8Array
    offset: number 
}

interface SNPSystemModule extends EmscriptenModule {
    _getNext(
        configurationVectorOffset: number,
        delayStatusVectorOffset: number,
        transposedSpikingTransitionMatrixOffset: number,
        delayVectorOffset: number,
        ruleCountVectorOffset: number,
        decisionVectorOffset: number,
        delayedSpikingVectorOffset: number,
        spikeTrainVectorOffset: number,
        ruleCount: number,
        neuronCount: number
    ) : void
}

export class SimulatorModel {
    // @ts-ignore 
    private module : SNPSystemModule
    // Model definition
    private model! : SNPSystemModel
    private transposedSpikingTransitionMatrix! : WasmInt8Array
    private initialConfigurationVector! : Int8Array
    private delayVector! : WasmInt8Array
    private ruleCountVector! : WasmInt8Array
    private spikeTrainVectors! : Array<Int8Array>
    private outputNeuronIndices! : Int8Array
    // States
    private configurationVector! : WasmInt8Array
    private delayStatusVector! : WasmInt8Array
    private delayedSpikingVector! : WasmInt8Array
    // Input to get next config
    private decisionVector! : WasmInt8Array
    private spikeTrainVector! : WasmInt8Array
    // History
    private time = 0
    private configurationVectorStack : Array<Int8Array> = []
    private decisionVectorStack : Array<Int8Array> = []
    private delayStatusVectorStack : Array<Int8Array> = []
    private outputSpikeTrains: Array<Array<boolean>> = []

    public constructor(model: SNPSystemModel){
        (async () => {
            this.module = await SNPModule()
            
            const wasmMalloc = (array: Int8Array) : WasmInt8Array => {
                const offset = this.module._malloc(array.length * Int8Array.BYTES_PER_ELEMENT)
                this.module.HEAP8.set(array, offset)
                return {
                    data: this.module.HEAP8.subarray(offset, offset + array.length) as Int8Array,
                    offset: offset as number
                }
            }

            this.model = model
            this.transposedSpikingTransitionMatrix = wasmMalloc(model.getTransposedSpikingTransitionMatrix())
            this.initialConfigurationVector = model.getInitialConfigurationVector()
            this.delayVector = wasmMalloc(model.getDelayVector())
            this.ruleCountVector = wasmMalloc(model.getRuleCountVector())
            this.outputNeuronIndices = model.getOutputNeuronIndices()

            this.configurationVector = wasmMalloc(this.initialConfigurationVector)
            this.delayStatusVector = wasmMalloc(this.initialConfigurationVector.map(_ => 0))
            this.delayedSpikingVector = wasmMalloc(this.delayVector.data.map(_ => 0))

            this.decisionVector = wasmMalloc(new Int8Array(model.getRuleCount()))
            this.spikeTrainVector = wasmMalloc(new Int8Array(model.getRuleCount()))
            this.spikeTrainVectors = model.getSpikeTrainVectors()
            for (const _ of this.outputNeuronIndices){
                this.outputSpikeTrains.push([])
            }
        })()
    }

    public next(decisionVector: Int8Array){
        if (!this.configurationVector.data.some((spike) => spike > 0))
            throw new Error('Reached final configuration')

        this.configurationVectorStack.push(new Int8Array(this.configurationVector.data))

        this.decisionVectorStack.push(decisionVector)
        this.delayStatusVectorStack.push(new Int8Array(this.delayStatusVector.data))

        this.decisionVector.data.set(decisionVector)
        this.spikeTrainVector.data.set(this.spikeTrainVectors[this.time++] ?? this.spikeTrainVector.data.fill(0))

        this.module._getNext(
            this.configurationVector.offset,
            this.delayStatusVector.offset,
            this.transposedSpikingTransitionMatrix.offset,
            this.delayVector.offset,
            this.ruleCountVector.offset,
            this.decisionVector.offset,
            this.delayedSpikingVector.offset,
            this.spikeTrainVector.offset,
            this.decisionVector.data.length,
            this.configurationVector.data.length
        )

        for (let i = 0; i < this.outputNeuronIndices.length; i++){
            const index = this.outputNeuronIndices[i]
            this.outputSpikeTrains[i].push(this.configurationVector.data[index] > 0)
        }
    }

    public prev(){
        if (this.time === 0)
            throw new Error('Reached starting configuration')

        const prevConfigurationVector = this.configurationVectorStack.pop()!
        this.configurationVector.data.set(prevConfigurationVector)

        this.decisionVectorStack.pop()

        this.spikeTrainVector.data.set(this.spikeTrainVectors[--this.time] ?? this.spikeTrainVector.data.fill(0))

        const prevDelayStatusVector = this.delayStatusVectorStack.pop()!
        this.delayStatusVector.data.set(prevDelayStatusVector)
    }

    public getCurrentVectors(){
        return {
            time: this.time,
            configurationVector: this.configurationVector.data,
            delayStatusVector: this.delayStatusVector.data
        }
    }

    public getApplicableRules(){
        return this.model.getApplicableRules(
            this.configurationVector.data, 
            this.delayStatusVector.data,
            this.delayedSpikingVector.data,
        )
    }

    public reset(){
        this.configurationVector.data.set(this.initialConfigurationVector)
        this.delayStatusVector.data.set(this.delayStatusVector.data.map(_ => 0))
    }

    public destroy(){
        this.module._free(this.transposedSpikingTransitionMatrix.offset)
        this.module._free(this.configurationVector.offset)
        this.module._free(this.delayStatusVector.offset)
        this.module._free(this.delayVector.offset)
        this.module._free(this.ruleCountVector.offset)
        this.module._free(this.decisionVector.offset)
        this.module._free(this.delayedSpikingVector.offset)
        this.module._free(this.spikeTrainVector.offset)
    }
}