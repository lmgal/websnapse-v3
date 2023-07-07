/// <reference types="emscripten" />
import { SNPSystemModel } from "./system"
import SNPModule from '../wasm/sn-p-system'
import getRandomArrayValue from "../util/get-random-array-value"
import { INPUT_NEURON, Neuron, OUTPUT_NEURON } from "./neuron"

type WasmInt16Array = {
    data: Int16Array
    offset: number
}

interface SNPSystemModule extends EmscriptenModule {
    _getNext(
        configurationVectorOffset: number,
        delayStatusVectorOffset: number,
        firingVectorOffset: number,
        neuronUpdateVectorOffset: number,
        synapseUpdateVectorOffset: number,
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
        neuronUpdateVectorOffset: number,
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
    private transposedSpikingTransitionMatrix!: WasmInt16Array
    private initialConfigurationVector!: Int16Array
    private delayVector!: WasmInt16Array
    private ruleCountVector!: WasmInt16Array
    private spikeTrainVectors!: Array<Int16Array>
    // States
    private configurationVector!: WasmInt16Array
    private delayStatusVector!: WasmInt16Array
    private firingVector!: WasmInt16Array
    private delayIndicatorVector!: WasmInt16Array
    private neuronUpdateVector!: WasmInt16Array
    private synapseUpdateVector!: WasmInt16Array
    // Input to get next config
    private decisionVector!: WasmInt16Array
    private spikeTrainVector!: WasmInt16Array
    // History
    private time = 0
    private decisionVectorStack: Array<Int16Array> = []
    private delayIndicatorVectorStack: Array<Int16Array> = []
    private firingVectorStack: Array<Int16Array>
    private outputSpikeTrains: Map<number, Array<number>> = new Map()
    // Binding callback functions
    private onChange: (configurationVector: Int16Array, delayStatusVector: Int16Array,
        firingVector: Int16Array, outputSpikeTrains: Map<number, Array<number>>, 
        decisionVectorStack: Array<Int16Array>, neuronUpdateVector: Int16Array, 
        synapseUpdateVector: Int16Array) => void = () => { }
    private onDecisionNeed: (configurationVector: Int16Array, delayStatusVector: Int16Array) => void = () => {}

    public constructor() {
        SNPModule().then((module: SNPSystemModule) => {
            this.module = module
        })
    }

    public setSystem(system: SNPSystemModel) {
        if (!this.isFirstSetup) {
            this._free()
        }

        const wasmInt16Malloc = (array: Int16Array): WasmInt16Array => {
            const offset = this.module._malloc(array.length * Int16Array.BYTES_PER_ELEMENT)
            this.module.HEAP16.set(array, offset / Int16Array.BYTES_PER_ELEMENT)
            return {
                data: this.module.HEAP16.subarray(
                    offset / Int16Array.BYTES_PER_ELEMENT, 
                    offset / Int16Array.BYTES_PER_ELEMENT + array.length
                ) as Int16Array,
                offset: offset as number
            }
        }

        this.transposedSpikingTransitionMatrix = wasmInt16Malloc(
            system.getTransposedSpikingTransitionMatrix()
        )

        this.initialConfigurationVector = system.getInitialConfigurationVector()
        this.delayVector = wasmInt16Malloc(system.getDelayVector())
        this.ruleCountVector = wasmInt16Malloc(system.getRuleCountVector())

        this.configurationVector = wasmInt16Malloc(this.initialConfigurationVector)
        this.delayStatusVector = wasmInt16Malloc(this.initialConfigurationVector.map(_ => 0))
        this.firingVector = wasmInt16Malloc(this.initialConfigurationVector.map(_ => 0))
        this.delayIndicatorVector = wasmInt16Malloc(this.delayVector.data.map(_ => 0))
        this.neuronUpdateVector = wasmInt16Malloc(this.initialConfigurationVector.map(_ => 0))
        this.synapseUpdateVector = wasmInt16Malloc(this.initialConfigurationVector.map(_ => 0))

        this.decisionVector = wasmInt16Malloc(new Int16Array(system.getRuleCount()))
        this.spikeTrainVector = wasmInt16Malloc(new Int16Array(system.getRuleCount()))
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
    public next(decisionVector: Int16Array) {
        // Computation time
        console.time('compute')

        this.decisionVectorStack.push(decisionVector)
        this.delayIndicatorVectorStack.push(this.delayIndicatorVector.data.slice())

        this.decisionVector.data.set(decisionVector)
        this.spikeTrainVector.data.set(this.spikeTrainVectors[this.time++] ?? this.spikeTrainVector.data.fill(0))

        this.module._getNext(
            this.configurationVector.offset,
            this.delayStatusVector.offset,
            this.firingVector.offset,
            this.neuronUpdateVector.offset,
            this.synapseUpdateVector.offset,
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
            this.firingVector.data, this.outputSpikeTrains, this.decisionVectorStack,
            this.neuronUpdateVector.data, this.synapseUpdateVector.data)
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
        // Update synapse update vector
        this.synapseUpdateVector.data.set(this.firingVector.data.map((value, index) => 
            value !== this.firingVectorStack[this.firingVectorStack.length - 1][index] ? 1 : 0
        ))
        this.firingVector.data.set(this.firingVectorStack[this.firingVectorStack.length - 1])

        this.module._getPrev(
            this.configurationVector.offset,
            this.delayStatusVector.offset,
            this.neuronUpdateVector.offset,
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
            this.firingVector.data, this.outputSpikeTrains, this.decisionVectorStack,
            this.neuronUpdateVector.data, this.synapseUpdateVector.data)
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

    public async reset() {
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

        // Set update vectors to all 1s
        this.neuronUpdateVector.data.fill(1)
        this.synapseUpdateVector.data.fill(1)

        this.onChange(this.configurationVector.data, this.delayStatusVector.data,
            this.firingVector.data, this.outputSpikeTrains, this.decisionVectorStack,
            this.neuronUpdateVector.data, this.synapseUpdateVector.data)
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

        return new Int16Array(decisionVector)
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