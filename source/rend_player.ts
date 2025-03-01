import {gl, gl_link_program} from "@engine/gl.ts";
import {player_t} from "./world.ts";
import {cam2_t} from "@cl/cam2.ts";

let program: WebGLProgram;
let u_projection: WebGLUniformLocation;
let u_view: WebGLUniformLocation;
let u_position: WebGLUniformLocation;
let u_size: WebGLUniformLocation;

export function rend_player_init() {
    program = gl_link_program({
        [gl.VERTEX_SHADER]: `#version 300 es
            uniform mat4 u_projection;
            uniform mat4 u_view;
            uniform vec2 u_position;
            uniform vec2 u_size;
            out vec2 v_tex_coord;

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
                vec2 position = positions[gl_VertexID] * u_size + u_position;
                gl_Position = u_projection * u_view * vec4(position, 0.0, 1.0);
                v_tex_coord = tex_coords[gl_VertexID];
            }
        `,
        [gl.FRAGMENT_SHADER]: `#version 300 es
            precision highp float;
            in vec2 v_tex_coord;
            in vec4 v_color;
            out vec4 o_frag_color;

            void main() {
                vec2 uv = v_tex_coord * 2.0 - 1.0;
                float r = 0.5 / length(uv);

                o_frag_color = vec4(r, 0.4, 0.3, 1.0);
            }
        `
    })!;

    u_projection = gl.getUniformLocation(program, "u_projection")!;
    u_view = gl.getUniformLocation(program, "u_view")!;
    u_position = gl.getUniformLocation(program, "u_position")!;
    u_size = gl.getUniformLocation(program, "u_size")!;
}

export function rend_player_render(player: player_t, camera: cam2_t) {
    gl.useProgram(program);
    gl.uniformMatrix4fv(u_projection, false, camera.projection);
    gl.uniformMatrix4fv(u_view, false, camera.view);
    gl.uniform2fv(u_position, player.position);
    gl.uniform2fv(u_size, player.size);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
