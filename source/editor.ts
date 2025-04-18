import {clamp, collapsing_header_t, COLOR_MODE, get_enum_keys, get_enum_values, gs_object, gui_bool, gui_button, gui_collapsing_header, gui_color_edit, gui_input_number, gui_input_text, gui_input_vec, gui_reload_component, gui_select, gui_slider_number, gui_text, gui_update, window_t} from "@gui/gui.ts";
import {io_key_down, kb_event_t, m_event_t} from "@engine/io.ts";
import {cam2_new, cam2_proj_mouse, cam2_t} from "@cl/camera/cam2.ts";
import {vec2, vec2_abs, vec2_add1, vec2_clamp2, vec2_clone, vec2_copy, vec2_divs1, vec2_len, vec2_lerp1, vec2_mul1, vec2_mul2, vec2_muls1, vec2_set, vec2_snap, vec2_sub1, vec2_swap, vec2_t, vec2_zero} from "@cl/math/vec2.ts";
import {deg90odd, wrap} from "@cl/math/math.ts";
import {overlap_raabb_raabb2, point_inside_aabb, point_inside_circle, point_inside_raabb} from "@cl/collision/collision2.ts";
import {box_brick, box_clone, box_end_zone, box_ground, box_mover, BOX_PRESET, box_spikes, box_start_zone, box_t, BOX_TYPE, GEOMETRY_TYPE, level_add_box, level_deserialize, level_new, level_serialize, level_t, OPT_BORDER, OPT_MASK, OPT_TEXTURE} from "./world.ts";
import {point_rdata_instance, point_rend_render, point_rdata_build, point_rdata_new, point_rend_init, point_rend_build} from "@engine/point_rend.ts";
import {vec4, vec4_t} from "@cl/math/vec4.ts";
import {line_rdata_instance, line_rend_render, line_rdata_new, line_rdata_build, line_rend_init, line_rend_build, LINE_CAP_TYPE, LINE_JOIN_TYPE} from "@engine/line_rend.ts";
import {obb_rdata_instance, obb_rend_render, obb_rdata_build, obb_rend_init, obb_rend_build, obb_rdata_new} from "@engine/obb_rend.ts";
import {grid_rdata_new, grid_rend_init, grid_rend_render} from "@engine/grid_rend.ts";
import {rgb} from "@cl/math/vec3.ts";
import {store_add_level, store_get_level, store_get_levels, store_set_level} from "./storage.ts";
import {BOX_LIMIT} from "./config.ts";

export class editor_t {
    grid_size: vec2_t;
    select_width: number;
    select_color: vec4_t;
    point_radius: number;
    point_radius_factor: number;
    point_color: vec4_t;
    arrow_len: number;
    arrow_width: number;
    arrow_width_factor: number;
    arrow_color: vec4_t;
    mouse_pos: vec2_t;
    preset: BOX_PRESET;
    load_level: number;
    select_flag: boolean;
    select_start: vec2_t;
    select_end: vec2_t;
    select_pos: vec2_t;
    select_size: vec2_t;
    select_boxes: box_t[];
    copy_boxes: box_t[];
    bound_min: vec2_t;
    bound_max: vec2_t;
    bound_pos: vec2_t;
    bound_size: vec2_t;
    drag_flag: number;
    drag_point_flag: number;
    drag_arrow_flag: number;
    drag_box_flag: number;
    drag_pos: vec2_t;
    drag_dir: vec2_t;
    level: level_t;
    camera: cam2_t;
    target: vec2_t;
    box_ch: collapsing_header_t|null;
    on_select: (select_boxes: box_t[]) => void;
    on_copy: (copy_boxes: box_t[]) => void;
    on_level_load: () => void;
};

