import {gui_window, gui_canvas, gui_render} from "@gui/gui.ts";
import {io_init, io_kb_key_down, io_key_down, io_m_button_down, io_m_button_up, io_m_move, kb_event_t, m_event_t} from "@engine/io.ts";
import {level_2} from "./levels.ts";
import {gl_init} from "@engine/gl.ts";
import {cam2_compute_proj, cam2_compute_view, cam2_new, cam2_proj_mouse, cam2_t} from "@cl/cam2.ts";
import {grid_rdata_new, grid_rend_init, grid_rend_render} from "@engine/grid_rend.ts";
import {vec2, vec2_abs, vec2_add1, vec2_add2, vec2_addmuls2, vec2_clamp2, vec2_clone, vec2_copy, vec2_dir1, vec2_divs1, vec2_dot, vec2_lerp1, vec2_mul1, vec2_mul2, vec2_muls1, vec2_muls2, vec2_set, vec2_snap, vec2_sub1, vec2_zero} from "@cl/vec2.ts";
import {rgb} from "@cl/vec3.ts";
import {box_rdata_build, box_rdata_instance, box_rdata_new, box_rdata_t, box_rend_build, box_rend_init, box_rend_render} from "@engine/box_rend.ts";
import {rend_player_init, rend_player_render} from "./rend_player.ts";
import {min} from "@cl/math.ts";
import {mtv_aabb2_aabb2, overlap_aabb2_aabb2, overlap_aabb2_aabb2_x, point_inside_aabb, point_inside_circle} from "@cl/collision2.ts";
import {body_integrate} from "./phys.ts";
import {load_level} from "./world.ts";
import {bg_rdata_new, bg_rend_init, bg_rend_render} from "@engine/bg_rend.ts";
import {box_clone, box_t, BOX_TYPE, player_new} from "./entities.ts";
import {point_rdata_build, point_rdata_instance, point_rdata_new, point_rend_build, point_rend_init, point_rend_render} from "@engine/point_rend.ts";
import { vec4 } from "@cl/vec4.ts";
import {LINE_CAP_TYPE, LINE_JOIN_TYPE, line_rdata_build, line_rdata_instance, line_rdata_new, line_rend_build, line_rend_init, line_rend_render} from "@engine/line_rend.ts";
import {obb_rdata_build, obb_rdata_instance, obb_rdata_new, obb_rend_build, obb_rend_init, obb_rend_render} from "@engine/obb_rend.ts";

const root = gui_window(null);
const canvas = gui_canvas(root);

const timer_el = document.createElement("div");
timer_el.className = "timer";
timer_el.style.width = "100vw";
timer_el.style.height = "100vh";
timer_el.style.position = "absolute";
timer_el.style.left = "0";
timer_el.style.top = "0";
timer_el.style.zIndex = "1";
timer_el.style.fontSize = "48px";
timer_el.style.color = "#ffffff";
timer_el.style.lineHeight = "1.5";
timer_el.style.textAlign = "center";
timer_el.style.fontFamily = "monospace";
timer_el.style.pointerEvents = "none";
timer_el.innerHTML = "0:00.000";
document.body.append(timer_el);

gui_render(root, document.body);

const canvas_el = canvas.canvas_el;
const gl = gl_init(canvas_el);

const level = load_level(level_2);
const player = player_new(vec2_clone(level.spawn_point), vec2(1.0), 10.0);
const clear_color = rgb(129, 193, 204);
const camera = cam2_new();
camera.movement_speed = 0.3;
camera.zoom_speed = 0.3;
const grid = grid_rdata_new(vec2(), vec2(1024.0), vec2(1.0), 0.01, rgb(255, 255, 250));
const background = bg_rdata_new(rgb(30, 116, 214), rgb(124, 198, 228));

const box_rdata = box_rdata_new();
box_rdata_build(box_rdata, level.boxes.length);

io_init();

const target = vec2();
let is_freecam = true;

// editor
enum EDITOR_MODE {
    SELECT,
    TRANSLATE,
    SCALE,
    TRANSFORM
};

