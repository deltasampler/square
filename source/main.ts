import {gui_window, gui_canvas, gui_render, gui_window_grid, unit, UT, gui_window_layout, gui_collapsing_header, gs_object, gui_select, gui_button} from "@gui/gui.ts";
import {io_init, io_kb_key_down, io_key_down, io_m_button_down, io_m_button_up, io_m_move, kb_event_t, m_event_t} from "@engine/io.ts";
import {LEVELS} from "./levels.ts";
import {gl_init} from "@engine/gl.ts";
import {cam2_compute_proj, cam2_compute_view, cam2_new} from "@cl/cam2.ts";
import {grid_rdata_new, grid_rend_render} from "@engine/grid_rend.ts";
import {vec2, vec2_add2, vec2_addmuls2, vec2_clamp2, vec2_clone, vec2_copy, vec2_dir1, vec2_dot, vec2_lerp1, vec2_muls1, vec2_muls2, vec2_sub1} from "@cl/vec2.ts";
import {rgb} from "@cl/vec3.ts";
import {box_rdata_build, box_rdata_instance, box_rdata_new, box_rend_build, box_rend_init, box_rend_render} from "@engine/box_rend.ts";
import {rend_player_init, rend_player_render} from "./rend_player.ts";
import {deg90odd, min, rad} from "@cl/math.ts";
import {mtv_raabb_raabb2, overlap_raabb_raabb2, overlap_raabb_raabb2_x} from "@cl/collision2.ts";
import {body_integrate} from "./phys.ts";
import {bg_rdata_new, bg_rend_init, bg_rend_render} from "@engine/bg_rend.ts";
import {box_t, BOX_TYPE, level_dedup, level_from_json, level_sort, player_new} from "./entities.ts";
import {editor_camera, editor_camera_controls, editor_flag, editor_kb_key_down, editor_m_button_down, editor_m_button_up, editor_m_move, editor_rend_init, editor_rend_selection, get_editor_flag, switch_editor_flag} from "./editor.ts";

const canvas_el = document.createElement("canvas");
const gl = gl_init(canvas_el);

const game_camera = cam2_new();
game_camera.movement_speed = 0.3;
game_camera.zoom_speed = 0.3;

let camera = game_camera;

let level = level_from_json(LEVELS[0]);
const player = player_new(vec2_clone(level.start_zone.body.position), vec2(1.0), 10.0);
const clear_color = rgb(129, 193, 204);
const grid = grid_rdata_new(vec2(), vec2(1024.0), vec2(1.0), 0.01, rgb(255, 255, 250));
const background = bg_rdata_new(rgb(30, 116, 214), rgb(124, 198, 228));

const box_rdata = box_rdata_new();
box_rdata_build(box_rdata, level.boxes.length);

io_init();

const target = vec2();
editor_rend_init();

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

// physics
let boxes = level.boxes;
let static_boxes: box_t[] = [];
let dynamic_boxes: box_t[] = [];
let kinematic_boxes: box_t[] = [];
let player_body = player.body;

function categorize_boxes() {
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
}

categorize_boxes();

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

bg_rend_init();
box_rend_init();
box_rend_build(box_rdata);
rend_player_init();

gl.enable(gl.BLEND)
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.enable(gl.CULL_FACE);

// input events
io_m_move(function(event: m_event_t): void {
    if (event.target !== canvas_el) {
        return;
    }

    editor_m_move(event, camera, canvas_el.width, canvas_el.height);
});

io_m_button_down(function(event: m_event_t): void {
    if (event.target !== canvas_el) {
        return;
    }

    editor_m_button_down(event, camera, canvas_el.width, canvas_el.height);
});

io_m_button_up(function(event: m_event_t): void {
    if (event.target !== canvas_el) {
        return;
    }

    editor_m_button_up(event, boxes);
});

io_kb_key_down(function(event: kb_event_t): void {
    if (event.code === "Backquote") {
        switch_editor_flag();

        if (get_editor_flag()) {
            camera = editor_camera;
        } else {
            camera = game_camera;
        }
    }

    if (editor_flag) {
        editor_kb_key_down(event, level, box_rdata);

        return;
    }

    if (event.code === "KeyR") {
        vec2_copy(player_body.position, level.start_zone.body.position);
    }
});

