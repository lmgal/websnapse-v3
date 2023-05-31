export type NodeData = {
    spikes?: number,
    rules?: string,
    delay?: number,
    spikeTrain: string,
    pos : { x: number, y: number }
}

export type LinkData = {
    weight: number,
    spiking: boolean
}

export interface GraphView {
    addNode: (id: string, data: {
        spikes?: number,
        rules?: string,
        delay?: number,
        spikeTrain?: string,
        pos: { x: number, y: number }
    }) => void
    addEdge: (fromId: string, toId: string, weight: number) => void
    removeNode: (id: string) => void
    removeEdge: (fromId: string, toId: string) => void
    editNode: (id: string, data: {
        spikes?: number,
        rules?: string,
        delay?: number,
        spikeTrain?: string
    }) => void
    editEdge: (fromId: string, toId: string, data: {
        weight?: number,
        spiking?: boolean
    }) => void
    reset: () => void
    handleNodeClick: (callback: (nodeId: string, x: number, y: number) => void) => void
    handleNodeRightClick: (callback: (nodeId: string, x: number, y: number) => void) => void
    handleEdgeRightClick: (callback: (fromId: string, toId: string, x: number, y: number) => void) => void
    handleGraphClick: (callback: (x: number, y: number) => void) => void
    setGraphCursor: (cursor: string) => void
    beginUpdate: () => void
    endUpdate: () => void
    getNodeById: (id: string) => {
        id: string,
        data: NodeData,
        links: Array<{
            id? : string,
            fromId: string,
            toId: string,
            data?: LinkData
        }> | null
    } | undefined
}