let editor_mode = EDITOR_MODE.SELECT;
const select_outline = 0.15;
const select_col = vec4(36, 71, 242, 255);
const point_rad = 0.15;
const point_col = vec4(43, 237, 156, 255);
const arrow_len = 1.5;
const arrow_width = 0.15;
const arrow_col = vec4(250, 83, 45, 255);

let drag_flag = false;
const drag_pos = vec2();
const drag_dir = vec2();

let select_flag = false;
const select_start = vec2();
const select_end = vec2();
const select_pos = vec2();
const select_size = vec2();
const bound_min = vec2();
const bound_max = vec2();
const bound_pos = vec2();
const bound_size = vec2();
let select_boxes: box_t[] = [];

let box_flag = false;

let arrow_left_flag = false;
let arrow_right_flag = false;
let arrow_down_flag = false;
let arrow_up_flag = false;
let arrow_flag = false

let point_ld_flag = false;
let point_rd_flag = false;
let point_lu_flag = false;
let point_ru_flag = false;
let point_flag = false

let copy_boxes: box_t[] = [];

const mouse_pos = vec2();

function compute_select() {
    vec2_copy(select_pos, vec2_lerp1(select_start, select_end, 0.5));
    vec2_copy(select_size, vec2_abs(vec2_sub1(select_end, select_start)));
}

function find_selected_boxes() {
    for (const box of boxes) {
        const body = box.body;

        if (overlap_aabb2_aabb2(select_pos, select_size, body.position, body.size)) {
            if (select_boxes.indexOf(box) < 0) {
                box.option[3] = 1;
                select_boxes.push(box);
            }
        }
    }
}

function clear_selected_boxes() {
    if (select_boxes.length) {
        for (const box of select_boxes) {
            box.option[3] = 0;
        }

        select_boxes = [];
    }
}

function compute_bound() {
    if (!select_boxes.length) {
        vec2_zero(bound_pos);
        vec2_zero(bound_size);

        return;
    }

    let minx = Infinity;
    let maxx = -Infinity;
    let miny = Infinity;
    let maxy = -Infinity;

    for (const box of select_boxes) {
        const body = box.body;

        minx = Math.min(minx, body.position[0] - body.size[0] / 2.0);
        maxx = Math.max(maxx, body.position[0] + body.size[0] / 2.0);
        miny = Math.min(miny, body.position[1] - body.size[1] / 2.0);
        maxy = Math.max(maxy, body.position[1] + body.size[1] / 2.0);
    }

    vec2_set(bound_min, minx, miny);
    vec2_set(bound_max, maxx, maxy);
    vec2_set(bound_pos, (minx + maxx) / 2.0, (miny + maxy) / 2.0);
    vec2_set(bound_size, maxx - minx, maxy - miny);
}

io_m_move(function(event: m_event_t): void {
    vec2_set(mouse_pos, event.x, event.y);

    const point = cam2_proj_mouse(camera, mouse_pos, canvas_el.width, canvas_el.height);

    if (editor_mode === EDITOR_MODE.SELECT) {
        if (!select_flag) {
            vec2_copy(select_start, point);
        }

        vec2_copy(select_end, point);
        compute_select();
    } else if (editor_mode === EDITOR_MODE.TRANSFORM) {
        if (drag_flag) {
            const diff = vec2(0, 0);

            if (drag_dir[1] == 0) {
                vec2_set(diff, point[0] - drag_pos[0], 0);
            } else {
                vec2_set(diff, 0, point[1] - drag_pos[1]);
            }

            for (const box of select_boxes) {
                const body = box.body;

                if (point_flag) {
                    const diff = vec2(point[0] - drag_pos[0], point[1] - drag_pos[1]);
                    const diff2 = vec2_mul1(diff, drag_dir);

                    if (event.shift) {
                        vec2_copy(body.size, vec2_add1(box.drag_size, vec2_muls1(diff2, 2.0)));
                        vec2_snap(body.size, vec2(1.0), body.size);
                    } else {
                        vec2_copy(body.size, vec2_add1(box.drag_size, diff2));
                        vec2_snap(body.size, vec2(0.5), body.size);

                        const diff4 = vec2_mul2(vec2_sub1(body.size, box.drag_size), drag_dir);
                        vec2_copy(body.position, vec2_add1(box.drag_pos, vec2_divs1(diff4, 2.0)));
                    }
                } else if (arrow_flag) {
                    vec2_copy(body.position, vec2_add1(box.drag_pos, diff));
                    vec2_snap(body.position, vec2(0.5), body.position);
                } else if (box_flag) {
                    const diff = vec2(point[0] - drag_pos[0], point[1] - drag_pos[1]);
                    vec2_copy(body.position, vec2_add1(box.drag_pos, diff));
                    vec2_snap(body.position, vec2(0.5), body.position);
                }

                compute_bound();
            }
        }
    }
});