function update(): void {
    if (editor_flag) {
        camera.position = vec2_lerp1(camera.position, target, 0.05);
    } else {
        camera.position = vec2_lerp1(camera.position, player_body.position, 0.05);
    }

    cam2_compute_proj(camera, canvas_el.width, canvas_el.height);
    cam2_compute_view(camera);

    // apply gravity force to player
    vec2_add2(player_body.force, vec2(0.0, -2000.0));

    if (editor_flag) {
        editor_camera_controls(camera, target);
    } else {
        // apply control forces to player
        const force = player_body.contact ? 3000.0 : 1500.0;

        if (io_key_down("KeyA")) {
            vec2_add2(player_body.force, vec2(-force, 0.0));
        }

        if (io_key_down("KeyD")) {
            vec2_add2(player_body.force, vec2(force, 0.0));
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
        vec2_muls2(player_body.vel, 0.95);
    }

    // player motion
    for (const box of boxes) {
        const body = box.body;
        const result = mtv_raabb_raabb2(player_body.position, player_body.size, deg90odd(player_body.rotation), body.position, body.size, deg90odd(body.rotation));

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
        if (!overlap_raabb_raabb2(player_body.position, player_body.size, false, level.start_zone.body.position, level.start_zone.body.size, deg90odd(level.start_zone.body.rotation))) {
            is_in_start_zone = false;
            is_timer_running = true;
        }
    }

    if (player_body.contact) {
        if (!overlap_raabb_raabb2_x(player_body.position, player_body.size, false, player_body.contact.position, player_body.contact.size, deg90odd(player_body.contact.rotation))) {
            player_body.contact = null;
        }
    }

    // itegration
    body_integrate(player_body, delta_time);

    for (const box of dynamic_boxes) {
        body_integrate(box.body, delta_time);
    }
}

function render(): void {
    gl.viewport(0, 0, canvas_el.width, canvas_el.height);
    gl.clearColor(clear_color[0], clear_color[1], clear_color[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    bg_rend_render(background, camera, time);

    if (editor_flag) {
        grid_rend_render(grid, camera);
    }

    for (let i = 0; i < boxes.length; ++i) {
        const box = boxes[i];
        const body = box.body;

        box_rdata_instance(
            box_rdata,
            i,
            body.position,
            body.size,
            rad(body.rotation),
            box.zindex,
            box.inner_color,
            box.outer_color,
            box.option,
            box.params
        )
    }

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

// test
// const root = gui_window(null);
// const canvas = gui_canvas(root);
// canvas.canvas_el = canvas_el;

// gui_render(root, document.body);

// gui
const root = gui_window(null);
gui_window_grid(
    root,
    [unit(300, UT.PX), unit(1, UT.FR), unit(300, UT.PX)],
    [unit(1, UT.FR), unit(1, UT.FR), unit(1, UT.FR)]
);

const left = gui_window(root);
const right = gui_window(root);
gui_window_layout(
    root,
    [
        left, right, right,
        left, right, right,
        left, right, right
    ]
);

const level_ch = gui_collapsing_header(left, "Level", false);

const config = {
    level: 0
};

gui_select(level_ch, "Levels", gs_object(config, "level"), Object.keys(LEVELS), Object.keys(LEVELS).map(l => parseInt(l)), function(): void {
    level = level_from_json(LEVELS[config.level]);
    boxes = level.boxes;
    box_rdata_build(box_rdata, level.boxes.length);
    box_rend_build(box_rdata);
    categorize_boxes();
});

gui_button(level_ch, "Deduplicate Boxes", function(): void {
    level_dedup(level);
});

gui_button(level_ch, "Sort Boxes By Zindex", function(): void {
    level_sort(level);
});

const box_ch = gui_collapsing_header(left, "Box", false);

// function load_box_ch(): void {
//     box_ch.children = [];

//     if (select_boxes.length == 1) {
//         const box = select_boxes[0];
//         const body = box.body;

//         // box
//         gui_select(box_ch, "Type", gs_object(box, "type"), get_enum_keys(BOX_TYPE), get_enum_values(BOX_TYPE));
//         gui_color_edit(box_ch, "Inner Color", COLOR_MODE.R_0_255, box.inner_color);
//         gui_color_edit(box_ch, "Outer Color", COLOR_MODE.R_0_255, box.outer_color);
//         gui_bool(box_ch, "Is Death", gs_object(box, "is_death"));
//         gui_bool(box_ch, "Is Platform", gs_object(box, "is_platform"));
//         gui_select(box_ch, "Mask", gs_object(box.option, "0"), get_enum_keys(OPT_MASK), get_enum_values(OPT_MASK));
//         gui_select(box_ch, "Border", gs_object(box.option, "1"), get_enum_keys(OPT_BORDER), get_enum_values(OPT_BORDER));
//         gui_select(box_ch, "Texture", gs_object(box.option, "2"), get_enum_keys(OPT_TEXTURE), get_enum_values(OPT_TEXTURE));
//         gui_input_vec(box_ch, "Params", box.params, 0.1, -10000.0, 10000.0, 3);

//         // body
//         gui_text(box_ch, "Body");
//         gui_input_vec(box_ch, "Position", body.position, 0.5, -10000.0, 10000.0, 2);
//         gui_input_vec(box_ch, "Size", body.size, 0.5, -10000.0, 10000.0, 2);
//         gui_input_number(box_ch, "Zindex", gs_object(box, "zindex"), 1.0, -100.0, 100.0);
//         gui_slider_number(box_ch, "Rotation", gs_object(body, "rotation"), 90, 0, 270);
//         gui_input_number(box_ch, "Mass", gs_object(body, "mass_inv"), 0.1, 0.0, 1000.0, function(value: number) {
//             body.mass_inv = 1 / value;
//         });
//         gui_input_vec(box_ch, "Force", body.force, 0.1, -10000.0, 10000.0, 2);
//         gui_input_vec(box_ch, "Acceleration", body.acc, 0.1, -10000.0, 10000.0, 2);
//         gui_input_vec(box_ch, "Velocity", body.vel, 0.1, -10000.0, 10000.0, 2);
//         gui_slider_number(box_ch, "Friction", gs_object(body, "friction"), 0.01, 0.0, 1.0);
//         gui_slider_number(box_ch, "Damping", gs_object(body, "damping"), 0.01, 0.0, 1.0);
//         gui_slider_number(box_ch, "Restitution", gs_object(body, "restitution"), 0.01, 0.0, 1.0);
//         gui_bool(box_ch, "Is Dynamic", gs_object(body, "is_dynamic"));
//         gui_bool(box_ch, "Can Collide", gs_object(body, "can_collide"));
//     }

//     gui_reload_component(box_ch);
// }

const canvas = gui_canvas(right);
canvas.canvas_el = canvas_el;

gui_render(root, document.body);
