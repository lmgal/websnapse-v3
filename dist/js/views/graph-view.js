"use strict";
// @ts-nocheck
// Just import VivagraphJS on the html
Object.defineProperty(exports, "__esModule", { value: true });
exports.SvgGraphView = void 0;
class SvgGraphView {
    constructor() {
        this.graph = Viva.Graph.graph();
        const graphics = Viva.Graph.View.svgGraphics();
        graphics.node(function (node) {
            console.log(node);
            const ui = Viva.Graph.svg('g');
            const container = Viva.Graph.svg('rect')
                .attr('width', neuronWidth)
                .attr('height', neuronHeight)
                .attr('style', 'fill: rgb(256, 256, 256); stroke: rgb(0, 0, 0)')
                .attr('rx', neuronRadius);
            // Spikes
            const spikes = MathJax.tex2svg(node.data.spikes, {
                em: 10,
                ex: 5,
                display: true
            }).querySelector('svg');
            const spikesWidth = spikes.width.baseVal.valueInSpecifiedUnits * (73.83200073242188 / 9.229000091552734);
            spikes.setAttribute('x', (neuronWidth - spikesWidth) / 2);
            spikes.setAttribute('y', 5);
            // Regex
            const reg = MathJax.tex2svg(node.data.reg, {
                em: 10,
                ex: 5,
                display: true
            }).querySelector('svg');
            // Center the RegEx in the neuron
            const regHeight = reg.height.baseVal.valueInSpecifiedUnits * (20.527999877929688 / 2.565999984741211);
            const regWidth = reg.width.baseVal.valueInSpecifiedUnits * (73.83200073242188 / 9.229000091552734);
            reg.setAttribute('x', (neuronWidth - regWidth) / 2);
            reg.setAttribute('y', (neuronHeight - regHeight) / 2);
            // Delay
            const delay = MathJax.tex2svg(node.data.delay, {
                em: 10,
                ex: 5,
                display: true
            }).querySelector('svg');
            const delayWidth = delay.width.baseVal.valueInSpecifiedUnits * (73.83200073242188 / 9.229000091552734);
            delay.setAttribute('x', (neuronWidth - delayWidth) / 2);
            delay.setAttribute('y', neuronHeight + 5);
            ui.append(container);
            ui.append(reg);
            ui.append(spikes);
            ui.append(delay);
            return ui;
        });
        graphics.placeNode(function (nodeUI, pos) {
            nodeUI.attr('transform', 'translate(' + (pos.x - 12) + ',' + (pos.y - 12) + ')');
        });
        // Customize link (directed and dashed if spiking)
        const layout = Viva.Graph.Layout.forceDirected(graph, {
            springLength: idealLength,
            springCoeff: 0,
            gravity: 0,
        });
        // Customize link (directed and dashed if spiking)
        const geom = Viva.Graph.geom();
        const marker = Viva.Graph.svg('marker')
            .attr('id', 'Triangle')
            .attr('viewBox', "0 0 10 10")
            .attr('refX', "10")
            .attr('refY', "5")
            .attr('markerUnits', "strokeWidth")
            .attr('markerWidth', "50")
            .attr('markerHeight', "10")
            .attr('orient', "auto");
        marker.append('path').attr('d', 'M 0 0 L 10 5 L 0 10 z');
        // Marker should be defined only once in <defs> child element of root <svg> element:
        const defs = graphics.getSvgRoot().append('defs');
        defs.append(marker);
        graphics.link(function (link) {
            return Viva.Graph.svg('path')
                .attr('stroke', 'gray')
                .attr('marker-end', 'url(#Triangle)');
        }).placeLink(function (linkUI, fromPos, toPos) {
            // Links should stop at node's bounding box, not at the node center.
            // For rectangular nodes Viva.Graph.geom() provides efficient way to find
            // an intersection point between segment and rectangle
            var from = {
                x: fromPos.x + neuronWidth / 2,
                y: fromPos.y + neuronHeight / 2
            };
            var to = geom.intersectRect(
            // rectangle:
            toPos.x - neuronRadius, // left
            toPos.y - neuronRadius, // top
            toPos.x + neuronWidth + neuronRadius, // right
            toPos.y + neuronWidth + neuronRadius, // bottom
            // segment:
            toPos.x + neuronWidth / 2, toPos.y + neuronHeight / 2, fromPos.x + neuronWidth / 2, fromPos.y + neuronHeight / 2)
                || toPos; // if no intersection found - return center of the node
            var data = 'M' + from.x + ',' + from.y +
                'L' + to.x + ',' + to.y;
            linkUI.attr("d", data);
        });
        const renderer = Viva.Graph.View.renderer(graph, {
            graphics: graphics,
            layout: layout,
            container: document.getElementById('graphContainer')
        });
        renderer.run();
    }
    addNode() {
    }
}
exports.SvgGraphView = SvgGraphView;
SvgGraphView.neuronWidth = 100;
SvgGraphView.neuronHeight = 120;
SvgGraphView.neuronRadius = 15;
SvgGraphView.idealLength = 500;
