import { Rule } from "./rule.js"
import { INPUT_NEURON, OUTPUT_NEURON, Neuron } from "./neuron.js"

export class SNPSystemModel {
    private neurons : Array<Neuron> = []
    private synapses : Map<string, Array<{toId: string, weight: number}>> = new Map()
    // Callback functions
    private onAddNeuron: (neuron: Neuron) => void = () => {}
    private onRemoveNeuron: (neuron: Neuron) => void = () => {}
    private onEditNeuron: (id: string, neuron: Neuron) => void = () => {}
    private onAddSynapse: (fromId: string, to: string, weight: number) => void = () => {}
    private onRemoveSynapse: (fromId: string, toId: string) => void = () => {}
    private onEditSynapse: (fromId: string, toId: string, weight: number) => void = () => {}
    private onReset: () => void = () => {}

    public addNeuron(neuron: Neuron){
        this.neurons.push(neuron)
        this.synapses.set(neuron.getId(), [])

        this.onAddNeuron(neuron)
    }

    public addSynapse(fromId: string, toId: string, weight: number){
        if (!this.synapses.has(fromId))
            throw new Error(`Neuron ${fromId} doesn't exist`)
        if (!this.synapses.has(toId))
            throw new Error(`Neuron ${toId} doesn't exist`)

        this.synapses.get(fromId)!.push({toId: toId, weight: weight})

        this.onAddSynapse(fromId, toId, weight)
    }
    
    public getNeurons(){
        return this.neurons
    }

    public removeNeuron(neuronId: string){
        const neuronToDelete = this.getNeuronById(neuronId)
        if (!neuronToDelete)
            throw new Error(`Neuron ${neuronId} doesn't exist`)
    
        this.neurons = this.neurons.filter(neuron => neuron.getId() !== neuronId)
        this.synapses.delete(neuronId)

        for (const synapse of this.synapses.values()){
            for (let i = 0; i < synapse.length; i++){
                if (synapse[i].toId === neuronId){
                    synapse.splice(i, 1)
                    i--
                }
            }
        }

        this.onRemoveNeuron(neuronToDelete)
    }

    public editNeuron(neuronId: string, newNeuron: Neuron){
        const index = this.neurons.findIndex(neuron => neuron.getId() === neuronId)
        if (index === -1)
            throw new Error(`Neuron ${neuronId} doesn't exist`)

        this.neurons[index] = newNeuron

        this.onEditNeuron(neuronId, newNeuron)
    }

    public removeSynapse(fromId: string, toId: string){
        if (!this.synapses.has(fromId))
            throw new Error(`Neuron ${fromId} doesn't exist`)
        if (!this.synapses.has(toId))
            throw new Error(`Neuron ${toId} doesn't exist`)

        const fromSynapses = this.synapses.get(fromId)!
        for (let i = 0; i < fromSynapses.length; i++){
            if (fromSynapses[i].toId === toId){
                fromSynapses.splice(i, 1)
                this.onRemoveSynapse(fromId, toId)
                return
            }
        }

        throw new Error(`Synapse from ${fromId} to ${toId} doesn't exist`)
    }

    public editSynapse(fromId: string, toId: string, weight: number){
        if (!this.synapses.has(fromId))
            throw new Error(`Neuron ${fromId} doesn't exist`)
        if (!this.synapses.has(toId))
            throw new Error(`Neuron ${toId} doesn't exist`)

        const fromSynapses = this.synapses.get(fromId)!
        for (let i = 0; i < fromSynapses.length; i++){
            if (fromSynapses[i].toId === toId){
                fromSynapses[i].weight = weight
                this.onEditSynapse(fromId, toId, weight)
                return
            }
        }

        throw new Error(`Synapse from ${fromId} to ${toId} doesn't exist`)
    }

    public getRuleCount(){
        return this.neurons.reduce((ruleCount, neuron) => ruleCount + neuron.getRules().length, 0)
    }

    public getSynapses(){
        return this.synapses
    }

    /**
     * Generate a transposed spiking transition matrix saved inside the class object.
     * Needed before starting simulation. Transposed so that each dot product
     * is scanned in row-order and hence more cache friendly
     */
    public getTransposedSpikingTransitionMatrix() {
        const totalRules : Array<Rule & {ownerId: string}> = []
        for (const neuron of this.neurons) {
            for (const rule of neuron.getRules()) {
                totalRules.push({...rule, ownerId: neuron.getId()})
            }
        }

        const getSpikingTransitionMatrixCell = (rule: {
            consume: number, produce: number, ownerId: string}, neuronId: string) => {
                if (neuronId === rule.ownerId)
                    return -rule.consume

                for (const outgoingSynapse of this.synapses.get(rule.ownerId) || []){
                    if (outgoingSynapse.toId === neuronId){
                        return rule.produce * outgoingSynapse.weight
                    }
                }

                return 0
            }

        const matrix : Array<number> = []
        for (const neuron of this.neurons){
            for (const rule of totalRules){
                matrix.push(getSpikingTransitionMatrixCell(rule, neuron.getId()))
            }
        }

        return new Int8Array(matrix)
    }

    public getDelayVector(){
        return new Int8Array(
            this.neurons.map(neuron => neuron.getRules().map(rule => rule.delay))
                .reduce((delayVector, neuronDelays) => delayVector.concat(neuronDelays))
        )
    }

    public getRuleCountVector(){
        return new Int8Array(
            this.neurons.map(neuron => neuron.getRules().length)
        )
    }

    public getInitialConfigurationVector(){
        return new Int8Array(this.neurons.map((neuron) => neuron.getSpikes() ?? 0))
    }

    public getInitialDelayStatusVector(){
        return new Int8Array(this.getNeurons().map(_ => 0))
    }

    public getSpikeTrainVectors(){
        let maxTimeOfSpikeTrains = Math.max.apply(null,
            this.neurons
                .filter(neuron => neuron.getType() === INPUT_NEURON)
                .map(neuron => neuron.getSpikeTrain()!.length)
        )

        if (maxTimeOfSpikeTrains <= 0)
            return []

        return Array(maxTimeOfSpikeTrains).fill(0).map((_, time) => 
            new Int8Array(
                this.neurons.map(neuron => neuron.getRules()
                    .map(_ => (neuron.getSpikeTrain() ?? [])[time]))
                    .reduce((spikeTrainVector, spikeTrain) => spikeTrainVector.concat(spikeTrain)
            )
        ))
    }

    public getOutputNeuronIndices(){
        return this.neurons.map((neuron, i) => neuron.getType() === OUTPUT_NEURON ? i : -1)
            .filter(index => index !== -1)
    }
    
    public handleAddNeuron(handler: typeof this.onAddNeuron) {
        this.onAddNeuron = handler
    }

    public handleRemoveNeuron(handler: typeof this.onRemoveNeuron) {
        this.onRemoveNeuron = handler
    }

    public handleEditNeuron(handler: typeof this.onEditNeuron) {
        this.onEditNeuron = handler
    }

    public handleAddSynapse(handler: typeof this.onAddSynapse) {
        this.onAddSynapse = handler
    }

    public handleRemoveSynapse(handler: typeof this.onRemoveSynapse) {
        this.onRemoveSynapse = handler
    }

    public handleEditSynapse(handler: typeof this.onEditSynapse) {
        this.onEditSynapse = handler
    }

    public handleReset(handler: typeof this.onReset) {
        this.onReset = handler 
    }

    public reset(){
        this.neurons = []
        this.synapses.clear()
        this.onReset()
    }

    public getNeuronById(id: string){
        return this.neurons.find(neuron => neuron.getId() === id)
    }
}


