import Sigma from "sigma"
import Graph from "graphology"
import ForceSupervisor from "graphology-layout-force/worker"

import { GraphView } from "../graph-view"
import { NodeData, LinkData } from "../graph-view"
import { NodeProgramRoundedRect } from './shaders/node.rounded-rect'

export default class SigmaGraphView implements GraphView {
    public static minNeuronWidth = 50
    public static minNeuronHeight = 60

    private graph = new Graph()
    private renderer: Sigma
    private container = document.getElementById("graph-container")!
    private nodeKatexContainers = new Map<string, HTMLElement>()

    // State for dragging nodes
    private draggedNode: string | null = null
    private isDragging = false

    public constructor() {
        this.renderer = new Sigma(this.graph, this.container, {
            nodeProgramClasses: {
                roundedRect: NodeProgramRoundedRect
            },
            renderEdgeLabels: false
        })

        // To facilitate dragging of nodes
        this.renderer.on('downNode', e => {
            this.isDragging = true
            this.draggedNode = e.node
        })

        this.renderer.getMouseCaptor().on('mousemovebody', e => {
            if (!this.isDragging || !this.draggedNode) return

            // Get new position
            const pos = this.renderer.viewportToGraph(e)

            this.graph.setNodeAttribute(this.draggedNode, "x", pos.x)
            this.graph.setNodeAttribute(this.draggedNode, "y", pos.y)

            // Prevent camera move
            e.preventSigmaDefault()
            e.original.preventDefault()
            e.original.stopPropagation()
        })

        // On mouse up, reset the autoscale and dragging states
        this.renderer.getMouseCaptor().on('mouseup', e => {
            this.isDragging = false
            this.draggedNode = null
        })

        // Disable the autoscale at the first down interaction
        this.renderer.getMouseCaptor().on("mousedown", () => {
            if (!this.renderer.getCustomBBox()) this.renderer.setCustomBBox(
                this.renderer.getBBox()
            )
        })
    }

    public addNode(id: string, data: {
        spikes?: number,
        rules?: string,
        delay?: number,
        spikeTrain?: string,
        pos: { x: number, y: number }
    }) {
        this.graph.addNode(id, {
            ...data.pos,
            type: 'roundedRect',
            size: SigmaGraphView.minNeuronHeight,
            width: SigmaGraphView.minNeuronWidth,
            height: SigmaGraphView.minNeuronHeight
        })
    }

    public editNode(id: string, data: {
        spikes?: number,
        rules?: string,
        delay?: number;
        spikeTrain?: string
    }) {
        if (data.spikes) {
            this.graph.setNodeAttribute(id, "spikes", data.spikes)
        }
        if (data.rules) {
            this.graph.setNodeAttribute(id, "rules", data.rules)
        }
        if (data.delay) {
            this.graph.setNodeAttribute(id, "delay", data.delay)
        }
        if (data.spikeTrain) {
            this.graph.setNodeAttribute(id, "spikeTrain", data.spikeTrain)
        }
    }

    public removeNode(id: string) {
        this.graph.dropNode(id)
    }

    public addEdge(fromId: string, toId: string, weight: number) {
        this.graph.addEdge(fromId, toId, {
            type: "arrow",
            size: weight,
            spiking: false
        })
    }

    public editEdge(fromId: string, toId: string,
        data: { weight?: number, spiking?: boolean }) {
        if (data.weight) {
            this.graph.setEdgeAttribute(fromId, toId, "size", data.weight)
        }
        if (data.spiking) {
            this.graph.setEdgeAttribute(fromId, toId, "spiking", data.spiking)
        }
    }

    public removeEdge(fromId: string, toId: string) {
        this.graph.dropEdge(fromId, toId)
    }

    public reset() {
        this.graph.clear()
    }

    public handleNodeClick(callback: (nodeId: string, x: number, y: number) => void) {
        this.renderer.addListener('clickNode', (event) => {
            const graphCoord = this.renderer.viewportToFramedGraph(event.event)
            callback(event.node, graphCoord.x, graphCoord.y)
        })
    }

    public handleNodeRightClick(callback: (nodeId: string, x: number, y: number) => void) {
        this.renderer.addListener('rightClickNode', (event) => {
            const graphCoord = this.renderer.viewportToGraph(event.event)
            callback(event.node, graphCoord.x, graphCoord.y)
        })
    }

    public handleEdgeRightClick(callback: (fromId: string, toId: string, x: number, y: number) => void) {
        this.renderer.addListener('rightClickEdge', (event) => {
            const source = this.graph.source(event.edge)
            const target = this.graph.target(event.edge)
            const graphCoord = this.renderer.viewportToGraph(event.event)
            callback(source, target, graphCoord.x, graphCoord.y)
        })
    }

    public handleGraphClick: (callback: (x: number, y: number) => void) => void = (callback) => {
        this.renderer.addListener('clickStage', (event) => {
            const graphCoord = this.renderer.viewportToGraph(event.event)
            callback(graphCoord.x, graphCoord.y)
        })
    }

    public setGraphCursor: (cursor: string) => void = (cursor) => {
        this.container.style.cursor = cursor
    }

    public beginUpdate: () => void = () => {
        // Do nothing
    }

    public endUpdate: () => void = () => {
        // Do nothing
    }

    public getNodeById: (id: string) => {
        id: string; data: NodeData;
        links: { id?: string; fromId: string; toId: string; data?: LinkData }[] | null
    } | undefined = (id) => {
        const node = this.graph.getNodeAttributes(id)
        if (!node) {
            return undefined
        }

        const links = this.graph.edges().filter((edge) => {
            return this.graph.source(edge) === id || this.graph.target(edge) === id
        }).map((edge) => {
            return {
                fromId: this.graph.source(edge),
                toId: this.graph.target(edge),
                data: this.graph.getEdgeAttributes(edge) as LinkData
            }
        })

        return {
            id,
            data: {
                ...node,
                pos: {
                    x: node.x,
                    y: node.y
                }
            } as NodeData,
            links
        }
    }
}
