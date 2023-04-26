declare module 'vivagraphjs' {
    interface Node<NodeData = any> {
        id: string | number
        data?: NodeData
        position?: {
            x: number
            y: number
        }
    }

    interface Link {
        id?: string | number
        fromId: string | number
        toId: string | number
        data?: any
    }

    interface Graph {
        addNode(nodeId: string | number, data: any): void
        addLink(fromId: string | number, toId: string | number, data?: any): void
        removeNode(nodeId: string | number): void
        removeLink(link: Link, otherId?: string | number): void
        getNode(nodeId: string | number): Node | undefined
        getLink(fromNodeId: string | number, toNodeId: string | number): Link | undefined
        getNodesCount(): number
        getLinksCount(): number
        forEachNode(callback: (node: Node) => void): void
        forEachLink(callback: (link: Link) => void): void
        forEachLinkedNode(nodeId: string | number, callback: (linkedNode: Node, link: Link) => void): void
        beginUpdate(): void
        endUpdate(): void
    }

    export namespace Graph {
        export function graph(): Graph
        export function geom() : {
            intersect: (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) => { x: number, y: number } | null,
            intersectRect: (left: number, top: number, right: number, bottom: number, x1: number, y1: number, x2: number, y2: number) => { x: number, y: number } | null
        }
        export function svg(element: string) : HTMLElement & SVGElement

        export namespace Layout {
            export function forceDirected(graph: Graph, physicsSettings: PhysicsSettings) : any
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
            }

            export function renderer(
                graph: Graph,
                settings: {
                    graphics: ReturnType<typeof svgGraphics>,
                    layout: any, // Fix this
                    container: HTMLElement
                }
            )
        }
    }
}
