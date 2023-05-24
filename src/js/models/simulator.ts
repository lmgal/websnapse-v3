/// <reference types="emscripten" />
import { SNPSystemModel } from "./system"
import SNPModule from '../wasm/sn-p-system'
import getRandomArrayValue from "../util/get-random-array-value"
import { INPUT_NEURON, Neuron, OUTPUT_NEURON } from "./neuron"

type WasmInt8Array = {
    data: Int8Array
    offset: number
}

interface SNPSystemModule extends EmscriptenModule {
    _getNext(
        configurationVectorOffset: number,
        delayStatusVectorOffset: number,
        firingVectorOffset: number,
        transposedSpikingTransitionMatrixOffset: number,
        delayVectorOffset: number,
        ruleCountVectorOffset: number,
        decisionVectorOffset: number,
        delayedIndicatorVectorOffset: number,
        spikeTrainVectorOffset: number,
        ruleCount: number,
        neuronCount: number
    ): void

    _getPrev(
        configurationVectorOffset: number,
        delayStatusVectorOffset: number,
        transposedSpikingTransitionMatrixOffset: number,
        delayVectorOffset: number,
        ruleCountVectorOffset: number,
        prevDecisionVectorOffset: number,
        prevDelayIndicatorVectorOffset: number,
        prevSpikeTrainVectorOffset: number,
        ruleCount: number,
        neuronCount: number
    ): void
}

export class SimulatorModel {
    private module: SNPSystemModule
    private simulating = false
    private nextInterval: ReturnType<typeof setInterval> | null = null
    private isFirstSetup = true
    // System vector definition
    private transposedSpikingTransitionMatrix!: WasmInt8Array
    private initialConfigurationVector!: Int8Array
    private delayVector!: WasmInt8Array
    private ruleCountVector!: WasmInt8Array
    private spikeTrainVectors!: Array<Int8Array>
    // States
    private configurationVector!: WasmInt8Array
    private delayStatusVector!: WasmInt8Array
    private firingVector!: WasmInt8Array
    private delayIndicatorVector!: WasmInt8Array
    // Input to get next config
    private decisionVector!: WasmInt8Array
    private spikeTrainVector!: WasmInt8Array
    // History
    private time = 0
    private decisionVectorStack: Array<Int8Array> = []
    private delayIndicatorVectorStack: Array<Int8Array> = []
    private firingVectorStack: Array<Int8Array>
    private outputSpikeTrains: Map<number, Array<number>> = new Map()
    // Binding callback functions
    private onChange: (configurationVector: Int8Array, delayStatusVector: Int8Array,
        firingVector: Int8Array, outputSpikeTrains: Map<number, Array<number>>, 
        decisionVectorStack: Array<Int8Array>) => void = () => { }
    private onDecisionNeed: (configurationVector: Int8Array, delayStatusVector: Int8Array) => void = () => {}

    public constructor() {
        SNPModule().then((module: SNPSystemModule) => {
            this.module = module
        })

    }

    public setSystem(system: SNPSystemModel) {
        if (!this.isFirstSetup) {
            this._free()
        }

        const wasmMalloc = (array: Int8Array): WasmInt8Array => {
            const offset = this.module._malloc(array.length * Int8Array.BYTES_PER_ELEMENT)
            this.module.HEAP8.set(array, offset)
            return {
                data: this.module.HEAP8.subarray(offset, offset + array.length) as Int8Array,
                offset: offset as number
            }
        }

        this.transposedSpikingTransitionMatrix = wasmMalloc(system.getTransposedSpikingTransitionMatrix())

        this.initialConfigurationVector = system.getInitialConfigurationVector()
        this.delayVector = wasmMalloc(system.getDelayVector())
        this.ruleCountVector = wasmMalloc(system.getRuleCountVector())

        this.configurationVector = wasmMalloc(this.initialConfigurationVector)
        this.delayStatusVector = wasmMalloc(this.initialConfigurationVector.map(_ => 0))
        this.firingVector = wasmMalloc(this.initialConfigurationVector.map(_ => 0))
        this.delayIndicatorVector = wasmMalloc(this.delayVector.data.map(_ => 0))

        this.decisionVector = wasmMalloc(new Int8Array(system.getRuleCount()))
        this.spikeTrainVector = wasmMalloc(new Int8Array(system.getRuleCount()))
        this.spikeTrainVectors = system.getSpikeTrainVectors()

        this.time = 0
        this.decisionVectorStack.length = 0
        this.delayIndicatorVectorStack.length = 0
        this.firingVectorStack = [this.initialConfigurationVector.map(_ => 0)]
        this.outputSpikeTrains.clear()
        for (const index of system.getOutputNeuronIndices()) {
            this.outputSpikeTrains.set(index, [])
        }
        
        this.simulating = true
        this.isFirstSetup = false
    }