io_m_button_down(function(event: m_event_t): void {
    vec2_set(mouse_pos, event.x, event.y);

    const point = cam2_proj_mouse(camera, mouse_pos, canvas_el.width, canvas_el.height);

    if (editor_mode === EDITOR_MODE.SELECT) {
        select_flag = true;
        vec2_copy(select_start, point);
        compute_select();

        if (!event.ctrl) {
            clear_selected_boxes();
            compute_bound();
        }
    } else if (editor_mode === EDITOR_MODE.TRANSFORM) {
        // drag
        const x = bound_pos[0];
        const y = bound_pos[1];
        const x0 = bound_size[0] / 2.0;
        const y0 = bound_size[1] / 2.0;
        const x1 = bound_size[0] / 2.0 + arrow_len / 2.0;
        const y1 = bound_size[1] / 2.0 + arrow_len / 2.0;

        box_flag = point_inside_aabb(bound_pos, bound_size, point);

        const point_left_flag = point_inside_circle(vec2(x - x0, y), point_rad * 2.0, point);
        const point_right_flag = point_inside_circle(vec2(x + x0, y), point_rad * 2.0, point);
        const point_down_flag = point_inside_circle(vec2(x, y - y0), point_rad * 2.0, point);
        const point_up_flag = point_inside_circle(vec2(x, y + y0), point_rad * 2.0, point);

        point_ld_flag = point_inside_circle(vec2(x - x0, y - y0), point_rad * 2.0, point);
        point_rd_flag = point_inside_circle(vec2(x + x0, y - y0), point_rad * 2.0, point);
        point_lu_flag = point_inside_circle(vec2(x - x0, y + y0), point_rad * 2.0, point);
        point_ru_flag = point_inside_circle(vec2(x + x0, y + y0), point_rad * 2.0, point);
        point_flag = point_left_flag || point_right_flag || point_down_flag || point_up_flag || point_ld_flag || point_rd_flag || point_lu_flag || point_ru_flag;

        arrow_left_flag = point_inside_aabb(vec2(x - x1, y), vec2(arrow_len, arrow_width * 4.0), point);
        arrow_right_flag = point_inside_aabb(vec2(x + x1, y), vec2(arrow_len, arrow_width * 4.0), point);
        arrow_down_flag = point_inside_aabb(vec2(x, y - y1), vec2(arrow_width * 4.0, arrow_len), point);
        arrow_up_flag = point_inside_aabb(vec2(x, y + y1), vec2(arrow_width * 4.0, arrow_len), point);
        arrow_flag = arrow_left_flag || arrow_right_flag || arrow_down_flag || arrow_up_flag;

        drag_flag = box_flag || point_flag || arrow_flag;

        vec2_copy(drag_pos, point);

        if (point_flag) {
            if (point_left_flag || point_right_flag || point_down_flag || point_up_flag) {
                drag_dir[0] = point_left_flag ? -1 : (point_right_flag ? 1 : 0);
                drag_dir[1] = point_down_flag ? -1 : (point_up_flag ? 1 : 0);

                if (point_left_flag || point_right_flag) {
                    drag_dir[1] = 0;
                } else {
                    drag_dir[0] = 0;
                }
            } else {
                const left = point_ld_flag || point_lu_flag;
                const right = point_rd_flag || point_ru_flag;
                const down = point_ld_flag || point_rd_flag;
                const up = point_lu_flag || point_ru_flag;

                drag_dir[0] = left ? -1 : (right ? 1 : 0);
                drag_dir[1] = down ? -1 : (up ? 1 : 0);
            }
        } else if (arrow_flag) {
            drag_dir[0] = arrow_left_flag ? -1 : (arrow_right_flag ? 1 : 0);
            drag_dir[1] = arrow_down_flag ? -1 : (arrow_up_flag ? 1 : 0);
        }

        for (const box of select_boxes) {
            const body = box.body;

            box.drag_pos = vec2_clone(body.position);
            box.drag_size = vec2_clone(body.size);
        }
    }
});

