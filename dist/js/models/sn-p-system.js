"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SNPSystemModel = void 0;
class Neuron {
    constructor(spikes) {
        this.rules = [];
        this.spikes = spikes;
    }
    setSpikes(spikes) {
        this.spikes = spikes;
    }
    getSpikes() {
        return this.spikes;
    }
    getRules() {
        return this.rules;
    }
    /**
     * @param rule Assume valid format
     * */
    addRule(rule) {
        this.rules.push(rule);
    }
    getAcceptedRules(spikes) {
        const spikeString = 'a'.repeat(spikes);
        const acceptedRules = this.rules.map((rule, i) => rule.language.exec(spikeString) ? i : -1)
            .filter(e => e > 0);
        return acceptedRules;
    }
}
class SNPSystemModel {
    constructor() {
        this.neurons = [];
        this.synapses = [];
    }
    getNeurons() {
        return this.neurons;
    }
    /**
     * @param rules Assume rules are valid
     * @param spikes Initial number of spikes
     * @param index Index where to insert neuron in array. Defaults to last
     */
    addNeuron(rules, spikes) {
        const neuron = new Neuron(spikes);
        for (const rule of rules) {
            neuron.addRule(rule);
        }
        this.neurons.push(neuron);
    }
    removeNeuron(index) {
        if (0 < index && index < this.neurons.length)
            throw new Error(`Neuron ${index} doesn't exist`);
        this.neurons.splice(index, 1);
    }
    /**
     *
     * @param index Index to replace a neuron
     * @param rules Assume rules are valid
     * @param spikes Initial number of spikes
     */
    replaceNeuron(index, rules, spikes) {
        if (0 < index && index < this.neurons.length)
            throw new Error(`Neuron ${index} doesn't exist`);
        const neuron = new Neuron(spikes);
        for (const rule of rules) {
            neuron.addRule(rule);
        }
        this.neurons.splice(index, 1, neuron);
    }
    /**
     * Generate a transposed spiking transition matrix saved inside the class object.
     * Needed before starting simulation. Transposed so that each dot product
     * is scanned in row-order and hence more cache friendly
     */
    getTransposedSpikingTransitionMatrix() {
        const totalRules = [];
        for (let i = 0; i < this.neurons.length; i++) {
            for (const rule of this.neurons[i].getRules()) {
                totalRules.push(Object.assign(Object.assign({}, rule), { ownerIndex: i }));
            }
        }
        const getSpikingTransitionMatrixCell = (rule, neuronIndex) => {
            if (neuronIndex === rule.ownerIndex)
                return -rule.consume;
            for (const outgoingSynapse of this.synapses[rule.ownerIndex]) {
                if (outgoingSynapse.to === neuronIndex) {
                    return rule.produce * outgoingSynapse.weight;
                }
            }
            return 0;
        };
        const matrix = [];
        for (let j = 0; j < this.neurons.length; j++) {
            for (const rule of totalRules) {
                matrix.push(getSpikingTransitionMatrixCell(rule, j));
            }
        }
        return new Int8Array(matrix);
    }
    getDelayVector() {
        return new Int8Array(this.neurons.map(neuron => neuron.getRules().map(rule => rule.delay))
            .reduce((delayVector, neuronDelays) => delayVector.concat(neuronDelays)));
    }
    getRuleCountVector() {
        return new Int8Array(this.neurons.map(neuron => neuron.getRules().length));
    }
    getInitialConfigurationVector() {
        return new Int8Array(this.neurons.map((neuron) => neuron.getSpikes()));
    }
    getInitialDelayStatusVector() {
        return new Int8Array(this.getNeurons().map(_ => 0));
    }
}
exports.SNPSystemModel = SNPSystemModel;
