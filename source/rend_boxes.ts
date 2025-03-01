import {gl_link_program, gl} from "@engine/gl.ts";
import {cam2_t} from "@cl/cam2.ts";
import {TYPE} from "@cl/type.ts";
import {level_t} from "./world.ts";

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

        instance[0] = box.position[0];
        instance[1] = box.position[1];
        instance[2] = box.size[0];
        instance[3] = box.size[1];
        instance[4] = box.color[0];
        instance[5] = box.color[1];
        instance[6] = box.color[2];
        instance[7] = box.color[3];
    }
}

export function rend_boxes_init() {
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
                vec2 border = 0.2 / v_size;
                float softness = 1.0 / v_size.x;
                float left = smoothstep(0.0, border.x, uv.x);
                float right = smoothstep(0.0, border.x, 1.0 - uv.x);
                float top = smoothstep(0.0, border.y, uv.y);
                float bottom = smoothstep(0.0, border.y, 1.0 - uv.y);
                float outline = min(min(left, right), min(top, bottom));
                vec4 outlineColor = vec4(v_color.xyz * 0.5, 1.0);

                o_frag_color = mix(outlineColor, v_color, outline);
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

export function rend_boxes_render(box_rend: box_rend_t, camera: cam2_t): void {
    gl.useProgram(program);
    gl.uniformMatrix4fv(u_projection, false, camera.projection);
    gl.uniformMatrix4fv(u_view, false, camera.view);
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, box_rend.data);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, box_rend.count);
}
