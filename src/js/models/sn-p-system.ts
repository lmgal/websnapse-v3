import { Rule } from "./rule"

class Neuron {
    private rules : Array<Rule> = []
    /** Initial number of spikes */
    private spikes : number

    constructor(spikes: number){
        this.spikes = spikes
    }

    public setSpikes(spikes: number){
        this.spikes = spikes
    }

    public getSpikes(){
        return this.spikes
    }

    public getRules(){
        return this.rules
    }

    /** 
     * @param rule Assume valid format
     * */ 
    public addRule(rule: Rule){
        this.rules.push(rule)
    }

    public getAcceptedRules(spikes: number){
        const spikeString = 'a'.repeat(spikes)
        const acceptedRules = this.rules.map((rule, i) => rule.language.exec(spikeString) ? i : -1)
            .filter(e => e > 0)
        return acceptedRules
    }
}

class InputNeuron {
    private spikeTrain = new Uint8Array()

    public setSpikeTrain(newSpikeTrain: Array<number>){
        this.spikeTrain = new Uint8Array(newSpikeTrain)
    }

    public getSpikeTrain(){
        return this.spikeTrain
    }
}

class OutputNeuron {
    
}

export class SNPSystemModel {
    private neurons : Array<Neuron> = []
    private synapses : Array<Array<{to: number, weight: number}>> = []
    
    public getNeurons(){
        return this.neurons
    }

    public removeNeuron(index: number){
        if (0 < index && index < this.neurons.length)
            throw new Error(`Neuron ${index} doesn't exist`)
        this.neurons.splice(index, 1)
    }

    /**
     * 
     * @param index Index to replace a neuron
     * @param rules Assume rules are valid
     * @param spikes Initial number of spikes
     */
    public replaceNeuron(index: number, rules: Array<Rule>, spikes: number){
        if (0 < index && index < this.neurons.length)
            throw new Error(`Neuron ${index} doesn't exist`)

        const neuron = new Neuron(spikes)
        for (const rule of rules){
            neuron.addRule(rule)
        }

        this.neurons.splice(index, 1, neuron)
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
}


