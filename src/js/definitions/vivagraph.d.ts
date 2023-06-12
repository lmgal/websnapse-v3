declare module 'vivagraphjs' {
    interface Node<NodeData = any> {
        id: string
        data: NodeData,
        links: Link[] | null
    }

    interface Link<LinkData = any> {
        id?: string
        fromId: string
        toId: string
        data?: LinkData
    }

    interface PhysicsSettings {
        /**
         * Ideal length for links (springs in physical model).
         */
        springLength?: number;
    
        /**
         * Hook's law coefficient. 1 - solid spring.
         */
        springCoefficient?: number;
    
        /**
         * Coulomb's law coefficient. It's used to repel nodes thus should be negative
         * if you make it positive nodes start attract each other :).
         */
        gravity?: number;
    
        /**
         * Theta coefficient from Barnes Hut simulation. Ranged between (0, 1).
         * The closer it's to 1 the more nodes algorithm will have to go through.
         * Setting it to one makes Barnes Hut simulation no different from
         * brute-force forces calculation (each node is considered).
         */
        theta?: number;
    
        /**
         * Drag force coefficient. Used to slow down system, thus should be less than 1.
         * The closer it is to 0 the less tight system will be.
         */
        dragCoefficient?: number;
    
        /**
         * Default time step (dt) for forces integration
         */
        timeStep?: number;
    
        /**
         * Adaptive time step uses average spring length to compute actual time step:
         * See: https://twitter.com/anvaka/status/1293067160755957760
         */
        adaptiveTimeStepWeight?: number;
    
        /**
         * This parameter defines number of dimensions of the space where simulation
         * is performed.
         */
        dimensions?: number;
    
        /**
         * In debug mode more checks are performed, this will help you catch errors
         * quickly, however for production build it is recommended to turn off this flag
         * to speed up computation.
         */
        debug?: boolean;
    }

    interface Graph {
        addNode(nodeId: string | number, data: any): void
        addLink(fromId: string | number, toId: string | number, data?: any): void
        removeNode(nodeId: string | number): void
        removeLink(link: Link, otherId?: string | number): void
        getNode<NodeData = any>(nodeId: string | number): Node<NodeData> | undefined
        getLink<LinkData = any>(fromNodeId: string | number, toNodeId: string | number): Link<LinkData> | undefined
        getNodesCount(): number
        getLinksCount(): number
        forEachNode(callback: (node: Node) => void): void
        forEachLink(callback: (link: Link) => void): void
        forEachLinkedNode(nodeId: string | number, callback: (linkedNode: Node, link: Link) => void): void
        beginUpdate(): void
        endUpdate(): void
        clear() : void
    }

    interface Layout {
        placeNode(handler: (node: Node) => ({x: number, y: number})) : void
    }

    interface Renderer {
        run() : void
        reset() : void
        rerender() : void
        moveTo(x: number, y: number) : void
    }

    export namespace Graph {
        export function graph(): Graph
        export function geom() : {
            intersect: (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) => { x: number, y: number } | null,
            intersectRect: (left: number, top: number, right: number, bottom: number, x1: number, y1: number, x2: number, y2: number) => { x: number, y: number } | null
        }
        export function svg(element: string) : HTMLElement & SVGElement

        export namespace Layout {
            export function forceDirected(graph: Graph, physicsSettings: PhysicsSettings) : Layout
            export function constant(graph: Graph) : Layout
        }

        export namespace View {
            export function svgGraphics() : {
                getNodeUI(nodeId: string | number) : HTMLElement & SVGElement,
                getLinkUI(linkId: string | number) : HTMLElement & SVGElement,
                node(builderCallback: (node: Node) => HTMLElement & SVGElement) : ReturnType<typeof svgGraphics>,
                link(builderCallback: (link: Link) => HTMLElement & SVGElement) : ReturnType<typeof svgGraphics>,
                placeNode(newPlaceCallBack: (nodeUI: HTMLElement & SVGElement, position: { x: number, y: number }, node: Node) => void) : ReturnType<typeof svgGraphics>,
                placeLink(newPlaceCallBack: (linkUI: HTMLElement & SVGElement, fromPos: { x: number, y: number }, toPos: { x: number, y: number }) => void) : ReturnType<typeof svgGraphics>,
                beginRender() : void,
                endRender() : void,
                graphCenterChanged(x: number, y: number) : void,
                translateRel(dx: number, dy: number) : void,
                scale(scaleFactor: number, scrollPoint: number) : void,
                getSvgRoot() : SVGElement
                transformClientToGraphCoordinates(clientCoordinates: { x: number, y: number}) : { x: number, y: number }
            }

            export function renderer(
                graph: Graph,
                settings: {
                    graphics: ReturnType<typeof svgGraphics>,
                    layout: any, // Fix this
                    container: HTMLElement
                }
            ) : Renderer
        }
    }
}
