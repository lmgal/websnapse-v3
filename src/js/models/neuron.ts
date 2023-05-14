import { Rule } from "./rule.js"

const REG_NEURON = 0
const INPUT_NEURON = 1
const OUTPUT_NEURON = 2

type NeuronType = 0 | 1 | 2

class Neuron {
    private id : string
    private type : NeuronType
    // For regular neurons
    private rules? : Array<Rule>
    private spikes? : number
    // For input neurons
    private spikeTrain? : Array<number>

    constructor(type: NeuronType){
        this.type = type
        if (type === REG_NEURON)
            this.rules = []
    }

    public setId(id: string){
        this.id = id
    }

    public getId(){
        return this.id
    }

    public getType(){
        return this.type
    }

    public setSpikes(spikes: number){
        this.spikes = spikes
    }

    public getSpikes(){
        if (this.type !== REG_NEURON)
            return undefined

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

    public setSpikeTrain(spikeTrain: Array<number>){
        if (this.type !== INPUT_NEURON)
            throw new Error('Can\'t set spike train for non-input neurons')

        this.spikeTrain = spikeTrain
    }

    public getSpikeTrain(){
        return this.spikeTrain ?? []
    }

    public addRule(rule: Rule){
        if (this.type !== REG_NEURON)
            throw new Error('Can\'t add rules to non-regular neurons')
        this.rules!.push(rule)
    }

    /**
     * Get indices of rules that are applicable given the number of spikes
     * @param spikes 
     * @returns 
     */
    public getApplicableRules(spikes: number){
        if (this.type !== REG_NEURON)
            return []

        const spikeString = 'a'.repeat(spikes)
        return this.rules!.map((rule, i) => {
            if (spikeString.length < rule.consume)
                return -1
            return rule.language.test(spikeString) ? i : -1
        })
            .filter(i => i !== -1)
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

    public setId(id: string){
        this.neuron.setId(id)
        return this
    }

    public setRules(rules: Array<Rule>){
        for (const rule of rules)
            this.neuron.addRule(rule)
        return this
    }

    public setSpikes(spikes: number){
        this.neuron.setSpikes(spikes)
        return this
    }

    public setSpikeTrain(spikeTrain: Array<number>){
        this.neuron.setSpikeTrain(spikeTrain)
        return this
    }
    
    public build(){
        return this.neuron
    }
}

export { REG_NEURON, INPUT_NEURON, OUTPUT_NEURON, NeuronType, Neuron, NeuronBuilder }