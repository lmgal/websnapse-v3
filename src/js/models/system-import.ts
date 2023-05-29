import { GraphView } from "../views/graph-view"
import { SNPSystemModel } from "./system"
import { REG_NEURON, INPUT_NEURON, OUTPUT_NEURON, NeuronType } from "./neuron"

type System = {
    neurons: Array<Neuron>,
    synapses: Array<Synapse>
}

type Neuron = {
    id: string,
    type: 'regular' | 'input' | 'output',
    position : {
        x: number,
        y: number
    },
    rules?: Array<string>,
    content?: number | string
}

type Synapse = {
    from: string,
    to: string,
    weight: number
}

export class SystemJSON {
    /**
     * Parses a JSON string into system data that can be used to 
     * create a new system on Presenter
     * @param json 
     * @returns 
     */
    public static import(json: string){
        const parsed = JSON.parse(json) as System

        // Make it a bit cleaner for Presenter
        const neurons = parsed.neurons.map(neuron => ({
            id: neuron.id,
            type: (neuron.type === 'regular' ? REG_NEURON 
                : neuron.type === 'input' ? INPUT_NEURON 
                : OUTPUT_NEURON) as NeuronType,
            pos: neuron.position,
            rules: neuron.rules,
            content: neuron.content!
        }))
    
        return {
            neurons: neurons,
            synapses: parsed.synapses
        }
    }

    /**
     * Exports a system into a JSON string that can be imported later
     * @param system 
     * @param graph 
     * @returns JSON string
     */
    public static export(system: SNPSystemModel, graph: GraphView) {
        const neurons = system.getNeurons()

        const neuronsJSON = neurons.map(neuron => {
            const node = graph.getNodeById(neuron.getId())!
            const type = neuron.getType()
            const neuronJSON = {
                id: neuron.getId(),
                type: type === REG_NEURON ? 'regular' : type === INPUT_NEURON ? 'input' : 'output',
                position: {
                    x: node.data.pos.x,
                    y: node.data.pos.y
                }
            } as Neuron

            if (type === REG_NEURON){
                neuronJSON.rules = neuron.getRules().map(rule => rule.latex)
                neuronJSON.content = neuron.getSpikes()
            } 
            
            if (type === INPUT_NEURON)
                neuronJSON.content = neuron.getSpikeTrain().join('')

            return neuronJSON
        })

        const synapsesJSON : Synapse[] = []
        for (const synapse of system.getSynapses().entries()) {
            const [fromId, outgoingSynapses] = synapse
            for (const outgoingSynapse of outgoingSynapses) 
                synapsesJSON.push({
                    from: fromId,
                    to: outgoingSynapse.toId,
                    weight: outgoingSynapse.weight
                })
        }

        return JSON.stringify({
            nodes: neuronsJSON,
            synapses: synapsesJSON
        })
    }
}