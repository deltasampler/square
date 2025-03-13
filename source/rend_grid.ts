import {gl, gl_link_program} from "@engine/gl.ts";
import {cam2_t} from "@cl/cam2.ts";
import {vec2_t, vec3_t} from "@cl/type.ts";

let program: WebGLProgram;
let u_projection: WebGLUniformLocation;
let u_view: WebGLUniformLocation;
let u_position: WebGLUniformLocation;
let u_size: WebGLUniformLocation;
let u_cell_size: WebGLUniformLocation;
let u_line_width: WebGLUniformLocation;
let u_color: WebGLUniformLocation;

export class grid_t {
    position: vec2_t ;
    size: vec2_t;
    cell_size: vec2_t;
    line_width: number;
    color: vec3_t;
};

export function grid_new(position: vec2_t, size: vec2_t, cell_size: vec2_t, line_width: number, color: vec3_t): grid_t {
    const grid = new grid_t();
    grid.position = position;
    grid.size = size;
    grid.cell_size = cell_size;
    grid.line_width = line_width;
    grid.color = color;

    return grid;
}

export function rend_grid_init() {
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
            uniform vec2 u_size;
            uniform vec2 u_cell_size;
            uniform float u_line_width;
            uniform vec3 u_color;
            out vec4 o_frag_color;

            float grid(vec2 uv, vec2 line_width) {
                vec2 ddx = dFdx(uv);
                vec2 ddy = dFdy(uv);
                vec2 uv_deriv = vec2(length(vec2(ddx.x, ddy.x)), length(vec2(ddx.y, ddy.y)));
                bvec2 invert_line = bvec2(line_width.x > 0.5, line_width.y > 0.5);
                vec2 target_width = vec2(
                    invert_line.x ? 1.0 - line_width.x : line_width.x,
                    invert_line.y ? 1.0 - line_width.y : line_width.y
                );
                vec2 draw_width = clamp(target_width, uv_deriv, vec2(0.5));
                vec2 line_aa = uv_deriv * 1.5;
                vec2 grid_uv = abs(fract(uv) * 2.0 - 1.0);
                grid_uv.x = invert_line.x ? grid_uv.x : 1.0 - grid_uv.x;
                grid_uv.y = invert_line.y ? grid_uv.y : 1.0 - grid_uv.y;
                vec2 grid2 = smoothstep(draw_width + line_aa, draw_width - line_aa, grid_uv);
                grid2 *= clamp(target_width / draw_width, 0.0, 1.0);
                grid2 = mix(grid2, target_width, clamp(uv_deriv * 2.0 - 1.0, 0.0, 1.0));
                grid2.x = invert_line.x ? 1.0 - grid2.x : grid2.x;
                grid2.y = invert_line.y ? 1.0 - grid2.y : grid2.y;

                return mix(grid2.x, 1.0, grid2.y);
            }

            void main() {
                vec2 uv = v_tex_coord * u_size / u_cell_size;

                o_frag_color = vec4(u_color, grid(uv, vec2(u_line_width)));
            }
        `
    })!;

    u_projection = gl.getUniformLocation(program, "u_projection")!;
    u_view = gl.getUniformLocation(program, "u_view")!;
    u_position = gl.getUniformLocation(program, "u_position")!;
    u_size = gl.getUniformLocation(program, "u_size")!;
    u_cell_size = gl.getUniformLocation(program, "u_cell_size")!;
    u_line_width = gl.getUniformLocation(program, "u_line_width")!;
    u_color = gl.getUniformLocation(program, "u_color")!;
}

export function rend_grid_render(grid: grid_t, camera: cam2_t) {
    gl.useProgram(program);
    gl.uniformMatrix4fv(u_projection, false, camera.projection);
    gl.uniformMatrix4fv(u_view, false, camera.view);
    gl.uniform2fv(u_position, grid.position);
    gl.uniform2fv(u_size, grid.size);
    gl.uniform2fv(u_cell_size, grid.cell_size);
    gl.uniform1f(u_line_width, grid.line_width);
    gl.uniform3fv(u_color, grid.color);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}