export function editor_new(): editor_t {
    const out = new editor_t();
    out.grid_size = vec2(0.5);
    out.select_width = 0.15;
    out.select_color = vec4(36, 71, 242, 255);
    out.point_radius = 0.15;
    out.point_radius_factor = 2.0;
    out.point_color = vec4(43, 237, 156, 255);
    out.arrow_len = 1.5;
    out.arrow_width = 0.15;
    out.arrow_width_factor = 4.0;
    out.arrow_color = vec4(250, 83, 45, 255);
    out.mouse_pos = vec2();
    out.preset = BOX_PRESET.GROUND;
    out.load_level = 0;
    out.select_flag = false;
    out.select_start = vec2();
    out.select_end = vec2();
    out.select_pos = vec2();
    out.select_size = vec2();
    out.select_boxes = [];
    out.copy_boxes = [];
    out.bound_min = vec2();
    out.bound_max = vec2();
    out.bound_pos = vec2();
    out.bound_size = vec2();
    out.drag_flag = 0;
    out.drag_point_flag = 0
    out.drag_arrow_flag = 0;
    out.drag_box_flag = 0;
    out.drag_pos = vec2();
    out.drag_dir = vec2();
    out.level = level_new();
    out.camera = cam2_new();
    out.camera.movement_speed = 0.3;
    out.camera.zoom_speed = 0.3;
    out.target = vec2();
    out.box_ch = null;
    out.on_select = function() {}
    out.on_copy = function() {}
    out.on_level_load = function() {}

    const level = store_get_level("Level 1");

    if (level) {
        level_deserialize(out.level, level);
    }

    return out;
}

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

const grid_rdata = grid_rdata_new(vec2(), vec2(1024.0), vec2(1.0), 0.01, rgb(255, 255, 250));
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

export function editor_compute_select(editor: editor_t): void {
    vec2_copy(editor.select_pos, vec2_lerp1(editor.select_start, editor.select_end, 0.5));
    vec2_copy(editor.select_size, vec2_abs(vec2_sub1(editor.select_end, editor.select_start)));
}

export function editor_find_top_box(editor: editor_t, point: vec2_t): box_t|null {
    const level = editor.level;
    const found_boxes: box_t[] = [];

    for (const box of level.boxes) {
        const transform = box.transform;
        const geometry = box.geometry;

        if (point_inside_raabb(transform.position, geometry.size, deg90odd(transform.rotation), point)) {
            if (found_boxes.indexOf(box) > -1) {
                continue;
            }

            found_boxes.push(box);
        }
    }

    return found_boxes.sort((a, b) => b.style.zindex - a.style.zindex)[0];
}

export function editor_find_selected_boxes(editor: editor_t): void {
    const level = editor.level;

    if (vec2_len(editor.select_size) < 0.5) {
        const top_box = editor_find_top_box(editor, editor.select_pos);

        if (top_box && editor.select_boxes.indexOf(top_box) < 0) {
            top_box.style.option[3] = 1;
            editor.select_boxes.push(top_box);
        }
    } else {
        for (const box of level.boxes) {
            const transform = box.transform;
            const geometry = box.geometry;

            if (overlap_raabb_raabb2(editor.select_pos, editor.select_size, false, transform.position, geometry.size, deg90odd(transform.rotation))) {
                if (editor.select_boxes.indexOf(box) > -1) {
                    continue;
                }

                box.style.option[3] = 1;
                editor.select_boxes.push(box);
            }
        }
    }

    editor.on_select(editor.select_boxes);
}

export function editor_clear_select_boxes(editor: editor_t): void {
    if (editor.select_boxes.length < 1) {
        return;
    }

    for (const box of editor.select_boxes) {
        box.style.option[3] = 0;
    }

    editor.select_boxes = [];
}

export function editor_compute_bound(editor: editor_t): void {
    if (editor.select_boxes.length < 1) {
        vec2_zero(editor.bound_pos);
        vec2_zero(editor.bound_size);

        return;
    }

    let minx = Infinity ,maxx = -Infinity;
    let miny = Infinity, maxy = -Infinity;

    for (const box of editor.select_boxes) {
        const transform = box.transform;
        const geometry = box.geometry;
        let sx = geometry.size[0], sy = geometry.size[1];

        if (deg90odd(transform.rotation)) {
            const temp = sx;
            sx = sy;
            sy = temp;
        }

        minx = Math.min(minx, transform.position[0] - sx / 2.0);
        maxx = Math.max(maxx, transform.position[0] + sx / 2.0);
        miny = Math.min(miny, transform.position[1] - sy / 2.0);
        maxy = Math.max(maxy, transform.position[1] + sy / 2.0);
    }

    vec2_set(editor.bound_min, minx, miny);
    vec2_set(editor.bound_max, maxx, maxy);
    vec2_set(editor.bound_pos, (minx + maxx) / 2.0, (miny + maxy) / 2.0);
    vec2_set(editor.bound_size, maxx - minx, maxy - miny);
}

