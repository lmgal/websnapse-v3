import { INPUT_NEURON, OUTPUT_NEURON } from "./neuron.js";
export class SNPSystemModel {
    constructor() {
        this.neurons = [];
        this.synapses = [];
    }
    addNeuron(neuron) {
        this.neurons.push(neuron);
        this.synapses.push([]);
    }
    addSynapse(from, to, weight) {
        if (from < 0 || from >= this.neurons.length)
            throw new Error(`Neuron ${from} doesn't exist`);
        if (to < 0 || to >= this.neurons.length)
            throw new Error(`Neuron ${to} doesn't exist`);
        this.synapses[from].push({ to, weight });
    }
    getNeurons() {
        return this.neurons;
    }
    removeNeuron(index) {
        if (index < 0 || index >= this.neurons.length)
            throw new Error(`Neuron ${index} doesn't exist`);
        this.neurons.splice(index, 1);
        this.synapses.splice(index, 1);
        for (const synapses of this.synapses) {
            for (let i = 0; i < synapses.length; i++) {
                if (synapses[i].to === index) {
                    synapses.splice(i, 1);
                    i--;
                }
                else if (synapses[i].to > index) {
                    synapses[i].to--;
                }
            }
        }
    }
    removeSynapse(from, to) {
        if (from < 0 || from >= this.neurons.length)
            throw new Error(`Neuron ${from} doesn't exist`);
        if (to < 0 || to >= this.neurons.length)
            throw new Error(`Neuron ${to} doesn't exist`);
        for (let i = 0; i < this.synapses[from].length; i++) {
            if (this.synapses[from][i].to === to) {
                this.synapses[from].splice(i, 1);
                return;
            }
        }
    }
    getRuleCount() {
        return this.neurons.reduce((ruleCount, neuron) => ruleCount + neuron.getRules().length, 0);
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
    getSpikeTrainVectors() {
        let maxTimeOfSpikeTrains = Math.max.apply(null, this.neurons
            .filter(neuron => neuron.getType() === INPUT_NEURON)
            .map(neuron => neuron.getSpikeTrain().length));
        if (maxTimeOfSpikeTrains <= 0)
            return [];
        return Array(maxTimeOfSpikeTrains).fill(0).map((_, time) => new Int8Array(this.neurons.map(neuron => neuron.getRules().map(_ => neuron.getSpikeTrain()[time]))
            .reduce((spikeTrainVector, spikeTrain) => spikeTrainVector.concat(spikeTrain))));
    }
    /**
     * Get boolean arrays for each neuron, indicating which rules are applicable
     * @param configurationVector
     * @param ruleCountVector
     */
    getApplicableRules(configurationVector, delayStatusVector, delayedSpikingVector) {
        return this.neurons.map((neuron, i) => {
            if (delayStatusVector[i] > 0 || delayedSpikingVector[i] > 0)
                return Array(neuron.getRules().length).fill(0);
            return neuron.getApplicableRules(configurationVector[i]);
        });
    }
    getOutputNeuronIndices() {
        return new Int8Array(this.neurons.map((neuron, i) => neuron.getType() === OUTPUT_NEURON ? i : -1)
            .filter(index => index !== -1));
    }
}
