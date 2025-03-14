import {gl_link_program, gl} from "@engine/gl.ts";
import {cam2_t} from "@cl/cam2.ts";
import {TYPE} from "@cl/type.ts";
import {level_t} from "./world.ts";
import {vec3_pack256v} from "@cl/vec3.ts";

let program: WebGLProgram;
let u_projection: WebGLUniformLocation;
let u_view: WebGLUniformLocation;
let vao: WebGLVertexArrayObject;
let vbo: WebGLBuffer;

export class box_rend_t {
    count: number;
    data: Float32Array;
    instances: Float32Array[];
};

export function box_rend_new(): box_rend_t {
    const rend = new box_rend_t();

    return rend;
}

export function box_rend_build(box_rend: box_rend_t, level: level_t): void {
    const boxes = level.boxes;
    const count = boxes.length;
    const stride = 9;
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

    box_rend.count = count;
    box_rend.data = data;
    box_rend.instances = instances;

    box_rend_update(box_rend, level);
}

export function box_rend_update(box_rend: box_rend_t, level: level_t): void {
    const boxes = level.boxes;

    for (let i = 0; i < boxes.length; ++i) {
        const box = boxes[i];
        const instance = box_rend.instances[i];
        const body = box.body;

        instance[0] = body.position[0];
        instance[1] = body.position[1];
        instance[2] = body.size[0];
        instance[3] = body.size[1];
        instance[4] = vec3_pack256v(box.inner_color);
        instance[5] = vec3_pack256v(box.outer_color);
        instance[6] = box.opacity;
        instance[7] = box.border;
        instance[8] = box.option;
    }
}

export function rend_boxes_init() {
    program = gl_link_program({
        [gl.VERTEX_SHADER]: `#version 300 es
            layout(location = 0) in vec2 i_position;
            layout(location = 1) in vec2 i_size;
            layout(location = 2) in float i_inner_color;
            layout(location = 3) in float i_outer_color;
            layout(location = 4) in float i_opacity;
            layout(location = 5) in float i_border;
            layout(location = 6) in float i_option;
            out vec2 v_size;
            out vec2 v_tex_coord;
            flat out float v_inner_color;
            flat out float v_outer_color;
            flat out float v_opacity;
            flat out float v_border;
            flat out float v_option;
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
                v_inner_color = i_inner_color;
                v_outer_color = i_outer_color;
                v_opacity = i_opacity;
                v_border = i_border;
                v_option = i_option;
            }
        `,
        [gl.FRAGMENT_SHADER]: `#version 300 es
            precision highp float;
            in vec2 v_size;
            in vec2 v_tex_coord;
            flat in float v_inner_color;
            flat in float v_outer_color;
            flat in float v_opacity;
            flat in float v_border;
            flat in float v_option;
            out vec4 o_frag_color;

            vec3 unpack256(float value) {
                float r = mod(value, 256.0) / 255.0;
                float g = mod(floor(value / 256.0), 256.0) / 255.0;
                float b = mod(floor(value / 65536.0), 256.0) / 255.0;

                return vec3(r, g, b);
            }

            float uv_border(vec2 uv, vec2 size) {
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

                vec3 inner_color = unpack256(v_inner_color);
                vec3 outer_color = unpack256(v_outer_color);
                float opacity = 1.0;
                float border_width = 0.1;
                float spike_count = v_size.x / 2.0;
                vec2 cell_size = vec2(2.0, 1.0);

                // float mask = uv_border(uv, border_width / v_size);
                // vec4 color = mix(vec4(outer_color, 1.0), vec4(inner_color, opacity), mask);

                // vec2 border_size = border_width / v_size;
                // float left = smoothstep(0.0, border_size.x, uv.x);
                // float right = smoothstep(0.0, border_size.x, 1.0 - uv.x);
                // float bottom = smoothstep(0.0, border_size.y, 1.0 - uv.y);
                // float top = smoothstep(0.0, border_size.y, uv.y);
                // float mask = min(min(left, right), min(top, bottom));
                // vec4 color = mix(vec4(outer_color, 1.0), vec4(inner_color, opacity), mask);

                // float mask = uv.y < abs(2.0 * fract(uv.x * spike_count) - 1.0) ? 0.0 : 1.0;
                // vec4 color = vec4(inner_color, mask);

                // vec2 cell = floor(uv * v_size / cell_size);
                // float mask = mod(cell.x + cell.y, 2.0);
                // vec4 color = vec4(inner_color, mask);

                vec2 brick_border_size = border_width / cell_size;
                vec2 brick_uv = fract(uv_offset_x(uv_tile(uv, v_size, cell_size), 0.5));
                float mask = uv_border(brick_uv, brick_border_size);
                vec4 color = mix(vec4(outer_color, 1.0), vec4(inner_color, opacity), mask);

                o_frag_color = color;
            }
        `
    })!;

    u_projection = gl.getUniformLocation(program, "u_projection")!;
    u_view = gl.getUniformLocation(program, "u_view")!;
}

export function rend_boxes_build(box_rend: box_rend_t) {
    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(box_rend.data), gl.STATIC_DRAW);

    const stride = 36;

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(0, 1);

    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(1, 1);

    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(2, 1);

    gl.enableVertexAttribArray(3);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, stride, 20);
    gl.vertexAttribDivisor(3, 1);

    gl.enableVertexAttribArray(4);
    gl.vertexAttribPointer(4, 1, gl.FLOAT, false, stride, 24);
    gl.vertexAttribDivisor(4, 1);

    gl.enableVertexAttribArray(5);
    gl.vertexAttribPointer(5, 1, gl.FLOAT, false, stride, 28);
    gl.vertexAttribDivisor(5, 1);

    gl.enableVertexAttribArray(6);
    gl.vertexAttribPointer(6, 1, gl.FLOAT, false, stride, 32);
    gl.vertexAttribDivisor(6, 1);
}

export function rend_boxes_render(box_rend: box_rend_t, camera: cam2_t): void {
    gl.useProgram(program);
    gl.uniformMatrix4fv(u_projection, false, camera.projection);
    gl.uniformMatrix4fv(u_view, false, camera.view);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, box_rend.data);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, box_rend.count);
}
