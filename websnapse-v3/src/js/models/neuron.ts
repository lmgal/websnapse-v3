import { Rule } from "./rule.js"

const REG_NEURON = 0
const INPUT_NEURON = 1
const OUTPUT_NEURON = 2

type NeuronType = 0 | 1 | 2

class Neuron {
    private type : NeuronType
    // For regular neurons
    private rules? : Array<Rule>
    private spikes? : number
    // For input neurons
    private spikeTrain? : Uint8Array

    constructor(type: NeuronType){
        this.type = type
        if (type === REG_NEURON)
            this.rules = []
    }

    public getType(){
        return this.type
    }

    public setSpikes(spikes: number){
        this.spikes = spikes
    }

    public getSpikes(){
        if (this.type !== REG_NEURON)
            return 0

        return this.spikes!
    }

    public getRules(){
        if (this.type === INPUT_NEURON)
            return [{
                latex: '',
                language: new RegExp(''),
                consume: 0,
                produce: 1,
                delay: 0
            }]

        if (this.type === OUTPUT_NEURON)
            return []

        return this.rules!
    }

    public setSpikeTrain(spikeTrain: Uint8Array){
        if (this.type !== INPUT_NEURON)
            throw new Error('Can\'t set spike train for non-input neurons')

        this.spikeTrain = spikeTrain
    }

    public getSpikeTrain(){
        if (this.type !== INPUT_NEURON)
            return new Uint8Array([])

        return this.spikeTrain!
    }

    public addRule(rule: Rule){
        if (this.type !== REG_NEURON)
            throw new Error('Can\'t add rules to non-regular neurons')
        this.rules!.push(rule)
    }

    public getApplicableRules(spikes: number){
        if (this.type !== REG_NEURON)
            return []

        const spikeString = 'a'.repeat(spikes)
        return this.rules!.map((rule, i) => rule.language.test(spikeString) === true ? 1 : 0)
    }
}

class NeuronBuilder {
    private neuron : Neuron

    constructor(type: NeuronType) {
        this.neuron = new Neuron(type)
        return this
    }

    public addRule(rule: Rule){
        this.neuron.addRule(rule)
        return this
    }

    public setSpikes(spikes: number){
        this.neuron.setSpikes(spikes)
        return this
    }

    public setSpikeTrain(spikeTrain: Uint8Array){
        this.setSpikeTrain(spikeTrain)
        return this
    }
    
    public build(){
        return this.neuron
    }
}

export { REG_NEURON, INPUT_NEURON, OUTPUT_NEURON, NeuronType, Neuron, NeuronBuilder }