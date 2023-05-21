/// <reference path="../definitions/vivagraph.d.ts" />
import * as Viva from 'vivagraphjs'
import katex from 'katex'
import generateRandomId from '../util/generate-random-id'

type NodeData = {
    spikes?: number,
    rules?: string,
    delay?: number,
    spikeTrain: string,
    pos : { x: number, y: number }
}

type LinkData = {
    weight: number,
    spiking: boolean
}

export class SvgGraphView {
    // Constants
    public static minNeuronWidth = 100
    public static minNeuronHeight = 120
    public static neuronRadius = 15
    public static idealLength = 500

    private graphContainer = document.getElementById('graph-container')!

    // VivagraphJS objects
    private graph = Viva.Graph.graph()
    private graphics = Viva.Graph.View.svgGraphics()
    private renderer : Viva.Renderer
    // @ts-ignore

    // Event handlers
    private onNodeClick : (nodeId: string, x: number, y: number) => void = () => { }
    private onNodeRightClick: (nodeId: string, x: number, y: number) => void = () => { }
    private onEdgeRightClick: (fromId: string, toId: string, x: number, y: number) => void = () => { }

    public constructor() {
        this.graphics.node(((node: Viva.Node<NodeData>) => {
            const ui = Viva.Graph.svg('g')

            // Function that create KaTeX span with width and height
            const createKaTeXSpan = (tex: string) => {
                const template = document.createElement('template')
                template.innerHTML = katex.renderToString(tex, {
                    displayMode: true,
                    output: 'html'
                })
                const span = template.content.firstChild!

                const hiddenDiv = document.getElementById('hidden-div')!
                katex.render(tex, hiddenDiv)
                const height = hiddenDiv.offsetHeight + 15
                const width = hiddenDiv.offsetWidth + 15

                return { span, height, width }
            }

            // Function that gets KaTeX span and returns SVG foreignObject
            const createForeignObject = (
                span: ChildNode,
                width: number, height: number,
                x: number, y: number) => {
                const foreignObject = Viva.Graph.svg('foreignObject')
                foreignObject.setAttribute('width', width.toString())
                foreignObject.setAttribute('height', height.toString())
                foreignObject.setAttribute('x', x.toString())
                foreignObject.setAttribute('y', y.toString())
                foreignObject.append(span)
                return foreignObject
            }

            let neuronWidth = SvgGraphView.minNeuronWidth
            let neuronHeight = SvgGraphView.minNeuronHeight

            // Rules
            let rules : HTMLElement & SVGElement | null = null
            if (node.data.rules !== undefined) {
                const { span: ruleSpan, height: ruleHeight, width: ruleWidth } = createKaTeXSpan(node.data!.rules)

                // Adjust neuron height and width accordingly
                if (ruleWidth > SvgGraphView.minNeuronWidth)
                    neuronWidth = ruleWidth + 10
                if (ruleHeight > SvgGraphView.minNeuronHeight)
                    neuronHeight = ruleHeight + 10

                rules = createForeignObject(
                    ruleSpan, ruleWidth, ruleHeight,
                    (neuronWidth - ruleWidth) / 2, (neuronHeight - ruleHeight) / 2)
            }

            // Spike train
            let spikeTrain : HTMLElement & SVGElement | null = null
            if (node.data.spikeTrain?.length > 0) {

                const { span: spikeTrainSpan, height: spikeTrainHeight,
                    width: spikeTrainWidth } = createKaTeXSpan(node.data.spikeTrain)

                // Adjust neuron height and width accordingly
                if (spikeTrainWidth > SvgGraphView.minNeuronWidth)
                    neuronWidth = spikeTrainWidth + 10
                if (spikeTrainHeight > SvgGraphView.minNeuronHeight)
                    neuronHeight = spikeTrainHeight + 10

                spikeTrain = createForeignObject(
                    spikeTrainSpan, spikeTrainWidth, spikeTrainHeight,
                    (neuronWidth - spikeTrainWidth) / 2, (neuronHeight - spikeTrainHeight) / 2)
            }

            // Container
            let container = Viva.Graph.svg('rect')
            container.setAttribute('width', neuronWidth.toString())
            container.setAttribute('height', neuronHeight.toString())
            container.setAttribute('rx', SvgGraphView.neuronRadius.toString())
            // If neuron is closed, make it gray
            if (node.data.delay && node.data.delay > 0)
                container.setAttribute('style', 'fill: rgb(128, 128, 128); stroke: rgb(0, 0, 0)')
            else
                container.setAttribute('style', 'fill: rgb(255, 255, 255); stroke: rgb(0, 0, 0)')

            ui.append(container)

            // Append rules or spike train
            if (rules !== null)
                ui.append(rules)
            if (spikeTrain !== null)
                ui.append(spikeTrain)

            // ID
            const { span: idSpan, height: idHeight, width: idWidth } = createKaTeXSpan(node.id)
            const id = createForeignObject(
                idSpan, idWidth, idHeight, -30, -40
            )
            ui.append(id)

            // Spikes
            if (node.data.spikes !== undefined) {
                let spikeString = node.data.spikes > 0 ? 'a' : '0'
                if (node.data.spikes > 1)
                    spikeString += `^{${node.data.spikes}}`
                const { span: spikesSpan, height: spikesHeight, width: spikesWidth } = createKaTeXSpan(
                    spikeString
                )
                const spikes = createForeignObject(
                    spikesSpan, spikesWidth, spikesHeight,
                    (neuronWidth - spikesWidth) / 2, -15)

                ui.append(spikes)
            }

            // Delay
            if (node.data.delay !== undefined) {
                const { span: delaySpan, height: delayHeight, width: delayWidth } = createKaTeXSpan(`${node.data!.delay}`)
                const delay = createForeignObject(
                    delaySpan, delayWidth, delayHeight,
                    (neuronWidth - delayWidth) / 2, neuronHeight - 15)

                ui.append(delay)
            }

            // Add event handler for neuron click
            ui.addEventListener('click', (e: MouseEvent) => {
                this.onNodeClick(node.id, e.clientX, e.clientY)
            })
            
            // Add event handler for neuron context menu
            ui.addEventListener('contextmenu', (e: MouseEvent) => {
                e.preventDefault()
                this.onNodeRightClick(node.id, e.clientX, e.clientY)
            })

            return ui
        }).bind(this))

        this.graphics.placeNode((nodeUI, pos) => {
            nodeUI.setAttribute('transform', 'translate(' + (pos.x - 12) + ',' + (pos.y - 12) + ')')
        })

        // Set the graph layout to be constant unless the user moves the graph
        const layout = Viva.Graph.Layout.constant(this.graph)
        layout.placeNode(function (node: Viva.Node<NodeData>) {
            return node.data!.pos
        })

        // Customize link (directed and dashed if spiking)
        const geom = Viva.Graph.geom()
        const marker = Viva.Graph.svg('marker')
        marker.setAttribute('id', 'Triangle')
        marker.setAttribute('viewBox', "0 0 10 10")
        marker.setAttribute('refX', "10")
        marker.setAttribute('refY', "5")
        marker.setAttribute('markerUnits', "strokeWidth")
        marker.setAttribute('markerWidth', "50")
        marker.setAttribute('markerHeight', "10")
        marker.setAttribute('orient', "auto")

        const path = Viva.Graph.svg('path')
        path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z')
        marker.append(path);
        // Marker should be defined only once in <defs> child element of root <svg> element:
        const defs = this.graphics.getSvgRoot().append('defs');
        // @ts-ignore
        defs.append(marker);
        this.graphics.link(((link: Viva.Link<LinkData>) => {
            const ui = Viva.Graph.svg('g')
            // If spiking, dashed line
            const path = Viva.Graph.svg('path')
            path.setAttribute('stroke', 'gray')
            path.setAttribute('marker-end', 'url(#Triangle)')
            // Set from and to ids 
            path.setAttribute('from', link.fromId)
            path.setAttribute('to', link.toId)

            if (link.data!.spiking)
                path.setAttribute('stroke-dasharray', '5, 5')

            // Add event handler for synapse context menu
            // Bounding rectangle since path alone is unclickable
            const boundingRect = Viva.Graph.svg('rect')
            boundingRect.setAttribute('opacity', '0')
            boundingRect.addEventListener('contextmenu', (e: MouseEvent) => {
                e.preventDefault()
                this.onEdgeRightClick(link.fromId, link.toId, e.clientX, e.clientY)
            })

            // Weight label
            const text = Viva.Graph.svg('text')
            text.setAttribute('text-anchor', 'middle')
            text.setAttribute('dominant-baseline', 'middle')
            text.setAttribute('font-size', '17.5px')
            text.setAttribute('fill', 'black')
            text.textContent = link.data!.weight.toString()
            text.addEventListener('contextmenu', (e: MouseEvent) => {
                e.preventDefault()
                this.onEdgeRightClick(link.fromId, link.toId, e.clientX, e.clientY)
            })

            // Check if there is another link with the same ids but reversed
            const paths = this.graphics.getSvgRoot().querySelectorAll('path')
            for (let i = 0; i < paths.length; i++) {
                if (paths[i].getAttribute('from') === link.toId 
                && paths[i].getAttribute('to') === link.fromId) {
                    // Mark that this link overlaps with another
                    path.setAttribute('data-overlap', 'true')
                    break
                }
            }

            ui.append(path)
            ui.append(boundingRect)
            ui.append(text)

            return ui
        }).bind(this)).placeLink(((linkUI: SVGElement, 
            fromPos: {x : number, y: number}, 
            toPos: {x: number, y: number}
        ) => {
            const path = linkUI.childNodes[0] as SVGElement
            const rect = linkUI.childNodes[1] as SVGElement
            const text = linkUI.childNodes[2] as SVGElement
            // Links should stop at node's bounding box, not at the node center.
            // For rectangular nodes Viva.Graph.geom() provides efficient way to find
            // an intersection point between segment and rectangle
            const from = {
                x: fromPos.x + SvgGraphView.minNeuronWidth / 2,
                y: fromPos.y + SvgGraphView.minNeuronHeight / 2
            }

            const to = geom.intersectRect(
                // rectangle:
                toPos.x - SvgGraphView.neuronRadius, // left
                toPos.y - SvgGraphView.neuronRadius, // top
                toPos.x + SvgGraphView.minNeuronWidth + SvgGraphView.neuronRadius, // right
                toPos.y + SvgGraphView.minNeuronWidth + SvgGraphView.neuronRadius, // bottom
                // segment:
                toPos.x + SvgGraphView.minNeuronWidth / 2,
                toPos.y + SvgGraphView.minNeuronHeight / 2,
                fromPos.x + SvgGraphView.minNeuronWidth / 2,
                fromPos.y + SvgGraphView.minNeuronHeight / 2)
                || toPos // if no intersection found - return center of the node

            const data = 'M' + from.x + ',' + from.y +
                'L' + to.x + ',' + to.y
            path.setAttribute("d", data)

            // Make the bounding rectangle scale with path
            const boundingRectWidth = 30
            const boundingRectHeight = Math.sqrt(Math.pow(from.x - to.x, 2) + Math.pow(from.y - to.y, 2))
            const boundingRectAngle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI - 90
            const rectX = from.x 
            const rectY = from.y 

            // If the link overlaps with another, add an offset based on the angle
            if (path.getAttribute('data-overlap') === 'true') {
                const offset = 30
                path.setAttribute('transform', 
                    `translate(${offset * Math.cos(boundingRectAngle * Math.PI / 180)}, 
                    ${offset * Math.sin(boundingRectAngle * Math.PI / 180)})`
                )
            }

            // Render the weight of the synapse in the middle of it
            text.setAttribute('x', ((from.x + to.x) / 2).toString())
            text.setAttribute('y', ((from.y + to.y) / 2).toString())
            text.setAttribute('transform', path.getAttribute('transform') ?? '')

            rect.setAttribute('width', boundingRectWidth.toString())
            rect.setAttribute('height', boundingRectHeight.toString())
            // Place the rectangle such that the path is in the middle
            rect.setAttribute('x', (rectX - boundingRectWidth / 2).toString()) 
            rect.setAttribute('y', rectY.toString())
            rect.setAttribute('transform', `
                ${path.getAttribute('transform') ?? ''}rotate(${boundingRectAngle} ${rectX} ${rectY})`)
        }).bind(this))

        this.renderer = Viva.Graph.View.renderer(this.graph, {
            graphics: this.graphics,
            layout: layout,
            container: this.graphContainer
        })
        this.renderer.run()
    }

