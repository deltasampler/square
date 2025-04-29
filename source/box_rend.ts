import {cam2_t} from "@cl/camera/cam2.ts";
import {vec2_t} from "@cl/math/vec2.ts";
import {vec3_t} from "@cl/math/vec3.ts";
import {vec4_t} from "@cl/math/vec4.ts";
import {vec4_bitpack256v} from "@cl/math/vec4_color.ts";
import {gl, gl_link_program} from "@engine/gl.ts";
import {ATTRIB_TYPE, layout_attrib, layout_build_gl, layout_new} from "@engine/layout.ts";

let program: WebGLProgram;
let u_projection: WebGLUniformLocation;
let u_view: WebGLUniformLocation;

let vao: WebGLVertexArrayObject;
let vbo: WebGLBuffer;

const layout = layout_new();
layout_attrib(layout, ATTRIB_TYPE.F32, 3);
layout_attrib(layout, ATTRIB_TYPE.F32, 2);
layout_attrib(layout, ATTRIB_TYPE.F32, 1);
layout_attrib(layout, ATTRIB_TYPE.S32, 1);
layout_attrib(layout, ATTRIB_TYPE.S32, 1);
layout_attrib(layout, ATTRIB_TYPE.S32, 1);
layout_attrib(layout, ATTRIB_TYPE.F32, 3);

export class box_rdata_t {
    data: ArrayBuffer;
    len: number;
    cap: number;
    instances: DataView[];
};

export function box_rdata_new(): box_rdata_t {
    const rdata = new box_rdata_t();
    rdata.data = new ArrayBuffer(0);
    rdata.len = 0;
    rdata.cap = 0;
    rdata.instances = [];

    return rdata;
}

export function box_rdata_build(rdata: box_rdata_t, cap: number): void {
    const data = new ArrayBuffer(cap * layout.stride);
    const instances: DataView[] = [];

    for (let i = 0; i < cap; i += 1) {
        instances.push(new DataView(data, i * layout.stride, layout.stride));
    }

    rdata.data = data;
    rdata.len = cap;
    rdata.cap = cap;
    rdata.instances = instances;
}

export function box_rdata_instance(rdata: box_rdata_t, index: number, position: vec2_t, size: vec2_t, rotation: number, zindex: number, inner_color: vec4_t, outer_color: vec4_t, option: vec4_t, params: vec3_t): void {
    const instance = rdata.instances[index];

    instance.setFloat32(0, position[0], true);
    instance.setFloat32(4, position[1], true);
    instance.setFloat32(8, zindex, true);
    instance.setFloat32(12, size[0], true);
    instance.setFloat32(16, size[1], true);
    instance.setFloat32(20, rotation, true);
    instance.setInt32(24, vec4_bitpack256v(inner_color), true);
    instance.setInt32(28, vec4_bitpack256v(outer_color), true);
    instance.setInt32(32, vec4_bitpack256v(option), true);
    instance.setFloat32(36, params[0], true);
    instance.setFloat32(40, params[1], true);
    instance.setFloat32(44, params[2], true);
};

