import { SNPSystemModel } from "./models/sn-p-system"
import { SimulatorModel } from "./models/simulator"
import { SvgGraphView, WebGLGraphView } from "./views/graph-view"
import { Neuron, REG_NEURON, INPUT_NEURON, OUTPUT_NEURON } from "./models/neuron"

export class Presenter {
    constructor(
        system: SNPSystemModel,
        simulator: SimulatorModel,
        graphView: SvgGraphView) {

        // Bind system and graph view
        system.on('addNeuron', (neuron: Neuron) => {
            graphView.addNode({
                spikes: neuron.getSpikes(),
                rules: neuron.getRules().map(rule => rule.latex).join('\\'),
                delay: neuron.getType() === REG_NEURON ? 0 : undefined,
                spikeTrain: neuron.getSpikeTrain()
            })
        })
        system.on('removeNeuron', (index: number) => {
            graphView.removeNode(index)
        })
        system.on('editNeuron', (index: number, neuron: Neuron) => {
            graphView.editNode(index, {
                spikes: neuron.getSpikes(),
                rules: neuron.getRules().map(rule => rule.latex).join('\\'),
                delay: neuron.getType() === REG_NEURON ? 0 : undefined,
                spikeTrain: neuron.getSpikeTrain()
            })
        })
        system.on('addSynapse', (from: number, to: number) => {
            graphView.addEdge(from, to)
        })
        system.on('removeSynapse', (from: number, to: number) => {
            graphView.removeEdge(from, to)
        })
        
        // Bind simulator and graph view
    }
}