io_m_button_up(function(event: m_event_t): void {
    vec2_set(mouse_pos, event.x, event.y);

    if (editor_mode === EDITOR_MODE.SELECT) {
        select_flag = false;
        compute_select();
        find_selected_boxes();
        compute_bound();
    } else if (editor_mode === EDITOR_MODE.TRANSFORM) {
        drag_flag = false;
    }
});

function editor_rend_selection(camera: cam2_t): void {
    obb_rdata_instance(obb_rdata, 0, select_pos, select_size, 0, vec4(select_col[0], select_col[1], select_col[2], 10), select_col, select_outline);
    obb_rdata_instance(obb_rdata, 1, bound_pos, bound_size, 0, vec4(select_col[0], select_col[1], select_col[2], 10), select_col, select_outline);
    obb_rend_render(obb_rdata, camera);

    if (select_boxes.length && editor_mode === EDITOR_MODE.TRANSFORM) {
        const x = bound_pos[0];
        const y = bound_pos[1];
        const x0 = bound_size[0] / 2.0;
        const x1 = bound_size[0] / 2.0 + arrow_len;
        const y0 = bound_size[1] / 2.0;
        const y1 = bound_size[1] / 2.0 + arrow_len

        // arrows
        line_rdata_instance(line_rdata, 0, vec2(x - x0, y), arrow_width, 1, arrow_col);
        line_rdata_instance(line_rdata, 1, vec2(x - x1, y), arrow_width, 0, arrow_col);
    
        line_rdata_instance(line_rdata, 2, vec2(x + x0, y), arrow_width, 1, arrow_col);
        line_rdata_instance(line_rdata, 3, vec2(x + x1, y), arrow_width, 0, arrow_col);
    
        line_rdata_instance(line_rdata, 4, vec2(x, y - y0), arrow_width, 1, arrow_col);
        line_rdata_instance(line_rdata, 5, vec2(x, y - y1), arrow_width, 0, arrow_col);
    
        line_rdata_instance(line_rdata, 6, vec2(x, y + y0), arrow_width, 1, arrow_col);
        line_rdata_instance(line_rdata, 7, vec2(x, y + y1), arrow_width, 0, arrow_col);

        // points
        point_rdata_instance(point_rdata, 0, vec2(x - x0, y), point_rad, point_col);
        point_rdata_instance(point_rdata, 1, vec2(x + x0, y), point_rad, point_col);

        point_rdata_instance(point_rdata, 2, vec2(x, y - y0), point_rad, point_col);
        point_rdata_instance(point_rdata, 3, vec2(x, y + y0), point_rad, point_col);

        point_rdata_instance(point_rdata, 4, vec2(x - x0, y - y0), point_rad, point_col);
        point_rdata_instance(point_rdata, 5, vec2(x + x0, y - y0), point_rad, point_col);

        point_rdata_instance(point_rdata, 6, vec2(x + x0, y + y0), point_rad, point_col);
        point_rdata_instance(point_rdata, 7, vec2(x - x0, y + y0), point_rad, point_col);

        line_rend_render(line_rdata, camera);
        point_rend_render(point_rdata, camera);
    }
}

