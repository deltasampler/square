import {gl, gl_link_program} from "@engine/gl.ts";
import {cam2_t} from "@cl/cam2.ts";

let program: WebGLProgram;
let u_position: WebGLUniformLocation;
let u_time: WebGLUniformLocation;

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
            uniform vec2 u_position;
            uniform float u_time;
            out vec4 o_frag_color;

            void main() {
                vec2 uv = v_tex_coord;

                float t = u_time;
                float r = ceil(cos(radians(gl_FragCoord.x + u_position.x * 10.0)) + cos(radians(gl_FragCoord.y + u_position.y * 10.0)) + t / 10000.0);
                float g = cos(r);
                float b = cos(g);

                o_frag_color = vec4(r, g, b , 1.0);
            }
        `
    })!;

    u_position = gl.getUniformLocation(program, "u_position")!;
    u_time = gl.getUniformLocation(program, "u_time")!;
}

export function rend_background_render(camera: cam2_t, time: number) {
    gl.useProgram(program);
    gl.uniform2fv(u_position, camera.position);
    gl.uniform1f(u_time, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