export function editor_m_button_down(event: m_event_t, editor: editor_t, width: number, height: number): void {
    vec2_set(editor.mouse_pos, event.x, event.y);

    const point = cam2_proj_mouse(editor.camera, editor.mouse_pos, width, height);

    // init drag
    if (event.button === 0 && !editor.select_flag && editor.select_boxes.length) {
        const x = editor.bound_pos[0];
        const y = editor.bound_pos[1];
        const x0 = editor.bound_size[0] / 2.0;
        const y0 = editor.bound_size[1] / 2.0;
        const x1 = editor.bound_size[0] / 2.0 + editor.arrow_len / 2.0;
        const y1 = editor.bound_size[1] / 2.0 + editor.arrow_len / 2.0;

        editor.drag_flag = 0;

        // point
        editor.drag_point_flag = 0;
        const drag_point_l_flag = Number(point_inside_circle(vec2(x - x0, y), editor.point_radius * editor.point_radius_factor, point)) * 1;
        const drag_point_r_flag = Number(point_inside_circle(vec2(x + x0, y), editor.point_radius * editor.point_radius_factor, point)) * 2;
        const drag_point_d_flag = Number(point_inside_circle(vec2(x, y - y0), editor.point_radius * editor.point_radius_factor, point)) * 3;
        const drag_point_u_flag = Number(point_inside_circle(vec2(x, y + y0), editor.point_radius * editor.point_radius_factor, point)) * 4;
        const drag_point_ld_flag = Number(point_inside_circle(vec2(x - x0, y - y0), editor.point_radius * editor.point_radius_factor, point)) * 5;
        const drag_point_rd_flag = Number(point_inside_circle(vec2(x + x0, y - y0), editor.point_radius * editor.point_radius_factor, point)) * 6;
        const drag_point_lu_flag = Number(point_inside_circle(vec2(x - x0, y + y0), editor.point_radius * editor.point_radius_factor, point)) * 7;
        const drag_point_ru_flag = Number(point_inside_circle(vec2(x + x0, y + y0), editor.point_radius * editor.point_radius_factor, point)) * 8;
        editor.drag_point_flag = drag_point_l_flag + drag_point_r_flag + drag_point_d_flag + drag_point_u_flag + drag_point_ld_flag + drag_point_rd_flag + drag_point_lu_flag + drag_point_ru_flag;

        // arrow
        editor.drag_arrow_flag = 0;

        if (!editor.drag_point_flag) {
            const arrow_left_flag = Number(point_inside_aabb(vec2(x - x1, y), vec2(editor.arrow_len, editor.arrow_width * editor.arrow_width_factor), point)) * 1;
            const arrow_right_flag = Number(point_inside_aabb(vec2(x + x1, y), vec2(editor.arrow_len, editor.arrow_width * editor.arrow_width_factor), point)) * 2;
            const arrow_down_flag = Number(point_inside_aabb(vec2(x, y - y1), vec2(editor.arrow_width * editor.arrow_width_factor, editor.arrow_len), point)) * 3;
            const arrow_up_flag = Number(point_inside_aabb(vec2(x, y + y1), vec2(editor.arrow_width * editor.arrow_width_factor, editor.arrow_len), point)) * 4;
            editor.drag_arrow_flag = arrow_left_flag + arrow_right_flag + arrow_down_flag + arrow_up_flag;
        }

        // box
        editor.drag_box_flag = 0;

        if (!editor.drag_point_flag && !editor.drag_arrow_flag) {
            const is_inside_bound = Number(point_inside_aabb(editor.bound_pos, editor.bound_size, point));
            let is_inside_child = false;

            const top_box = editor_find_top_box(editor, point);

            if (is_inside_bound && top_box && editor.select_boxes.indexOf(top_box) > -1) {
                is_inside_child = true;
            }

            editor.drag_box_flag = Number(is_inside_child) * 8;
        }

        editor.drag_flag = editor.drag_point_flag + editor.drag_arrow_flag + editor.drag_box_flag;

        vec2_copy(editor.drag_pos, point);
        vec2_copy(editor.drag_dir, drag_dir_map[editor.drag_flag]);

        // store position and size before transforming
        for (const box of editor.select_boxes) {
            const transform = box.transform;
            const geometry = box.geometry;

            box.drag_position = vec2_clone(transform.position);
            box.drag_size = vec2_clone(geometry.size);
        }
    }

    // init select
    if (event.button === 0 && !editor.drag_flag) {
        editor.select_flag = true;
        vec2_copy(editor.select_start, point);
        vec2_copy(editor.select_end, point);
        editor_compute_select(editor);

        if (!event.ctrl) {
            editor_clear_select_boxes(editor);
            editor_compute_bound(editor);
        }
    }
}

