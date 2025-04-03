import {clamp} from "@gui/gui.ts";
import {io_key_down, kb_event_t, m_event_t} from "@engine/io.ts";
import {cam2_new, cam2_proj_mouse, cam2_t} from "@cl/cam2.ts";
import {vec2, vec2_abs, vec2_add1, vec2_clamp2, vec2_clone, vec2_copy, vec2_divs1, vec2_len, vec2_lerp1, vec2_mul1, vec2_mul2, vec2_muls1, vec2_set, vec2_snap, vec2_sub1, vec2_swap, vec2_zero} from "@cl/vec2.ts";
import {box_rdata_build, box_rend_build, box_rdata_t} from "@engine/box_rend.ts";
import {deg90odd, wrap} from "@cl/math.ts";
import {overlap_raabb_raabb2, point_inside_aabb, point_inside_circle, point_inside_raabb} from "@cl/collision2.ts";
import {box_clone, box_t, level_t, level_to_json} from "./entities.ts";
import {point_rdata_instance, point_rend_render, point_rdata_build, point_rdata_new, point_rend_init, point_rend_build} from "@engine/point_rend.ts";
import {vec4} from "@cl/vec4.ts";
import {line_rdata_instance, line_rend_render, line_rdata_new, line_rdata_build, line_rend_init, line_rend_build, LINE_CAP_TYPE, LINE_JOIN_TYPE} from "@engine/line_rend.ts";
import {obb_rdata_instance, obb_rend_render, obb_rdata_build, obb_rend_init, obb_rend_build, obb_rdata_new} from "@engine/obb_rend.ts";
import {vec2_t} from "@cl/type.ts";
import { grid_rend_init } from "@engine/grid_rend.ts";

// editor
enum EDITOR_MODE {
    SELECT,
    TRANSLATE,
    ROTATE,
    SCALE,
    TRANSFORM
};

// config
const grid_size = vec2(0.5);

const select_width = 0.15;
const select_color = vec4(36, 71, 242, 255);

const point_radius = 0.15;
const point_radius_factor = 2.0;
const point_color = vec4(43, 237, 156, 255);

const arrow_len = 1.5;
const arrow_width = 0.15;
const arrow_width_factor = 4.0;
const arrow_color = vec4(250, 83, 45, 255);

const drag_dir_map = [
    vec2(0, 0),
    vec2(-1, 0),
    vec2(1, 0),
    vec2(0, -1),
    vec2(0, 1),
    vec2(-1, -1),
    vec2(1, -1),
    vec2(-1, 1),
    vec2(1, 1)
];

// state
export let editor_flag = false;
let editor_mode = EDITOR_MODE.SELECT;
const mouse_pos = vec2();

let select_flag = false;
const select_start = vec2();
const select_end = vec2();
const select_pos = vec2();
const select_size = vec2();
let select_boxes: box_t[] = [];
let copy_boxes: box_t[] = [];

const bound_min = vec2();
const bound_max = vec2();
const bound_pos = vec2();
const bound_size = vec2();

let drag_flag = 0;
let drag_point_flag = 0
let drag_arrow_flag = 0;
let drag_box_flag = 0;
const drag_pos = vec2();
const drag_dir = vec2();

export const editor_camera = cam2_new();
editor_camera.movement_speed = 0.3;
editor_camera.zoom_speed = 0.3;

const obb_rdata = obb_rdata_new();
const point_rdata = point_rdata_new();
const line_rdata = line_rdata_new();

export function editor_rend_init() {
    grid_rend_init();

    obb_rdata_build(obb_rdata, 2);
    obb_rend_init();
    obb_rend_build(obb_rdata);

    point_rdata_build(point_rdata, 8);
    point_rend_init();
    point_rend_build(point_rdata);

    line_rdata.cap_type = LINE_CAP_TYPE.ARROW;
    line_rdata.join_type = LINE_JOIN_TYPE.NONE;
    line_rdata_build(line_rdata, 8);
    line_rend_init();
    line_rend_build(line_rdata);
}

function compute_select(): void {
    vec2_copy(select_pos, vec2_lerp1(select_start, select_end, 0.5));
    vec2_copy(select_size, vec2_abs(vec2_sub1(select_end, select_start)));
}

