import { Line } from '../src/js/singletons/draw-manager/line-manager/line';
/* eslint-disable camelcase */
// Generated by CodiumAI

/*
Code Analysis

Main functionalities:
The Line class represents a line with a start and end point in a WebGL context. It requires a precompiled shader program and its attributes to work. The main functionalities of this class are to draw the line and to set its start and end points.

Methods:
- constructor: initializes the Line object with the given WebGL context, attributes, and uniforms. It also creates a vertex buffer for the line.
- draw: draws the line with the given color. It sets the color uniform, binds the vertex buffer, and calls the drawArrays method of the WebGL context.
- set: sets the start and end points of the line. It updates the vertex buffer with the new points.

Fields:
- attribs_: an object that stores the attribute locations of the shader program.
- gl_: the WebGL context.
- uniforms_: an object that stores the uniform locations of the shader program.
- vertBuf_: the vertex buffer that stores the line's start and end points.
*/

describe('Line_class', () => {

    // Tests that Line can be instantiated with a WebGL2RenderingContext, attributes, and uniforms
    it('test_instantiation_with_valid_parameters', () => {
        const gl = global.mocks.glMock;
        const attribs = { a_position: 0 } as { a_position: number };
        const program = gl.createProgram() as WebGLProgram;
        const uniforms = {
            u_color: gl.getUniformLocation(program, 'u_color'),
            u_camMatrix: gl.getUniformLocation(program, 'u_camMatrix'),
            u_mvMatrix: gl.getUniformLocation(program, 'u_mvMatrix'),
            u_pMatrix: gl.getUniformLocation(program, 'u_pMatrix'),
        } as { u_color: WebGLUniformLocation; u_camMatrix: WebGLUniformLocation; u_mvMatrix: WebGLUniformLocation; u_pMatrix: WebGLUniformLocation };
        const line = new Line(gl, attribs, uniforms);
        expect(line).toBeInstanceOf(Line);
    });

    // Tests that Line can be drawn with a given color
    it('test_draw_with_valid_color', () => {
        const gl = global.mocks.glMock;
        const attribs = { a_position: 0 };
        const uniforms = {
            u_color: gl.getUniformLocation(gl.createProgram(), 'u_color'),
            u_camMatrix: gl.getUniformLocation(gl.createProgram(), 'u_camMatrix'),
            u_mvMatrix: gl.getUniformLocation(gl.createProgram(), 'u_mvMatrix'),
            u_pMatrix: gl.getUniformLocation(gl.createProgram(), 'u_pMatrix'),
        };
        const line = new Line(gl, attribs, uniforms);
        line.draw([1.0, 1.0, 1.0, 1.0]);
        expect(line).toBeInstanceOf(Line);
    });

    // Tests that Line can be set with two EciArr3 points
    it('test_set_with_valid_EciArr3_points', () => {
        const gl = global.mocks.glMock;
        const attribs = { a_position: 0 };
        const uniforms = {
            u_color: gl.getUniformLocation(gl.createProgram(), 'u_color'),
            u_camMatrix: gl.getUniformLocation(gl.createProgram(), 'u_camMatrix'),
            u_mvMatrix: gl.getUniformLocation(gl.createProgram(), 'u_mvMatrix'),
            u_pMatrix: gl.getUniformLocation(gl.createProgram(), 'u_pMatrix'),
        };
        const line = new Line(gl, attribs, uniforms);
        line.set([0, 0, 0], [1, 1, 1]);
        expect(line).toBeInstanceOf(Line);
    });

    // Tests that Line cannot be drawn with invalid color
    it('test_draw_with_invalid_color', () => {
        const gl = global.mocks.glMock;
        const attribs = { a_position: 0 };
        const uniforms = {
            u_color: gl.getUniformLocation(gl.createProgram(), 'u_color'),
            u_camMatrix: gl.getUniformLocation(gl.createProgram(), 'u_camMatrix'),
            u_mvMatrix: gl.getUniformLocation(gl.createProgram(), 'u_mvMatrix'),
            u_pMatrix: gl.getUniformLocation(gl.createProgram(), 'u_pMatrix'),
        };
        const line = new Line(gl, attribs, uniforms);
        expect(() => line.draw([-1, -1, -1, -1])).toThrow();
    });

    // Tests that Line can be drawn without a color parameter
    it('test_draw_without_color', () => {
        const gl = global.mocks.glMock;
        const attribs = { a_position: 0 };
        const uniforms = {
            u_color: gl.getUniformLocation(gl.createProgram(), 'u_color'),
            u_camMatrix: gl.getUniformLocation(gl.createProgram(), 'u_camMatrix'),
            u_mvMatrix: gl.getUniformLocation(gl.createProgram(), 'u_mvMatrix'),
            u_pMatrix: gl.getUniformLocation(gl.createProgram(), 'u_pMatrix'),
        };
        const line = new Line(gl, attribs, uniforms);
        expect(() => line.draw()).not.toThrow();
    });
});