io_kb_key_down(function(event: kb_event_t): void {
    if (event.code === "KeyR") {
        vec2_copy(player_body.position, level.spawn_point);
    }

    if (event.code === "Backquote") {
        is_freecam = !is_freecam;
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

        console.log(copy_boxes);
    }

    if (event.code === "KeyV" && event.ctrl && copy_boxes.length) {
        if (box_rdata.size < box_rdata.size + copy_boxes.length) {
            box_rdata_build(box_rdata, box_rdata.size + copy_boxes.length);
            box_rend_build(box_rdata);
        }

        for (const box of select_boxes) {
            box.option[3] = 0;
        }

        boxes.push(...copy_boxes);

        select_boxes = [...copy_boxes];
        copy_boxes = [];
    }
});

// physics
const boxes = level.boxes;
const static_boxes: box_t[] = [];
const dynamic_boxes: box_t[] = [];
const kinematic_boxes: box_t[] = [];
const player_body = player.body;

for (const box of boxes) {
    const body = box.body;

    if (body.is_dynamic) {
        dynamic_boxes.push(box);
    } else {
        static_boxes.push(box)
    }

    if (box.animation) {
        kinematic_boxes.push(box);
    }
}

let delta_time = 0;
let time = 0;
let last_time = 0;

let is_in_start_zone = false;
let timer = 0.0;
let is_timer_running = false;

function format_time(s: number): string {
    let minutes = Math.floor(s / 60);
    let secs = Math.floor(s % 60);
    let milliseconds = Math.round((s % 1) * 1000);

    return (
        String(minutes).padStart(2, '0') + ":" +
        String(secs).padStart(2, '0') + "." +
        String(milliseconds).padStart(3, '0')
    );
}

function update(): void {
    // apply gravity force to player
    vec2_add2(player_body.force, vec2(0.0, -2000.0));

    if (is_freecam) {
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
            camera.scale -= camera.zoom_speed;
        }

        if (io_key_down("KeyE")) {
            camera.scale += camera.zoom_speed;
        }
    } else {
        // apply control forces to player
        if (io_key_down("KeyA")) {
            vec2_add2(player_body.force, vec2(-1500.0, 0.0));
        }

        if (io_key_down("KeyD")) {
            vec2_add2(player_body.force, vec2(1500.0, 0.0));
        }

        // apply jump force to player
        if (io_key_down("Space") && player_body.contact) {
            player_body.vel[1] = 80.0;
            player_body.contact = null;
        }
    }

    // apply force to kinematic bodies
    for (const box of kinematic_boxes) {
        const body = box.body;
        const animation = box.animation!;

        const move_direction = vec2_dir1(animation.end, animation.start);
        const to_current = vec2_sub1(body.position, animation.start);
        const progress = vec2_dot(to_current, move_direction); 
        const total_distance = vec2_dot(vec2_sub1(animation.end, animation.start), move_direction);

        if (progress >= total_distance) {
            animation.dir = -1.0;
        } else if (progress <= 0.0) {
            animation.dir = 1.0;
        }

        vec2_add2(body.force, vec2_muls2(move_direction, animation.force * animation.dir));
    }

    if (player_body.contact) {
        vec2_add2(player_body.force, player_body.contact.force);
    }

    // player motion
    for (const box of boxes) {
        const body = box.body;
        const result = mtv_aabb2_aabb2(player_body.position, player_body.size, body.position, body.size);

        if (!result) {
            continue;
        }

        if (!is_in_start_zone && box.type === BOX_TYPE.START_ZONE) {
            is_in_start_zone = true;
            is_timer_running = false;
            timer = 0.0;
        }

        if (box.type === BOX_TYPE.END_ZONE) {
            is_timer_running = false;
        }

        if (body.can_collide) {
            if (box.is_death) {
                vec2_copy(player_body.position, level.start_zone.body.position);
            }

            if (result.dir[1] > 0.0) {
                player_body.contact = body;
            }

            // resolve velocity
            const relative_velocity = vec2_sub1(player_body.vel, body.vel);
            const normal_velocity = vec2_dot(relative_velocity, result.dir);

            if (normal_velocity < 0) {
                const restitution = 0.1; // min(player_body.restitution, body.restitution);
                const inv_mass1 = player_body.mass_inv;
                const inv_mass2 = body.mass_inv;
                const impulse_magnitude = -(1 + restitution) * normal_velocity / (inv_mass1 + inv_mass2);
                const impulse = vec2_muls1(result.dir, impulse_magnitude);

                vec2_add2(player_body.vel, vec2_muls1(impulse, inv_mass1));
                // vec2_sub2(body.vel, vec2_muls1(impulse, inv_mass2));
            }

            vec2_clamp2(player_body.vel, vec2(-1000.0), vec2(1000.0));

            // resolve interpenetration
            vec2_addmuls2(player_body.position, result.dir, result.depth);
        }
    }

    if (is_in_start_zone) {
        if (!overlap_aabb2_aabb2(player_body.position, player_body.size, level.start_zone.body.position, level.start_zone.body.size)) {
            is_in_start_zone = false;
            is_timer_running = true;
        }
    }

    if (player_body.contact) {
        if (!overlap_aabb2_aabb2_x(player_body.position, player_body.size, player_body.contact.position, player_body.contact.size)) {
            player_body.contact = null;
        }
    }

    // itegration
    body_integrate(player_body, delta_time);

    for (const box of dynamic_boxes) {
        body_integrate(box.body, delta_time);
    }
}