export function editor_m_move(event: m_event_t, editor: editor_t, width: number, height: number): void {
    vec2_set(editor.mouse_pos, event.x, event.y);

    const point = cam2_proj_mouse(editor.camera, editor.mouse_pos, width, height);

    // process select
    if (event.button === 0 && editor.select_flag) {
        vec2_copy(editor.select_end, point);
        editor_compute_select(editor);
    }

    // process drag
    if (event.button === 0 && editor.drag_flag) {
        const diff = vec2((point[0] - editor.drag_pos[0]) * editor.drag_dir[0], (point[1] - editor.drag_pos[1]) * editor.drag_dir[1]);
        const diff_abs = vec2_mul1(diff, editor.drag_dir);

        for (const box of editor.select_boxes) {
            const transform = box.transform;
            const geometry = box.geometry;

            if (editor.drag_point_flag) {
                if (event.shift) {
                    if (deg90odd(transform.rotation)) {
                        vec2_swap(diff);
                    }

                    vec2_copy(geometry.size, vec2_add1(box.drag_size, vec2_muls1(diff, 2.0)));
                    vec2_snap(geometry.size, vec2_muls1(editor.grid_size, 2.0), geometry.size);
                    vec2_clamp2(geometry.size, vec2(1.0), vec2(1000.0));
                } else {
                    if (deg90odd(transform.rotation)) {
                        vec2_swap(diff);
                    }

                    vec2_copy(geometry.size, vec2_add1(box.drag_size, diff));
                    vec2_snap(geometry.size, editor.grid_size, geometry.size);
                    vec2_clamp2(geometry.size, vec2(1.0), vec2(1000.0));

                    const test = vec2_sub1(geometry.size, box.drag_size);

                    if (deg90odd(transform.rotation)) {
                        vec2_swap(test);
                    }

                    const diff_size = vec2_mul2(test, editor.drag_dir);

                    vec2_copy(transform.position, vec2_add1(box.drag_position, vec2_divs1(diff_size, 2.0)));
                }
            } else if (editor.drag_arrow_flag) {
                vec2_copy(transform.position, vec2_add1(box.drag_position, diff_abs));
                vec2_snap(transform.position, editor.grid_size, transform.position);
            } else if (editor.drag_box_flag) {
                vec2_copy(transform.position, vec2_add1(box.drag_position, diff));
                vec2_snap(transform.position, editor.grid_size, transform.position);
            }

            editor_compute_bound(editor);
            editor_update_box_ch(editor.box_ch);
        }
    }
};

export function editor_m_button_up(event: m_event_t, editor: editor_t, width: number, height: number): void {
    vec2_set(editor.mouse_pos, event.x, event.y);

    const point = cam2_proj_mouse(editor.camera, editor.mouse_pos, width, height);

    // reset select
    if (event.button === 0 && editor.select_flag) {
        editor.select_flag = false;
        editor_find_selected_boxes(editor);
        editor_compute_bound(editor);

        vec2_copy(editor.select_start, point);
        vec2_copy(editor.select_end, point);
        editor_compute_select(editor);
    }

    // reset drag
    if (event.button === 0 && editor.drag_flag) {
        editor.drag_flag = 0;
    }
}