    /**
     * Add a node to the graph. Returns the id of the new node.
     * @param data Data of the new node
     */
    public addNode(
        id: string,
        data: {
            spikes?: number,
            rules?: string,
            delay?: number,
            spikeTrain?: string,
            pos: { x: number, y: number }
        }
    ) {
        this.graph.addNode(id, {
            spikes: data.spikes,
            rules: data.rules,
            delay: data.delay,
            spikeTrain: data.spikeTrain,
            pos: data.pos
        })
    }

    /**
     * Edit a node in the graph by replacing the node with 
     * a new node with the same id and new data
     * TODO: Find a better way to edit nodes because simply replacing the data
     * does not render the changes
     * @param id Id of the node to edit
     * @param data New data of the node
     */
    public editNode(id: string, data: {
        spikes?: number,
        rules?: string,
        delay?: number,
        spikeTrain?: string
    }) {
        // Reserve a copy of the old node
        let oldNode = this.graph.getNode<NodeData>(id)!
        oldNode = {
            id: oldNode.id,
            data: {
                spikes: oldNode.data!.spikes,
                rules: oldNode.data!.rules,
                delay: oldNode.data!.delay,
                spikeTrain: oldNode.data!.spikeTrain,
                pos: oldNode.data!.pos
            },
            links: oldNode.links
        }
        // Remove old node on the graph
        this.graph.removeNode(id)
        // Add new node
        this.graph.addNode(id, {
            spikes: data.spikes ?? oldNode.data!.spikes,
            rules: data.rules ?? oldNode.data!.rules,
            delay: data.delay ?? oldNode.data!.delay,
            spikeTrain: data.spikeTrain ?? oldNode.data!.spikeTrain,
            pos: oldNode.data!.pos
        })
        // Reconnect edges (if any)
        if (oldNode.links === null) return
        for (const link of oldNode.links) {
            this.graph.addLink(link.fromId, link.toId, link.data)
        }
    }