bg_rend_init();
grid_rend_init();
box_rend_init();
box_rend_build(box_rdata);
rend_player_init();

point_rend_init();
const point_count0 = 8;
const point_rdata = point_rdata_new();
point_rdata_build(point_rdata, point_count0);
point_rend_build(point_rdata);

line_rend_init();
const point_count1 = 8;
const line_rdata = line_rdata_new();
line_rdata.cap_type = LINE_CAP_TYPE.ARROW;
line_rdata.join_type = LINE_JOIN_TYPE.NONE;
line_rdata_build(line_rdata, point_count1);
line_rend_build(line_rdata);

obb_rend_init();
const obb_rdata = obb_rdata_new();
obb_rdata_build(obb_rdata, 2);
obb_rdata_instance(obb_rdata, 0, vec2(4, 4), vec2(4, 4), 0, vec4(0, 0, 0, 0), vec4(0, 0, 255, 255), 0.2);
obb_rend_build(obb_rdata);

gl.enable(gl.BLEND)
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.enable(gl.CULL_FACE);

function render(): void {
    for (let i = 0; i < boxes.length; ++i) {
        const box = boxes[i];
        const body = box.body;

        box_rdata_instance(
            box_rdata,
            i,
            body.position,
            body.size,
            box.inner_color,
            box.outer_color,
            box.option,
            box.params
        )
    }


    if (is_freecam) {
        camera.position = vec2_lerp1(camera.position, target, 0.05);
    } else {
        camera.position = vec2_lerp1(camera.position, player_body.position, 0.05);
    }

    cam2_compute_proj(camera, canvas_el.width, canvas_el.height);
    cam2_compute_view(camera);

    gl.viewport(0, 0, canvas_el.width, canvas_el.height);
    gl.clearColor(clear_color[0], clear_color[1], clear_color[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    bg_rend_render(background, camera, time);
    grid_rend_render(grid, camera);

    box_rend_render(box_rdata, camera);
    rend_player_render(player, camera);

    editor_rend_selection(camera);
}

function loop(): void {
    time = performance.now();
    delta_time = min((time - last_time) / 1000.0, 0.1);
    last_time = time;

    if (is_timer_running) {
        timer += delta_time;
    }

    timer_el.innerHTML = format_time(timer);

    update();
    render();

    requestAnimationFrame(loop);
}

loop();
