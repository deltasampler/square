import {gl, gl_link_program} from "@engine/gl.ts";
import {cam2_t} from "@cl/cam2.ts";
import { vec3_t } from "@cl/type";

let program: WebGLProgram;
let u_top_color: WebGLUniformLocation;
let u_bottom_color: WebGLUniformLocation;
let u_position: WebGLUniformLocation;
let u_time: WebGLUniformLocation;

export class background_t {
    top_color: vec3_t;
    bottom_color: vec3_t;
};

export function background_new(top_color: vec3_t, bottom_color: vec3_t): background_t {
    const background = new background_t();
    background.top_color = top_color;
    background.bottom_color = bottom_color;

    return background;
}

export function rend_background_init() {
    program = gl_link_program({
        [gl.VERTEX_SHADER]: `#version 300 es
            out vec2 v_tex_coord;

            const vec2 positions[4] = vec2[4](
                vec2(-1.0, 1.0),
                vec2(-1.0, -1.0),
                vec2(1.0, 1.0),
                vec2(1.0, -1.0)
            );

            const vec2 tex_coords[4] = vec2[4](
                vec2(0.0, 0.0),
                vec2(0.0, 1.0),
                vec2(1.0, 0.0),
                vec2(1.0, 1.0)
            );

            void main() {
                vec2 position = positions[gl_VertexID];
                gl_Position = vec4(position, 0.0, 1.0);
                v_tex_coord = tex_coords[gl_VertexID];
            }
        `,
        [gl.FRAGMENT_SHADER]: `#version 300 es
            precision highp float;
            in vec2 v_tex_coord;
            uniform vec3 u_top_color;
            uniform vec3 u_bottom_color;
            uniform vec2 u_position;
            uniform float u_time;
            out vec4 o_frag_color;

            void main() {
                vec2 uv = v_tex_coord;
                vec3 color = mix(u_top_color, u_bottom_color, uv.y);

                o_frag_color = vec4(color, 1.0);
            }
        `
    })!;

    u_top_color = gl.getUniformLocation(program, "u_top_color")!;
    u_bottom_color = gl.getUniformLocation(program, "u_bottom_color")!;
    u_position = gl.getUniformLocation(program, "u_position")!;
    u_time = gl.getUniformLocation(program, "u_time")!;
}

export function rend_background_render(background: background_t, camera: cam2_t, time: number) {
    gl.useProgram(program);
    gl.uniform2fv(u_position, camera.position);
    gl.uniform3fv(u_top_color, background.top_color);
    gl.uniform3fv(u_bottom_color, background.bottom_color);
    gl.uniform1f(u_time, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
