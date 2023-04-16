const REG_NEURON = 0;
const INPUT_NEURON = 1;
const OUTPUT_NEURON = 2;
class Neuron {
    constructor(type) {
        this.type = type;
        if (type === REG_NEURON)
            this.rules = [];
    }
    getType() {
        return this.type;
    }
    setSpikes(spikes) {
        this.spikes = spikes;
    }
    getSpikes() {
        if (this.type !== REG_NEURON)
            return 0;
        return this.spikes;
    }
    getRules() {
        if (this.type === INPUT_NEURON)
            return [{
                    latex: '',
                    language: new RegExp(''),
                    consume: 0,
                    produce: 1,
                    delay: 0
                }];
        if (this.type === OUTPUT_NEURON)
            return [];
        return this.rules;
    }
    setSpikeTrain(spikeTrain) {
        if (this.type !== INPUT_NEURON)
            throw new Error('Can\'t set spike train for non-input neurons');
        this.spikeTrain = spikeTrain;
    }
    getSpikeTrain() {
        if (this.type !== INPUT_NEURON)
            return new Uint8Array([]);
        return this.spikeTrain;
    }
    addRule(rule) {
        if (this.type !== REG_NEURON)
            throw new Error('Can\'t add rules to non-regular neurons');
        this.rules.push(rule);
    }
    getApplicableRules(spikes) {
        if (this.type !== REG_NEURON)
            return [];
        const spikeString = 'a'.repeat(spikes);
        return this.rules.map((rule, i) => rule.language.test(spikeString) === true ? 1 : 0);
    }
}
class NeuronBuilder {
    constructor(type) {
        this.neuron = new Neuron(type);
        return this;
    }
    addRule(rule) {
        this.neuron.addRule(rule);
        return this;
    }
    setSpikes(spikes) {
        this.neuron.setSpikes(spikes);
        return this;
    }
    setSpikeTrain(spikeTrain) {
        this.setSpikeTrain(spikeTrain);
        return this;
    }
    build() {
        return this.neuron;
    }
}
export { REG_NEURON, INPUT_NEURON, OUTPUT_NEURON, Neuron, NeuronBuilder };