export function editor_kb_key_down(event: kb_event_t, editor: editor_t): void {
    const level = editor.level;

    if (event.code === "KeyR" && (event.ctrl || event.shift)) {
        event.event.preventDefault();

        if (editor.select_boxes.length === 1) {
            const box = editor.select_boxes[0];
            const transform = box.transform;

            transform.rotation = wrap(transform.rotation + (event.shift ? 90.0 : -90.0), 360.0);
            editor_update_box_ch(editor.box_ch);
        }
    }

    if (event.code === "KeyC" && event.ctrl && editor.select_boxes.length) {
        editor.copy_boxes = [];

        for (const box of editor.select_boxes) {
            if (box.type === BOX_TYPE.START_ZONE || box.type === BOX_TYPE.END_ZONE) {
                continue;
            }

            editor.copy_boxes.push(box_clone(box));
        }
    }

    if (event.code === "KeyV" && event.ctrl && editor.copy_boxes.length) {
        if (level.boxes.length + editor.copy_boxes.length > BOX_LIMIT) {
            editor_clear_select_boxes(editor);

            return;
        }

        editor_clear_select_boxes(editor);
        level.boxes.push(...editor.copy_boxes);
        editor.select_boxes = [...editor.copy_boxes];
        editor.copy_boxes = [];
        editor.on_select(editor.select_boxes);
    }

    if (event.code === "Delete") {
        for (const box of editor.select_boxes) {
            if (box.type === BOX_TYPE.START_ZONE || box.type === BOX_TYPE.END_ZONE) {
                continue;
            }

            const index = level.boxes.indexOf(box);

            if (index > -1) {
                level.boxes.splice(index, 1);
            }
        }

        editor_clear_select_boxes(editor);
        editor_compute_bound(editor);
    }

    if (event.code === "KeyS" && event.ctrl) {
        event.event.preventDefault();
        store_set_level(level_serialize(level));
    }
}

export function editor_camera_controls(editor: editor_t): void {
    const camera = editor.camera;

    if (io_key_down("KeyA")) {
        editor.target[0] -= camera.movement_speed;
    }

    if (io_key_down("KeyD")) {
        editor.target[0] += camera.movement_speed;
    }

    if (io_key_down("KeyS")) {
        editor.target[1] -= camera.movement_speed;
    }

    if (io_key_down("KeyW")) {
        editor.target[1] += camera.movement_speed;
    }

    if (io_key_down("KeyQ")) {
        camera.scale = clamp(camera.scale - camera.zoom_speed, 20.0, 100.0);
    }

    if (io_key_down("KeyE")) {
        camera.scale = clamp(camera.scale + camera.zoom_speed, 20.0, 100.0);
    }

    camera.position = vec2_lerp1(camera.position, editor.target, 0.05);
}

export function editor_rend_grid(editor: editor_t): void {
    grid_rend_render(grid_rdata, editor.camera);
}

export function editor_update_box_ch(box_ch: collapsing_header_t|null): void {
    if (!box_ch) {
        return;
    }

    gui_update(box_ch);
}

export function editor_rend_selection(editor: editor_t): void {
    const camera = editor.camera;

    editor_compute_bound(editor);
    obb_rdata_instance(obb_rdata, 0, editor.select_pos, editor.select_size, 0, 0, vec4(editor.select_color[0], editor.select_color[1], editor.select_color[2], 10), editor.select_color, editor.select_width);
    obb_rdata_instance(obb_rdata, 1, editor.bound_pos, editor.bound_size, 0, 0, vec4(editor.select_color[0], editor.select_color[1], editor.select_color[2], 10), editor.select_color, editor.select_width);
    obb_rend_render(obb_rdata, camera);

    if (editor.select_boxes.length) {
        const x = editor.bound_pos[0];
        const y = editor.bound_pos[1];
        const x0 = editor.bound_size[0] / 2.0;
        const x1 = editor.bound_size[0] / 2.0 + editor.arrow_len;
        const y0 = editor.bound_size[1] / 2.0;
        const y1 = editor.bound_size[1] / 2.0 + editor.arrow_len

        // arrows
        line_rdata_instance(line_rdata, 0, vec2(x - x0, y), editor.arrow_width, 1, 0, editor.arrow_color);
        line_rdata_instance(line_rdata, 1, vec2(x - x1, y), editor.arrow_width, 0, 0, editor.arrow_color);
    
        line_rdata_instance(line_rdata, 2, vec2(x + x0, y), editor.arrow_width, 1, 0, editor.arrow_color);
        line_rdata_instance(line_rdata, 3, vec2(x + x1, y), editor.arrow_width, 0, 0, editor.arrow_color);

        line_rdata_instance(line_rdata, 4, vec2(x, y - y0), editor.arrow_width, 1, 0, editor.arrow_color);
        line_rdata_instance(line_rdata, 5, vec2(x, y - y1), editor.arrow_width, 0, 0, editor.arrow_color);
    
        line_rdata_instance(line_rdata, 6, vec2(x, y + y0), editor.arrow_width, 1, 0, editor.arrow_color);
        line_rdata_instance(line_rdata, 7, vec2(x, y + y1), editor.arrow_width, 0, 0, editor.arrow_color);

        // points
        point_rdata_instance(point_rdata, 0, vec2(x - x0, y), editor.point_radius, 0, editor.point_color);
        point_rdata_instance(point_rdata, 1, vec2(x + x0, y), editor.point_radius, 0, editor.point_color);

        point_rdata_instance(point_rdata, 2, vec2(x, y - y0), editor.point_radius, 0, editor.point_color);
        point_rdata_instance(point_rdata, 3, vec2(x, y + y0), editor.point_radius, 0, editor.point_color);

        point_rdata_instance(point_rdata, 4, vec2(x - x0, y - y0), editor.point_radius, 0, editor.point_color);
        point_rdata_instance(point_rdata, 5, vec2(x + x0, y - y0), editor.point_radius, 0, editor.point_color);

        point_rdata_instance(point_rdata, 6, vec2(x + x0, y + y0), editor.point_radius, 0, editor.point_color);
        point_rdata_instance(point_rdata, 7, vec2(x - x0, y + y0), editor.point_radius, 0, editor.point_color);

        line_rend_render(line_rdata, camera);
        point_rend_render(point_rdata, camera);
    }
}