function find_selected_boxes(boxes: box_t[]): void {
    if (vec2_len(select_size) < 0.5) {
        const found_boxes: box_t[] = [];

        for (const box of boxes) {
            const body = box.body;

            if (point_inside_raabb(body.position, body.size, deg90odd(body.rotation), select_pos)) {
                if (found_boxes.indexOf(box) > -1) {
                    continue;
                }

                found_boxes.push(box);
            }
        }

        if (found_boxes.length < 1) {
            return;
        }

        const top_box = found_boxes.sort((a, b) => a.zindex - b.zindex)[0];

        if (select_boxes.indexOf(top_box) > -1) {
            return;
        }

        top_box.option[3] = 1;
        select_boxes.push(top_box);
    } else {
        for (const box of boxes) {
            const body = box.body;

            if (overlap_raabb_raabb2(select_pos, select_size, false, body.position, body.size, deg90odd(body.rotation))) {
                if (select_boxes.indexOf(box) > -1) {
                    continue;
                }

                box.option[3] = 1;
                select_boxes.push(box);
            }
        }
    }
}

function clear_select_boxes(): void {
    if (select_boxes.length < 1) {
        return;
    }

    for (const box of select_boxes) {
        box.option[3] = 0;
    }

    select_boxes = [];
}

function compute_bound(): void {
    if (select_boxes.length < 1) {
        vec2_zero(bound_pos);
        vec2_zero(bound_size);

        return;
    }

    let minx = Infinity ,maxx = -Infinity;
    let miny = Infinity, maxy = -Infinity;

    for (const box of select_boxes) {
        const body = box.body;
        let sx = body.size[0], sy = body.size[1];

        if (deg90odd(body.rotation)) {
            const temp = sx;
            sx = sy;
            sy = temp;
        }

        minx = Math.min(minx, body.position[0] - sx / 2.0);
        maxx = Math.max(maxx, body.position[0] + sx / 2.0);
        miny = Math.min(miny, body.position[1] - sy / 2.0);
        maxy = Math.max(maxy, body.position[1] + sy / 2.0);
    }

    vec2_set(bound_min, minx, miny);
    vec2_set(bound_max, maxx, maxy);
    vec2_set(bound_pos, (minx + maxx) / 2.0, (miny + maxy) / 2.0);
    vec2_set(bound_size, maxx - minx, maxy - miny);
}

export function editor_m_move(event: m_event_t, camera: cam2_t, width: number, height: number): void {
    if (!editor_flag) {
        return;
    }
    vec2_set(mouse_pos, event.x, event.y);

    const point = cam2_proj_mouse(camera, mouse_pos, width, height);

    if (editor_mode === EDITOR_MODE.SELECT) {
        if (!select_flag) {
            vec2_copy(select_start, point);
        }

        vec2_copy(select_end, point);
        compute_select();
    } else if (editor_mode === EDITOR_MODE.TRANSFORM) {
        if (drag_flag) {
            const diff = vec2((point[0] - drag_pos[0]) * drag_dir[0], (point[1] - drag_pos[1]) * drag_dir[1]);
            const diff_abs = vec2_mul1(diff, drag_dir);

            for (const box of select_boxes) {
                const body = box.body;

                if (drag_point_flag) {
                    if (event.shift) {
                        if (deg90odd(body.rotation)) {
                            vec2_swap(diff);
                        }

                        vec2_copy(body.size, vec2_add1(box.drag_size, vec2_muls1(diff, 2.0)));
                        vec2_snap(body.size, vec2_muls1(grid_size, 2.0), body.size);
                        vec2_clamp2(body.size, vec2(1.0), vec2(1000.0));
                    } else {
                        if (deg90odd(body.rotation)) {
                            vec2_swap(diff);
                        }

                        vec2_copy(body.size, vec2_add1(box.drag_size, diff));
                        vec2_snap(body.size, grid_size, body.size);
                        vec2_clamp2(body.size, vec2(1.0), vec2(1000.0));

                        const test = vec2_sub1(body.size, box.drag_size);

                        if (deg90odd(body.rotation)) {
                            vec2_swap(test);
                        }

                        const diff_size = vec2_mul2(test, drag_dir);

                        vec2_copy(body.position, vec2_add1(box.drag_pos, vec2_divs1(diff_size, 2.0)));
                    }
                } else if (drag_arrow_flag) {
                    vec2_copy(body.position, vec2_add1(box.drag_pos, diff_abs));
                    vec2_snap(body.position, grid_size, body.position);
                } else if (drag_box_flag) {
                    vec2_copy(body.position, vec2_add1(box.drag_pos, diff));
                    vec2_snap(body.position, grid_size, body.position);
                }

                compute_bound();
            }
        }
    }
};

export function switch_editor_flag() {
    editor_flag = !editor_flag;
}

export function get_editor_flag() {
    return editor_flag;
}