    /**
     * Move the simulator to the next time step. Assume that the model has been set,
     * the simulator is not paused, and the simulator is not at the end of the simulation.
     * @param decisionVector 
     */
    public next(decisionVector: Int8Array) {
        this.decisionVectorStack.push(decisionVector)
        this.delayIndicatorVectorStack.push(this.delayIndicatorVector.data.slice())

        this.decisionVector.data.set(decisionVector)
        this.spikeTrainVector.data.set(this.spikeTrainVectors[this.time++] ?? this.spikeTrainVector.data.fill(0))

        this.module._getNext(
            this.configurationVector.offset,
            this.delayStatusVector.offset,
            this.firingVector.offset,
            this.transposedSpikingTransitionMatrix.offset,
            this.delayVector.offset,
            this.ruleCountVector.offset,
            this.decisionVector.offset,
            this.delayIndicatorVector.offset,
            this.spikeTrainVector.offset,
            this.decisionVector.data.length,
            this.configurationVector.data.length
        )

        // Push history
        this.firingVectorStack.push(this.firingVector.data.slice())
        for (const [index, spikeTrain] of this.outputSpikeTrains.entries()) {
            spikeTrain.push(this.configurationVector.data[index])
            // Reset output neuron
            this.configurationVector.data[index] = 0
        }

        this.onChange(this.configurationVector.data, this.delayStatusVector.data,
            this.firingVector.data, this.outputSpikeTrains, this.decisionVectorStack)
    }

    /**
     * Move the simulator to the previous time step. Assume that the model has been set,
     * the simulator is not paused, and the simulator is not at the beginning of the simulation.
     */
    public prev() {
        if (this.time === 0)
            throw new Error('Reached starting configuration')

        // Get previous decision vector
        this.decisionVector.data.set(this.decisionVectorStack.pop()!)
        // Get previous delay indicator vector
        this.delayIndicatorVector.data.set(this.delayIndicatorVectorStack.pop()!)
        // Get previous spike train vector
        this.spikeTrainVector.data.set(this.spikeTrainVectors[this.time--] ?? this.spikeTrainVector.data.fill(0))
        // Get previous firing vector (peek after pop)
        this.firingVectorStack.pop()
        this.firingVector.data.set(this.firingVectorStack[this.firingVectorStack.length - 1])

        this.module._getPrev(
            this.configurationVector.offset,
            this.delayStatusVector.offset,
            this.transposedSpikingTransitionMatrix.offset,
            this.delayVector.offset,
            this.ruleCountVector.offset,
            this.decisionVector.offset,
            this.delayIndicatorVector.offset,
            this.spikeTrainVector.offset,
            this.decisionVector.data.length,
            this.configurationVector.data.length
        )

        // Pop output spike train and reset output neuron
        for (const [index, spikeTrain] of this.outputSpikeTrains.entries()) {
            this.configurationVector.data[index] = 0
            spikeTrain.pop()
        }

        this.onChange(this.configurationVector.data, this.delayStatusVector.data,
            this.firingVector.data, this.outputSpikeTrains, this.decisionVectorStack)
    }

    public getState() {
        return {
            time: this.time,
            configurationVector: this.configurationVector.data,
            delayStatusVector: this.delayStatusVector.data
        }
    }

