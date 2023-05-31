/// <reference path="../../../definitions/raw.d.ts" />
import { AbstractNodeProgram } from 'sigma/rendering/webgl/programs/common/node'
import { NodeDisplayData } from 'sigma/types'

import roundedRectNodeVertexShader from './node.rounded-rect.vert.glsl?raw'
import roundedRectNodeFragmentShader from './node.rounded-rect.frag.glsl?raw'
import { RenderParams } from 'sigma/rendering/webgl/programs/common/program'

export type CustomNodeData = {
    width: number,
    height: number
}

const POINTS = 1,
    ATTRIBUTES = 4

export class NodeProgramRoundedRect extends AbstractNodeProgram {
    public positionLocation: GLint
    public sizeLocation: GLint

    public ratioLocation: WebGLUniformLocation
    public scaleLocation: WebGLUniformLocation
    public matrixLocation: WebGLUniformLocation

    constructor(gl: WebGLRenderingContext) {
        super(gl, roundedRectNodeVertexShader, roundedRectNodeFragmentShader, POINTS, ATTRIBUTES)

        // Locations
        this.positionLocation = gl.getAttribLocation(this.program, 'a_position')
        this.sizeLocation = gl.getAttribLocation(this.program, 'a_size')

        // Uniform Location
        const ratioLocation = gl.getUniformLocation(this.program, 'u_ratio')
        if (ratioLocation === null)
            throw new Error("AbstractNodeProgram: error while getting ratioLocation")
        this.ratioLocation = ratioLocation

        const scaleLocation = gl.getUniformLocation(this.program, 'u_scale')
        if (scaleLocation === null)
            throw new Error("AbstractNodeProgram: error while getting scaleLocation")
        this.scaleLocation = scaleLocation

        const matrixLocation = gl.getUniformLocation(this.program, 'u_matrix')
        if (matrixLocation === null) 
            throw new Error("AbstractNodeProgram: error while getting matrixLocation")
        this.matrixLocation = matrixLocation

        this.bind()
    }

    bind() {
        const gl = this.gl

        gl.enableVertexAttribArray(this.positionLocation)
        gl.enableVertexAttribArray(this.sizeLocation)

        gl.vertexAttribPointer(this.positionLocation, 
            2, gl.FLOAT, false, 
            ATTRIBUTES * Float32Array.BYTES_PER_ELEMENT, 0)
        gl.vertexAttribPointer(this.sizeLocation, 
            2, gl.FLOAT, false, 
            ATTRIBUTES * Float32Array.BYTES_PER_ELEMENT, 
            8)
    }

    process(data: NodeDisplayData & CustomNodeData, hidden: boolean, offset: number) {
        const array = this.array
        let i = offset * POINTS * ATTRIBUTES

        if (hidden) {
            array[i++] = 0
            array[i++] = 0
            array[i++] = 0
            array[i++] = 0
            return
        }

        array[i++] = data.x
        array[i++] = data.y
        array[i++] = data.width
        array[i++] = data.height
    }

    render(params: RenderParams): void {
        const gl = this.gl

        const program = this.program
        gl.useProgram(program)

        gl.uniform1f(this.ratioLocation, 1 / Math.sqrt(params.ratio))
        gl.uniform1f(this.scaleLocation, params.scalingRatio)
        gl.uniformMatrix3fv(this.matrixLocation, false, params.matrix)
        
        gl.drawArrays(gl.POINTS, 0, this.array.length / ATTRIBUTES)
    }
}