export function editor_m_button_down(event: m_event_t, camera: cam2_t, width: number, height: number): void {
    if (!editor_flag) {
        return;
    }

    vec2_set(mouse_pos, event.x, event.y);

    const point = cam2_proj_mouse(camera, mouse_pos, width, height);

    if (editor_mode === EDITOR_MODE.SELECT) {
        select_flag = true;
        vec2_copy(select_start, point);
        compute_select();

        if (!event.ctrl) {
            clear_select_boxes();
            compute_bound();
        }

    } else if (editor_mode === EDITOR_MODE.TRANSFORM) {
        const x = bound_pos[0];
        const y = bound_pos[1];
        const x0 = bound_size[0] / 2.0;
        const y0 = bound_size[1] / 2.0;
        const x1 = bound_size[0] / 2.0 + arrow_len / 2.0;
        const y1 = bound_size[1] / 2.0 + arrow_len / 2.0;

        drag_flag = 0;

        // point
        drag_point_flag = 0;
        const drag_point_l_flag = Number(point_inside_circle(vec2(x - x0, y), point_radius * point_radius_factor, point)) * 1;
        const drag_point_r_flag = Number(point_inside_circle(vec2(x + x0, y), point_radius * point_radius_factor, point)) * 2;
        const drag_point_d_flag = Number(point_inside_circle(vec2(x, y - y0), point_radius * point_radius_factor, point)) * 3;
        const drag_point_u_flag = Number(point_inside_circle(vec2(x, y + y0), point_radius * point_radius_factor, point)) * 4;
        const drag_point_ld_flag = Number(point_inside_circle(vec2(x - x0, y - y0), point_radius * point_radius_factor, point)) * 5;
        const drag_point_rd_flag = Number(point_inside_circle(vec2(x + x0, y - y0), point_radius * point_radius_factor, point)) * 6;
        const drag_point_lu_flag = Number(point_inside_circle(vec2(x - x0, y + y0), point_radius * point_radius_factor, point)) * 7;
        const drag_point_ru_flag = Number(point_inside_circle(vec2(x + x0, y + y0), point_radius * point_radius_factor, point)) * 8;
        drag_point_flag = drag_point_l_flag + drag_point_r_flag + drag_point_d_flag + drag_point_u_flag + drag_point_ld_flag + drag_point_rd_flag + drag_point_lu_flag + drag_point_ru_flag;

        // arrow
        drag_arrow_flag = 0;

        if (!drag_point_flag) {
            const arrow_left_flag = Number(point_inside_aabb(vec2(x - x1, y), vec2(arrow_len, arrow_width * arrow_width_factor), point)) * 1;
            const arrow_right_flag = Number(point_inside_aabb(vec2(x + x1, y), vec2(arrow_len, arrow_width * arrow_width_factor), point)) * 2;
            const arrow_down_flag = Number(point_inside_aabb(vec2(x, y - y1), vec2(arrow_width * arrow_width_factor, arrow_len), point)) * 3;
            const arrow_up_flag = Number(point_inside_aabb(vec2(x, y + y1), vec2(arrow_width * arrow_width_factor, arrow_len), point)) * 4;
            drag_arrow_flag = arrow_left_flag + arrow_right_flag + arrow_down_flag + arrow_up_flag;
        }

        // box
        drag_box_flag = 0;

        if (!drag_point_flag && !drag_arrow_flag) {
            drag_box_flag = Number(point_inside_aabb(bound_pos, bound_size, point)) * 8;
        }

        drag_flag = drag_point_flag + drag_arrow_flag + drag_box_flag;

        vec2_copy(drag_pos, point);
        vec2_copy(drag_dir, drag_dir_map[drag_flag]);

        // store position and size before transforming
        for (const box of select_boxes) {
            const body = box.body;

            box.drag_pos = vec2_clone(body.position);
            box.drag_size = vec2_clone(body.size);
        }
    }
}

export function editor_m_button_up(event: m_event_t, boxes: box_t[]): void {
    if (!editor_flag) {
        return;
    }

    vec2_set(mouse_pos, event.x, event.y);

    if (editor_mode === EDITOR_MODE.SELECT) {
        select_flag = false;
        compute_select();
        find_selected_boxes(boxes);
        compute_bound();
    } else if (editor_mode === EDITOR_MODE.TRANSFORM) {
        drag_flag = 0;
    }
}

