import * as Viva from 'vivagraphjs'
import katex from 'katex'

export class SvgGraphView {
    public static minNeuronWidth = 100
    public static minNeuronHeight = 120
    public static neuronRadius = 15
    public static idealLength = 500

    private graph = Viva.Graph.graph()

    public constructor() {
        const graphics = Viva.Graph.View.svgGraphics()

        graphics.node(function (node) {
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
                katex.render(tex, hiddenDiv, { displayMode: true })
                const height = hiddenDiv.offsetHeight + 15
                const width = hiddenDiv.offsetWidth + 15

                return { span, height, width }
            }

            // Function that gets KaTeX span and returns SVG foreignObject
            const createForeignObject = (
                span: ChildNode, 
                width : number, height: number, 
                x: number, y: number) => {
                const foreignObject = Viva.Graph.svg('foreignObject')
                foreignObject.setAttribute('width', width.toString())
                foreignObject.setAttribute('height', height.toString())
                foreignObject.setAttribute('x', x.toString())
                foreignObject.setAttribute('y', y.toString())
                foreignObject.append(span)
                return foreignObject
            }

            // Regex
            const { span: regSpan, height: regHeight, width: regWidth } = createKaTeXSpan(node.data.reg)
            // Adjust neuron height and width accordingly
            let neuronWidth = SvgGraphView.minNeuronWidth
            let neuronHeight = SvgGraphView.minNeuronHeight
            if (regWidth > SvgGraphView.minNeuronWidth)
                neuronWidth = regWidth + 10
            if (regHeight > SvgGraphView.minNeuronHeight)
                neuronHeight = regHeight + 10

            const reg = createForeignObject(
                regSpan, regWidth, regHeight,
                (neuronWidth - regWidth) / 2, (neuronHeight - regHeight) / 2)

            // Container
            let container = Viva.Graph.svg('rect')
            container.setAttribute('width', neuronWidth.toString())
            container.setAttribute('height', neuronHeight.toString())
            container.setAttribute('rx', SvgGraphView.neuronRadius.toString())
            // If neuron is closed, make it gray
            if (node.data.delay > 0)
                container.setAttribute('style', 'fill: rgb(128, 128, 128); stroke: rgb(0, 0, 0)')
            else
                container.setAttribute('style', 'fill: rgb(255, 255, 255); stroke: rgb(0, 0, 0)')

            // Spikes
            const { span: spikesSpan, height: spikesHeight, width: spikesWidth } = createKaTeXSpan(node.data.spikes)
            const spikes = createForeignObject(
                spikesSpan, spikesWidth, spikesHeight,
                (neuronWidth - spikesWidth) / 2, -15)

            // Delay
            const { span: delaySpan, height: delayHeight, width: delayWidth } = createKaTeXSpan(node.data.delay)
            const delay = createForeignObject(
                delaySpan, delayWidth, delayHeight,
                (neuronWidth - delayWidth) / 2, neuronHeight - 15)

            ui.append(container)
            ui.append(reg)
            ui.append(spikes)
            ui.append(delay)

            return ui
        })

        graphics.placeNode(function (nodeUI, pos) {
            nodeUI.setAttribute('transform', `translate(${pos.x - 12},${pos.y - 12})`)
        })

        const layout = Viva.Graph.Layout.forceDirected(this.graph, {
            springLength: SvgGraphView.idealLength,
            springCoeff: 0,
            gravity: 0,
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
        const defs = graphics.getSvgRoot().append('defs');
        // @ts-ignore
        defs.append(marker);
        graphics.link(function (link) {
            // If spiking, dashed line
            let path = Viva.Graph.svg('path')
            path.setAttribute('stroke', 'gray')
            path.setAttribute('marker-end', 'url(#Triangle)')

            if (link.data.spiking)
                path.setAttribute('stroke-dasharray', '5, 5')
            // Otherwise, plain line
            return path
        }).placeLink(function (linkUI, fromPos, toPos) {
            // Links should stop at node's bounding box, not at the node center.
            // For rectangular nodes Viva.Graph.geom() provides efficient way to find
            // an intersection point between segment and rectangle
            var from = {
                x: fromPos.x + SvgGraphView.minNeuronWidth / 2,
                y: fromPos.y + SvgGraphView.minNeuronHeight / 2
            }

            var to = geom.intersectRect(
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

            var data = 'M' + from.x + ',' + from.y +
                'L' + to.x + ',' + to.y

            linkUI.setAttribute("d", data)
        })


        const renderer = Viva.Graph.View.renderer(this.graph, {
            graphics: graphics,
            layout: layout,
            container: document.getElementById('graphContainer')!
        })
        renderer.run()
    }

    public addNode(data: {
        spikes?: number,
        rules?: string,
        delay?: number,
        spikeTrain?: Uint8Array
    }) {
        this.graph.beginUpdate()
        this.graph.addNode(this.graph.getNodesCount(), data)
        this.graph.endUpdate()
    }

    public editNode(id: number, data: {
        spikes?: number,
        rules?: string,
        delay?: number,
        spikeTrain?: Uint8Array
    }) {
        const node = this.graph.getNode(id)
        if (node) {
            this.graph.beginUpdate()
            this.graph.getNode(id)!.data = data
            this.graph.endUpdate()
        }
    }

    public removeNode(id: number) {
        this.graph.beginUpdate()
        this.graph.removeNode(id)
        this.graph.endUpdate()
    }

    public addEdge(from: number, to: number) {
        this.graph.beginUpdate()
        this.graph.addLink(from, to, { spiking: false })
        this.graph.endUpdate()
    }

    public removeEdge(from: number, to: number) {
        this.graph.beginUpdate()
        this.graph.removeLink(this.graph.getLink(from, to)!)
        this.graph.endUpdate()
    }

    public editEdge(from: number, to: number, spiking: boolean) {
        this.graph.beginUpdate()
        this.graph.getLink(from, to)!.data.spiking = spiking
        this.graph.endUpdate()
    }
}

export class WebGLGraphView {

}