export function editor_load_box_ch(box_ch: collapsing_header_t, select_boxes: box_t[]): void {
    box_ch.children = [];

    if (select_boxes.length === 1) {
        const box = select_boxes[0];

        const transform = box.transform;
        const geometry = box.geometry;
        const body = box.body;
        const style = box.style;
        const animation = box.animation;

        // general
        gui_text(box_ch, "General:");
        gui_select(box_ch, "Type", gs_object(box, "type"), get_enum_keys(BOX_TYPE), get_enum_values(BOX_TYPE));

        // transform
        gui_text(box_ch, "Transform:");
        gui_input_vec(box_ch, "Position", transform.position, 0.5, -1000.0, 1000.0, 2);
        gui_slider_number(box_ch, "Rotation", gs_object(transform, "rotation"), 90, 0, 270);
        gui_input_vec(box_ch, "Scaling", transform.scaling, 0.5, -1000.0, 1000.0, 2);

        // geometry
        gui_text(box_ch, "Geometry:");
        gui_select(box_ch, "Type", gs_object(geometry, "type"), get_enum_keys(GEOMETRY_TYPE), get_enum_values(GEOMETRY_TYPE));
        gui_input_vec(box_ch, "Size", geometry.size, 0.5, -1000.0, 1000.0, 2);
        gui_input_number(box_ch, "Radius", gs_object(geometry, "radius"), 0.1, 0.0, 1000.0);
        
        // body
        gui_text(box_ch, "Body:");
        gui_input_number(box_ch, "Mass", gs_object(body, "mass"), 0.1, 0.0, 1000.0);
        gui_input_vec(box_ch, "Force", body.force, 0.1, -10000.0, 10000.0, 2);
        gui_input_vec(box_ch, "Acceleration", body.acceleration, 0.1, -10000.0, 10000.0, 2);
        gui_input_vec(box_ch, "Velocity", body.velocity, 0.1, -10000.0, 10000.0, 2);
        gui_slider_number(box_ch, "Damping", gs_object(body, "damping"), 0.01, 0.0, 1.0);
        gui_slider_number(box_ch, "Friction", gs_object(body, "friction"), 0.01, 0.0, 1.0);
        gui_slider_number(box_ch, "Restitution", gs_object(body, "restitution"), 0.01, 0.0, 1.0);
        gui_bool(box_ch, "Dynamic Flag", gs_object(body, "dynamic_flag"));
        gui_bool(box_ch, "Collision Flag", gs_object(body, "collision_flag"));

        // style
        gui_text(box_ch, "Style:");
        gui_input_number(box_ch, "Zindex", gs_object(style, "zindex"), 1.0, -100.0, 100.0);
        gui_color_edit(box_ch, "Inner Color", COLOR_MODE.R_0_255, style.inner_color);
        gui_color_edit(box_ch, "Outer Color", COLOR_MODE.R_0_255, style.outer_color);
        gui_select(box_ch, "Mask", gs_object(style.option, "0"), get_enum_keys(OPT_MASK), get_enum_values(OPT_MASK));
        gui_select(box_ch, "Border", gs_object(style.option, "1"), get_enum_keys(OPT_BORDER), get_enum_values(OPT_BORDER));
        gui_select(box_ch, "Texture", gs_object(style.option, "2"), get_enum_keys(OPT_TEXTURE), get_enum_values(OPT_TEXTURE));
        gui_input_vec(box_ch, "Params", style.params, 0.1, -10000.0, 10000.0, 3);

        // animation
        if (animation) {
            gui_text(box_ch, "Animation:");
            gui_input_vec(box_ch, "Start", animation.start, 0.5, -1000.0, 1000.0, 2);
            gui_input_vec(box_ch, "End", animation.end, 0.5, -1000.0, 1000.0, 2);
            gui_input_number(box_ch, "Force", gs_object(animation, "force"), 0.1, 0.0, 10000.0);
            gui_slider_number(box_ch, "Animation", gs_object(animation, "dir"), 0.0, -1.0, 1.0);
            gui_bool(box_ch, "Looping Flag", gs_object(animation, "looping_flag"));
        }

        // other
        gui_bool(box_ch, "Platform Flag", gs_object(box, "platform_flag"));
        gui_bool(box_ch, "Death Flag", gs_object(box, "death_flag"));
    }

    gui_reload_component(box_ch);
}

