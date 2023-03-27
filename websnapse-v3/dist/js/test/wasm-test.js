import { SNPSystemModel } from "../models/sn-p-system.js";
import { parseRule } from "../models/rule.js";
import { NeuronBuilder, REG_NEURON, OUTPUT_NEURON } from "../models/neuron.js";
import { SimulatorModel } from "../models/simulator.js";
const model = new SNPSystemModel;
// Create neurons
const neuron0 = new NeuronBuilder(REG_NEURON)
    .addRule(parseRule('a^2/a\\to a;0'))
    .addRule(parseRule('a\\to\\lambda'))
    .setSpikes(2)
    .build();
const neuron1 = new NeuronBuilder(REG_NEURON)
    .addRule(parseRule('a^3\\to a;0'))
    .addRule(parseRule('a\\to a;1'))
    .addRule(parseRule('a^2\\to\\lambda'))
    .setSpikes(3)
    .build();
const neuron2 = new NeuronBuilder(REG_NEURON)
    .addRule(parseRule('a\\to a;0'))
    .addRule(parseRule('a\\to a;1'))
    .setSpikes(1)
    .build();
const output = new NeuronBuilder(OUTPUT_NEURON).build();
model.addNeuron(neuron0);
model.addNeuron(neuron1);
model.addNeuron(neuron2);
model.addNeuron(output);
model.addSynapse(0, 1, 1);
model.addSynapse(0, 2, 1);
model.addSynapse(2, 0, 1);
model.addSynapse(2, 1, 1);
model.addSynapse(1, 3, 1);
// Assert correct vectors and matrices are generated
const correctTransposedTransitionMatrix = [
    -1, -1, 0, 0, 0, 1, 1,
    1, 0, -3, -1, -2, 1, 1,
    1, 0, 0, 0, 0, -1, -1,
    0, 0, 1, 1, 0, 0, 0
];
console.assert(model.getTransposedSpikingTransitionMatrix().every((cell, i) => cell === correctTransposedTransitionMatrix[i], 'Incorrect transposed spiking transition matrix'));
const correctConfigurationVector = [2, 3, 1, 0];
console.assert(model.getInitialConfigurationVector().every((cell, i) => cell === correctConfigurationVector[i], 'Incorrect initial configuration vector'));
const correctDelayVector = [0, 0, 0, 1, 0, 0, 1];
console.assert(model.getDelayVector().every((cell, i) => cell === correctDelayVector[i], 'Incorrect delay vector'));
const simulator = new SimulatorModel(model);
// @ts-ignore
window.simulator = simulator;
// @ts-ignore
window.model = model;