export function box_rend_init(): void {
    program = gl_link_program({
        [gl.VERTEX_SHADER]: `#version 300 es
            layout(location = 0) in vec3 i_position;
            layout(location = 1) in vec2 i_size;
            layout(location = 2) in float i_rotation;
            layout(location = 3) in int i_inner_color;
            layout(location = 4) in int i_outer_color;
            layout(location = 5) in int i_option;
            layout(location = 6) in vec3 i_params;
            out vec2 v_size;
            out vec2 v_tex_coord;
            flat out int v_inner_color;
            flat out int v_outer_color;
            flat out int v_option;
            out vec3 v_params;
            uniform mat4 u_projection;
            uniform mat4 u_view;

            const vec2 positions[4] = vec2[](
                vec2(-0.5, -0.5),
                vec2(0.5, -0.5),
                vec2(-0.5, 0.5),
                vec2(0.5, 0.5)
            );

            const vec2 tex_coords[4] = vec2[](
                vec2(0.0, 0.0),
                vec2(1.0, 0.0),
                vec2(0.0, 1.0),
                vec2(1.0, 1.0)
            );

            vec2 rotate(vec2 p, float r) {
                float c = cos(r), s = sin(r);

                return vec2(
                    p.x * c - p.y * s,
                    p.x * s + p.y * c
                );
            }

            void main() {
                vec2 position = rotate(positions[gl_VertexID] * i_size, i_rotation) + i_position.xy;

                gl_Position = u_projection * u_view * vec4(position, (i_position.z + 100.0) / -200.0 , 1.0);
                v_size = i_size;
                v_tex_coord = tex_coords[gl_VertexID];
                v_inner_color = i_inner_color;
                v_outer_color = i_outer_color;
                v_option = i_option;
                v_params = i_params;
            }
        `,
        [gl.FRAGMENT_SHADER]: `#version 300 es
            precision highp float;
            out vec4 o_frag_color;
            in vec2 v_size;
            in vec2 v_tex_coord;
            flat in int v_inner_color;
            flat in int v_outer_color;
            flat in int v_option;
            in vec3 v_params;

            vec4 unpack256(int packed) {
                return vec4(
                    (packed >> 24) & 0xFF,
                    (packed >> 16) & 0xFF,
                    (packed >> 8) & 0xFF,
                    packed & 0xFF
                ) / 255.0;
            }

            float uv_border_width(vec2 uv, vec2 size) {
                float left = smoothstep(0.0, size.x, uv.x);
                float right = smoothstep(0.0, size.x, 1.0 - uv.x);
                float bottom = smoothstep(0.0, size.y, 1.0 - uv.y);
                float top = smoothstep(0.0, size.y, uv.y);

                return min(min(left, right), min(top, bottom));
            }

            vec2 uv_tile(vec2 uv, vec2 size, vec2 tile_size) {
                return uv * size / tile_size;
            }

            vec2 uv_offset_x(vec2 uv, float offset) {
                uv.x += step(1.0, mod(uv.y, 2.0)) * offset;

                return uv;
            }

            void main() {
                vec2 uv = v_tex_coord;

                int opt_mask = (v_option >> 24) & 0xFF;
                int opt_border = (v_option >> 16) & 0xFF;
                int opt_texture = (v_option >> 8) & 0xFF;
                int opt_selected = v_option & 0xFF;

                vec4 inner_color = unpack256(v_inner_color);
                vec4 outer_color = unpack256(v_outer_color);
                float spike_count = v_size.x / 2.0;
                vec4 color = vec4(1.0);
                float border_width = v_params.x;
                vec2 cell_size = v_params.yz;

                if (opt_mask == 0) {
                    vec2 border_size = border_width / v_size;
                    float left = (opt_border == 1 || opt_border == 5) ? smoothstep(0.0, border_size.x, uv.x) : 1.0;
                    float right = (opt_border == 2 || opt_border == 5) ? smoothstep(0.0, border_size.x, 1.0 - uv.x) : 1.0;
                    float bottom = (opt_border == 3 || opt_border == 5) ? smoothstep(0.0, border_size.y, uv.y) : 1.0;
                    float top = (opt_border == 4 || opt_border == 5) ? smoothstep(0.0, border_size.y, 1.0 - uv.y) : 1.0;
                    float mask = min(min(left, right), min(top, bottom));
                    color = mix(vec4(outer_color.xyz, 1.0), inner_color, mask);

                } else if (opt_mask == 1) {
                    float edge = abs(2.0 * fract(uv.x * v_size.x + 0.5) - 1.0);
                    float alias_width = max(fwidth(edge) * 2.0, 0.05);
                    float mask = smoothstep(uv.y - alias_width, uv.y, edge);

                    color = vec4(inner_color.xyz, mask);
                }

                if (opt_texture == 1) {
                    vec2 cell = floor(uv * v_size / cell_size);
                    float mask = mod(cell.x + cell.y, 2.0);
                    color += vec4(vec3(mask) * 0.1, 0.0);
                } else if (opt_texture == 2) {
                    vec2 brick_border_size = border_width / cell_size;
                    vec2 brick_uv = fract(uv_offset_x(uv_tile(uv, v_size, cell_size), 0.5));
                    float mask = uv_border_width(brick_uv, brick_border_size);

                    color = mix(vec4(outer_color.xyz, 1.0), color, mask);
                }

                if (opt_selected == 1) {
                    color += vec4(0.0, 0.0, 0.3, 0.0);
                }

                o_frag_color = color;
            }
        `
    })!;

    u_projection = gl.getUniformLocation(program, "u_projection")!;
    u_view = gl.getUniformLocation(program, "u_view")!;
}

export function box_rend_build(rdata: box_rdata_t): void {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(rdata.data), gl.STATIC_DRAW);

    layout_build_gl(layout, true);
}

export function box_rend_render(rdata: box_rdata_t, camera: cam2_t): void {
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(program);
    gl.uniformMatrix4fv(u_projection, false, camera.projection);
    gl.uniformMatrix4fv(u_view, false, camera.view);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, rdata.data);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, rdata.len);
    gl.disable(gl.DEPTH_TEST);
}