    public hasReachedFinalConfiguration(neurons: Array<Neuron>): boolean {
        // Check if all input spike trains have been processed
        const lastInputSpikeTime = this.spikeTrainVectors.length

        // Check if there is no applicable rules
        const hasNoApplicableRule = neurons.every((neuron, i) => 
            neuron.getApplicableRules(this.configurationVector.data[i]).length === 0
        )

        return hasNoApplicableRule && this.time >= lastInputSpikeTime
    }

    public reset() {
        this.time = 0
        // Reset vectors
        this.configurationVector.data.set(this.initialConfigurationVector)
        this.delayStatusVector.data.set(this.delayStatusVector.data.map(_ => 0))
        this.firingVector.data.set(this.firingVector.data.map(_ => 0))
        this.delayIndicatorVector.data.set(this.delayVector.data.map(_ => 0))
        // Reset history stack
        this.decisionVectorStack = []
        this.delayIndicatorVectorStack = []
        // Reset output spike trains
        for (const index of this.outputSpikeTrains.keys()) {
            this.outputSpikeTrains.set(index, [])
        }

        this.onChange(this.configurationVector.data, this.delayStatusVector.data,
            this.firingVector.data, this.outputSpikeTrains, this.decisionVectorStack)
    }

    private _free() {
        this.module._free(this.transposedSpikingTransitionMatrix.offset)
        this.module._free(this.configurationVector.offset)
        this.module._free(this.delayStatusVector.offset)
        this.module._free(this.delayVector.offset)
        this.module._free(this.ruleCountVector.offset)
        this.module._free(this.decisionVector.offset)
        this.module._free(this.delayIndicatorVector.offset)
        this.module._free(this.spikeTrainVector.offset)
    }

    public handleChange(handler: typeof this.onChange) {
        this.onChange = handler
    }

    public handleDecisionNeed(handler: typeof this.onDecisionNeed) {
        this.onDecisionNeed = handler
    }

    public isSimulating(): boolean {
        return this.simulating
    }

    public setSimulating(simulating: boolean): void {
        this.simulating = simulating
    }

    public getRandomDecisionVector(neurons: Array<Neuron>) {
        const decisionVector: Array<number> = []
        neurons.forEach((neuron, i) => {
            if (neuron.getType() === INPUT_NEURON) {
                decisionVector.push(0)
                return
            }
            if (neuron.getType() === OUTPUT_NEURON || neuron.getRules().length === 0) {
                return
            }

            if (this.delayStatusVector.data[i] > 0) {
                decisionVector.push(...neuron.getRules().map(_ => 0))
                return
            }

            const chosenIndex = getRandomArrayValue(
                neuron.getApplicableRules(this.configurationVector.data[i])
            ) ?? -1

            decisionVector.push(...neuron.getRules().map((_, i) => {
                return i === chosenIndex ? 1 : 0
            }))
        })

        return new Int8Array(decisionVector)
    }

    public startAutoRandomSimulation(neurons: Array<Neuron>) {
        this.nextInterval = setInterval(() => {
            if (this.hasReachedFinalConfiguration(neurons)) {
                clearInterval(this.nextInterval!)
            } else {
                this.next(
                    this.getRandomDecisionVector(neurons)
                )
            }
        }, 1000)
    }

    public startAutoGuidedSimulation(neurons: Array<Neuron>) {
        this.nextInterval = setInterval(() => {
            if (this.hasReachedFinalConfiguration(neurons)) {
                clearInterval(this.nextInterval!)
            } else {
                // Check if decision needed
                for (let i = 0; i < neurons.length; i++){
                    if (neurons[i].getApplicableRules(this.configurationVector[i]).length > 1) {
                        // If so, handle it from presenter
                        this.onDecisionNeed(
                            this.configurationVector.data, 
                            this.delayStatusVector.data
                        )
                        return
                    }
                }
                // Otherwise, only one decision vector can be generated
                this.next(
                    this.getRandomDecisionVector(neurons)
                )
            }
        }, 1000)
    }

    public stopAutoSimulation() {
        if (!this.nextInterval) return

        clearInterval(this.nextInterval)
        this.nextInterval = null
    }

    public isAuto() {
        return this.nextInterval !== null
    }
}