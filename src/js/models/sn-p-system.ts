import { Rule } from "./rule.js"
import { INPUT_NEURON, OUTPUT_NEURON, Neuron } from "./neuron.js"

export class SNPSystemModel {
    private neurons : Array<Neuron> = []
    private synapses : Array<Array<{to: number, weight: number}>> = []
    // Callback functions
    private onAddNeuron: (neuron: Neuron) => void = () => {}
    private onRemoveNeuron: (index: number) => void = () => {}
    private onEditNeuron: (index: number, neuron: Neuron) => void = () => {}
    private onAddSynapse: (from: number, to: number, weight: number) => void = () => {}
    private onRemoveSynapse: (from: number, to: number) => void = () => {}

    public addNeuron(neuron: Neuron){
        this.neurons.push(neuron)
        this.synapses.push([])

        this.onAddNeuron(neuron)
    }

    public addSynapse(from: number, to: number, weight: number){
        if (from < 0 || from >= this.neurons.length)
            throw new Error(`Neuron ${from} doesn't exist`)
        if (to < 0 || to >= this.neurons.length)
            throw new Error(`Neuron ${to} doesn't exist`)

        this.synapses[from].push({to, weight})

        this.onAddSynapse(from, to, weight)
    }
    
    public getNeurons(){
        return this.neurons
    }

    public removeNeuron(index: number){
        if (index < 0 || index >= this.neurons.length)
            throw new Error(`Neuron ${index} doesn't exist`)

        this.neurons.splice(index, 1)
        this.synapses.splice(index, 1)
        for (const synapses of this.synapses){
            for (let i = 0; i < synapses.length; i++){
                if (synapses[i].to === index){
                    synapses.splice(i, 1)
                    i--
                } else if (synapses[i].to > index){
                    synapses[i].to--
                }
            }
        }

        this.onRemoveNeuron(index)
    }

    public editNeuron(index: number, neuron: Neuron){
        if (index < 0 || index >= this.neurons.length)
            throw new Error(`Neuron ${index} doesn't exist`)

        this.neurons[index] = neuron

        this.onEditNeuron(index, neuron)
    }

    public removeSynapse(from: number, to: number){
        if (from < 0 || from >= this.neurons.length)
            throw new Error(`Neuron ${from} doesn't exist`)
        if (to < 0 || to >= this.neurons.length)
            throw new Error(`Neuron ${to} doesn't exist`)

        for (let i = 0; i < this.synapses[from].length; i++){
            if (this.synapses[from][i].to === to){
                this.synapses[from].splice(i, 1)

                this.onRemoveSynapse(from, to)
                return
            }
        }

        throw new Error(`Synapse from ${from} to ${to} doesn't exist`)
    }

    public getRuleCount(){
        return this.neurons.reduce((ruleCount, neuron) => ruleCount + neuron.getRules().length, 0)
    }

    /**
     * Generate a transposed spiking transition matrix saved inside the class object.
     * Needed before starting simulation. Transposed so that each dot product
     * is scanned in row-order and hence more cache friendly
     */
    public getTransposedSpikingTransitionMatrix() {
        const totalRules : Array<Rule & {ownerIndex: number}> = []
        for (let i = 0; i < this.neurons.length; i++){
            for (const rule of this.neurons[i].getRules()){
                totalRules.push({...rule, ownerIndex: i})
            }
        }

        const getSpikingTransitionMatrixCell = (rule: {
            consume: number, produce: number, ownerIndex: number}, neuronIndex: number) => {
                if (neuronIndex === rule.ownerIndex)
                    return -rule.consume

                for (const outgoingSynapse of this.synapses[rule.ownerIndex]){
                    if (outgoingSynapse.to === neuronIndex){
                        return rule.produce * outgoingSynapse.weight
                    }
                }

                return 0
            }

        const matrix : Array<number> = []
        for (let j = 0; j < this.neurons.length; j++){
            for (const rule of totalRules){
                matrix.push(getSpikingTransitionMatrixCell(rule, j))
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
        return new Int8Array(this.neurons.map((neuron) => neuron.getSpikes()))
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

    /**
     * Get boolean arrays for each neuron, indicating which rules are applicable
     * @param configurationVector 
     * @param ruleCountVector 
     */
    public getApplicableRules(
        configurationVector: Int8Array, 
        delayStatusVector: Int8Array, 
        delayedSpikingVector: Int8Array,
    ){
        return this.neurons.map((neuron, i) => {
            if (delayStatusVector[i] > 0 || delayedSpikingVector[i] > 0)
                return Array(neuron.getRules().length).fill(0)
            return neuron.getApplicableRules(configurationVector[i])
        })
    }

    public getOutputNeuronIndices(){
        return new Int8Array(this.neurons.map((neuron, i) => neuron.getType() === OUTPUT_NEURON ? i : -1)
            .filter(index => index !== -1))
    }

    
    public on(event: 'addNeuron' | 'removeNeuron' | 'editNeuron' | 'addSynapse' | 'removeSynapse', 
    // @ts-ignore For some reason, name 'this' is sometimes not recognized
        callback: typeof this.onAddNeuron | typeof this.removeNeuron | typeof this.editNeuron |
        typeof this.addSynapse | typeof this.removeSynapse): void {

        switch (event){
            case 'addNeuron':
                this.onAddNeuron = callback as typeof this.onAddNeuron
            case 'removeNeuron':
                this.onRemoveNeuron = callback as typeof this.onRemoveNeuron
            case 'editNeuron':
                this.onEditNeuron = callback as typeof this.onEditNeuron
                break
            case 'addSynapse':
                this.onAddSynapse = callback as typeof this.onAddSynapse
                break
            case 'removeSynapse':
                this.onRemoveSynapse = callback as typeof this.onRemoveSynapse
                break
        }
    }
}