export function editor_save_level(level: level_t) {
    store_add_level(level.name)
    store_set_level(level_serialize(level));
}

export function editor_load_level_ch(editor: editor_t, level_ch: collapsing_header_t|null): void {
    if (!level_ch) {
        return;
    }

    level_ch.children = [];
    gui_input_text(level_ch, "Name", gs_object(editor.level, "name"));
    gui_color_edit(level_ch, "Background Lower Color", COLOR_MODE.R_0_1, editor.level.bg_lower_color);
    gui_color_edit(level_ch, "Background Upper Color", COLOR_MODE.R_0_1, editor.level.bg_upper_color);
    gui_reload_component(level_ch);
}

export function editor_gui_window(editor: editor_t, window: window_t): void {
    const level = editor.level;

    const editor_ch = gui_collapsing_header(window, "Editor", false);

    const levels = store_get_levels();
    const levels_keys = Object.values(levels);
    const levels_values = Object.keys(levels).map(v => parseInt(v));
    gui_select(editor_ch, "Levels", gs_object(editor, "load_level"), levels_keys, levels_values);

    gui_button(editor_ch, "Load Level", function() {
        const level_key = levels[editor.load_level];
        const level = store_get_level(level_key);

        if (level) {
            console.log(JSON.stringify(level));
            level_deserialize(editor.level, level);
            editor.on_level_load();
        }
    });

    gui_button(editor_ch, "Save Level", function() {
        editor_save_level(level);
    })

    gui_button(editor_ch, "Sort Zindex", function() {
        level.boxes.sort((a, b) => a.style.zindex - b.style.zindex);
    });

    gui_select(editor_ch, "Preset", gs_object(editor, "preset"), get_enum_keys(BOX_PRESET), get_enum_values(BOX_PRESET));
    gui_button(editor_ch, "Add", function() {
        const level = editor.level;

        switch (editor.preset) {
            case BOX_PRESET.GROUND:
                level_add_box(level, box_ground(vec2(), vec2(1.0)));

                break;
            case BOX_PRESET.BRICK:
                level_add_box(level, box_brick(vec2(), vec2(1.0)));

                break;
            case BOX_PRESET.SPIKES:
                level_add_box(level, box_spikes(vec2(), vec2(1.0)));

                break;
            case BOX_PRESET.MOVER:
                level_add_box(level, box_mover(vec2(1.0), vec2(), vec2(), 0.0, 0.0));

                break;
            case BOX_PRESET.START_ZONE:
                level_add_box(level, box_start_zone(vec2(), vec2(1.0)));

                break;
            case BOX_PRESET.END_ZONE:
                level_add_box(level, box_end_zone(vec2(), vec2(1.0)));

                break;
        }
    });

    const level_ch = gui_collapsing_header(window, "Level", false);
    editor_load_level_ch(editor, level_ch);

    const box_ch = gui_collapsing_header(window, "Box", false);
    editor.box_ch = box_ch;

    editor.on_select = function(select_boxes: box_t[]): void {
        editor_load_box_ch(box_ch, select_boxes);
    }

    editor.on_copy = function(copy_boxes: box_t[]): void {
        editor_load_box_ch(box_ch, copy_boxes);
    }

    editor.on_level_load = function() {
        editor_load_level_ch(editor, level_ch);
    }
}