export function editor_kb_key_down(event: kb_event_t, level: level_t, box_rdata: box_rdata_t): void {
    if (!editor_flag) {
        return;
    }

    if (event.code === "KeyR" && (event.ctrl || event.shift)) {
        event.event.preventDefault();

        if (select_boxes.length === 1) {
            const box = select_boxes[0];
            box.body.rotation = wrap(box.body.rotation + (event.shift ? 90.0 : -90.0), 360.0);
        }
    }

    if (event.code === "Digit1") {
        editor_mode = EDITOR_MODE.SELECT;
    }

    if (event.code === "Digit2") {
        editor_mode = EDITOR_MODE.TRANSFORM;
        select_flag = false;
    }

    if (event.code === "KeyC" && event.ctrl && select_boxes.length) {
        copy_boxes = [];

        for (const box of select_boxes) {
            copy_boxes.push(box_clone(box));
        }
    }

    if (event.code === "KeyV" && event.ctrl && copy_boxes.length) {
        const free = box_rdata.cap - box_rdata.len;

        if (free < copy_boxes.length) {
            box_rdata_build(box_rdata, box_rdata.cap + copy_boxes.length);
            box_rend_build(box_rdata);
        }

        level.boxes.push(...copy_boxes);
        box_rdata.len = level.boxes.length;

        clear_select_boxes();

        select_boxes = [...copy_boxes];
        copy_boxes = [];
    }

    if (event.code === "Delete") {
        for (const box of select_boxes) {
            const index = level.boxes.indexOf(box);

            if (index > -1) {
                level.boxes.splice(index, 1);
            }
        }

        box_rdata.len = level.boxes.length;

        clear_select_boxes();
        compute_bound();
    }

    if (event.code === "KeyS" && event.ctrl) {
        event.event.preventDefault();
        console.log(level_to_json(level));
    }
}

export function editor_camera_controls(camera: cam2_t, target: vec2_t): void {
    if (io_key_down("KeyA")) {
        target[0] -= camera.movement_speed;
    }

    if (io_key_down("KeyD")) {
        target[0] += camera.movement_speed;
    }

    if (io_key_down("KeyS")) {
        target[1] -= camera.movement_speed;
    }

    if (io_key_down("KeyW")) {
        target[1] += camera.movement_speed;
    }

    if (io_key_down("KeyQ")) {
        camera.scale = clamp(camera.scale - camera.zoom_speed, 20.0, 100.0);
    }

    if (io_key_down("KeyE")) {
        camera.scale = clamp(camera.scale + camera.zoom_speed, 20.0, 100.0);
    }
}

export function editor_rend_selection(camera: cam2_t): void {
    if (!editor_flag) {
        return;
    }

    compute_bound();
    obb_rdata_instance(obb_rdata, 0, select_pos, select_size, 0, 0, vec4(select_color[0], select_color[1], select_color[2], 10), select_color, select_width);
    obb_rdata_instance(obb_rdata, 1, bound_pos, bound_size, 0, 0, vec4(select_color[0], select_color[1], select_color[2], 10), select_color, select_width);
    obb_rend_render(obb_rdata, camera);

    if (select_boxes.length && editor_mode === EDITOR_MODE.TRANSFORM) {
        const x = bound_pos[0];
        const y = bound_pos[1];
        const x0 = bound_size[0] / 2.0;
        const x1 = bound_size[0] / 2.0 + arrow_len;
        const y0 = bound_size[1] / 2.0;
        const y1 = bound_size[1] / 2.0 + arrow_len

        // arrows
        line_rdata_instance(line_rdata, 0, vec2(x - x0, y), arrow_width, 1, 0, arrow_color);
        line_rdata_instance(line_rdata, 1, vec2(x - x1, y), arrow_width, 0, 0, arrow_color);
    
        line_rdata_instance(line_rdata, 2, vec2(x + x0, y), arrow_width, 1, 0, arrow_color);
        line_rdata_instance(line_rdata, 3, vec2(x + x1, y), arrow_width, 0, 0, arrow_color);
    
        line_rdata_instance(line_rdata, 4, vec2(x, y - y0), arrow_width, 1, 0, arrow_color);
        line_rdata_instance(line_rdata, 5, vec2(x, y - y1), arrow_width, 0, 0, arrow_color);
    
        line_rdata_instance(line_rdata, 6, vec2(x, y + y0), arrow_width, 1, 0, arrow_color);
        line_rdata_instance(line_rdata, 7, vec2(x, y + y1), arrow_width, 0, 0, arrow_color);

        // points
        point_rdata_instance(point_rdata, 0, vec2(x - x0, y), point_radius, 0, point_color);
        point_rdata_instance(point_rdata, 1, vec2(x + x0, y), point_radius, 0, point_color);

        point_rdata_instance(point_rdata, 2, vec2(x, y - y0), point_radius, 0, point_color);
        point_rdata_instance(point_rdata, 3, vec2(x, y + y0), point_radius, 0, point_color);

        point_rdata_instance(point_rdata, 4, vec2(x - x0, y - y0), point_radius, 0, point_color);
        point_rdata_instance(point_rdata, 5, vec2(x + x0, y - y0), point_radius, 0, point_color);

        point_rdata_instance(point_rdata, 6, vec2(x + x0, y + y0), point_radius, 0, point_color);
        point_rdata_instance(point_rdata, 7, vec2(x - x0, y + y0), point_radius, 0, point_color);

        line_rend_render(line_rdata, camera);
        point_rend_render(point_rdata, camera);
    }
}