    /**
     * Remove a node from the graph.
     * @param id Id of the node t`o remove
     */
    public removeNode(id: string) {
        this.graph.removeNode(id)
    }

    public addEdge(fromId: string, toId: string, weight: number) {
        this.graph.addLink(fromId, toId, { weight: weight, spiking: false })
    }

    public removeEdge(fromId: string, toId: string) {
        this.graph.removeLink(this.graph.getLink(fromId, toId)!)
    }

    public editEdge(fromId: string, toId: string, data: {
        spiking?: boolean,
        weight?: number
    }) {
        // Reserve a copy of the old link
        const oldLink = this.graph.getLink(fromId, toId)!
        // Remove old link on the graph
        this.graph.removeLink(oldLink)
        // Add new link
        this.graph.addLink(fromId, toId, {
            spiking: data.spiking ?? oldLink.data.spiking,
            weight: data.weight ?? oldLink.data.weight
        })
    }

    /**
     * Reset the graph by removing all nodes and edges.
     */
    public reset(){
        this.graph.clear()
    }

    /**
     * Set the handler for when a node is clicked.
     * @param handler Handler for when a node is clicked
     */
    public handleNodeClick(handler: (nodeId: string, x: number, y: number) => void) {
        this.onNodeClick = handler
    }

    /**
     * Set the handler for when a node is right-clicked
     * @param handler Handler for when a node is right-clicked
     */
    public handleNodeRightClick(handler: (nodeId: string, x: number, y: number) => void) {
        this.onNodeRightClick = handler
    }

