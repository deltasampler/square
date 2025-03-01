import {gl_link_program, gl} from "@engine/gl.ts";
import {cam2_t} from "@cl/cam2.ts";
import {TYPE} from "@cl/type.ts";
import {level_t} from "./world.ts";

let program: WebGLProgram;
let u_projection: WebGLUniformLocation;
let u_view: WebGLUniformLocation;
let vao: WebGLVertexArrayObject;
let vbo: WebGLBuffer;

export class ball_rend_t {
    count: number;
    data: Float32Array;
    instances: Float32Array[];
};

export function ball_rend_new(): ball_rend_t {
    const rend = new ball_rend_t();

    return rend;
}

export function ball_rend_build(ball_rend: ball_rend_t, count: number): void {
    const stride = 8;
    const byte = 4;
    const data = new Float32Array(count * stride);
    const instances: Float32Array[] = [];

    for (let i = 0; i < count; ++i) {
        instances.push(new TYPE(
            data.buffer,
            i * stride * byte,
            stride
        ));
    }

    ball_rend.count = count;
    ball_rend.data = data;
    ball_rend.instances = instances;
}

export function ball_rend_update(ball_rend: ball_rend_t, level: level_t): void {
    const balls = level.balls;

    for (let i = 0; i < balls.length; ++i) {
        const ball = balls[i];
        const instance = ball_rend.instances[i];

        instance[0] = ball.position[0];
        instance[1] = ball.position[1];
        instance[2] = ball.diameter;
        instance[3] = ball.diameter;
        instance[4] = ball.color[0];
        instance[5] = ball.color[1];
        instance[6] = ball.color[2];
        instance[7] = ball.color[3];
    }
}

export function rend_balls_init() {
    program = gl_link_program({
        [gl.VERTEX_SHADER]: `#version 300 es
            layout(location = 0) in vec2 i_position;
            layout(location = 1) in vec2 i_size;
            layout(location = 2) in vec4 i_color;
            out vec2 v_size;
            out vec2 v_tex_coord;
            out vec4 v_color;
            uniform mat4 u_projection;
            uniform mat4 u_view;

            const vec2 positions[4] = vec2[4](
                vec2(-0.5, 0.5),
                vec2(-0.5, -0.5),
                vec2(0.5, 0.5),
                vec2(0.5, -0.5)
            );

            const vec2 tex_coords[4] = vec2[4](
                vec2(0.0, 0.0),
                vec2(0.0, 1.0),
                vec2(1.0, 0.0),
                vec2(1.0, 1.0)
            );

            void main() {
                vec2 position = positions[gl_VertexID] * i_size + i_position;

                gl_Position = u_projection * u_view * vec4(position, 0.0, 1.0);
                v_size = i_size;
                v_tex_coord = tex_coords[gl_VertexID];
                v_color = i_color;
            }
        `,
        [gl.FRAGMENT_SHADER]: `#version 300 es
            precision highp float;
            in vec2 v_size;
            in vec2 v_tex_coord;
            in vec4 v_color;
            out vec4 o_frag_color;

            void main() {
                vec2 uv = v_tex_coord;

                if (length(uv - 0.5) > 0.5) {
                    discard;
                }

                o_frag_color = v_color;
            }
        `
    })!;

    u_projection = gl.getUniformLocation(program, "u_projection")!;
    u_view = gl.getUniformLocation(program, "u_view")!;
}

export function rend_balls_build(ball_rend: ball_rend_t) {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ball_rend.data), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 32, 0);
    gl.vertexAttribDivisor(0, 1);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 32, 8);
    gl.vertexAttribDivisor(1, 1);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16);
    gl.vertexAttribDivisor(2, 1);
}

export function rend_balls_render(ball_rend: ball_rend_t, camera: cam2_t): void {
    gl.useProgram(program);
    gl.uniformMatrix4fv(u_projection, false, camera.projection);
    gl.uniformMatrix4fv(u_view, false, camera.view);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, ball_rend.data);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, ball_rend.count);
}