    /**
     * Set the handler for when an edge is right-clicked.
     * @param handler Handler for when an edge is right-clicked
     */
    public handleEdgeRightClick(handler: (fromId: string, toId: string, x: number, y: number) => void) {
        this.onEdgeRightClick = handler
    }

    /**
     * Set the handler for when the graph is clicked.
     * @param handler Handler for when the graph is clicked
     */
    public handleGraphClick(handler: (x: number, y: number) => void) {
        this.graphContainer.addEventListener('click', (e) => {
            const boundingRect = this.graphContainer.getBoundingClientRect()
            const transformMatrix = (this.graphics.getSvgRoot().firstChild! as SVGGraphicsElement).getCTM()!
            const graphX = (e.clientX - boundingRect.x - transformMatrix.e) / (transformMatrix.a + transformMatrix.c)
            const graphY = (e.clientY - boundingRect.y - transformMatrix.f) / (transformMatrix.b + transformMatrix.d)

            handler(graphX, graphY)
        })
    }

    /**
     * Set the cursor when hovering the graph
     * @param cursor Cursor to set
     */
    public setGraphCursor(cursor: string) {
        this.graphContainer.style.cursor = cursor
    }

    /**
     * Wait for graph updates before render. Used when there are consecutive updates to only render after
     * instead of rendering for each update
     */
    public beginUpdate() {
        this.graph.beginUpdate()
    }

    /**
     * Resume graph rendering. Called after all the updates on beginUpdate
     */
    public endUpdate() {
        this.graph.endUpdate()
    }

    public getNodeById(id: string) {
        return this.graph.getNode<NodeData>(id)
    }
}

export class WebGLGraphView {

}
