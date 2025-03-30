import {gui_window, gui_canvas, gui_render} from "@gui/gui.ts";
import {io_init, io_kb_key_down, io_key_down, io_m_move, kb_event_t, m_event_t} from "@engine/io.ts";
import {level_2} from "./levels.ts";
import {gl_init} from "@engine/gl.ts";
import {cam2_compute_proj, cam2_compute_view, cam2_new, cam2_proj_mouse} from "@cl/cam2.ts";
import {grid_rdata_new, grid_rend_init, grid_rend_render} from "@engine/grid_rend.ts";
import {vec2, vec2_add2, vec2_addmuls2, vec2_clamp2, vec2_clone, vec2_copy, vec2_dir1, vec2_dot, vec2_lerp1, vec2_muls1, vec2_muls2, vec2_set, vec2_sub1} from "@cl/vec2.ts";
import {rgb} from "@cl/vec3.ts";
import {box_rdata_build, box_rdata_instance, box_rdata_new, box_rend_build, box_rend_init, box_rend_render} from "@engine/box_rend.ts";
import {rend_player_init, rend_player_render} from "./rend_player.ts";
import {min, rand_ex, rand_in} from "@cl/math.ts";
import {mtv_aabb2_aabb2, overlap_aabb2_aabb2, overlap_aabb2_aabb2_x, point_inside_aabb} from "@cl/collision2.ts";
import {body_integrate} from "./phys.ts";
import {load_level} from "./world.ts";
import {bg_rdata_new, bg_rend_init, bg_rend_render} from "@engine/bg_rend.ts";
import {box_t, BOX_TYPE, player_new} from "./entities.ts";
import {point_rdata_build, point_rdata_instance, point_rdata_new, point_rdata_t, point_rend_build, point_rend_init, point_rend_render} from "@engine/point_rend.ts";
import { vec4 } from "@cl/vec4.ts";
import {line_rdata_build, line_rdata_instance, line_rdata_new, line_rdata_t, line_rend_build, line_rend_init, line_rend_render} from "@engine/line_rend.ts";

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
const grid = grid_rdata_new(vec2(), vec2(1024.0), vec2(1.0), 0.01, rgb(255, 255, 250));
const background = bg_rdata_new(rgb(30, 116, 214), rgb(124, 198, 228));

const box_rdata = box_rdata_new();
box_rdata_build(box_rdata, level.boxes.length);

io_init();

const mouse = vec2();

io_m_move(function(event: m_event_t): void {
    vec2_set(mouse, event.x, event.y);

    const point = cam2_proj_mouse(camera, mouse, canvas_el.width, canvas_el.height);

    for (const box of boxes) {
        if (point_inside_aabb(box.body.position, box.body.size, point)) {
            console.log(true);
        }
    }
});

io_kb_key_down(function(event: kb_event_t): void {
    if (event.code === "KeyR") {
        vec2_copy(player_body.position, level.spawn_point);
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

// point_rend_init();
// const point_count = 2048;
// const point_rdata = point_rdata_new();
// point_rdata_build(point_rdata, point_count);
// point_rend_build(point_rdata);

// for (let i = 0; i < point_count; i += 1) {
//     point_rdata_instance(point_rdata, i, vec2(rand_in(-100, 100), rand_in(-100, 100)), 0.5 + Math.random() * 2.0, vec4(rand_ex(0, 256), rand_ex(0, 256), rand_ex(0, 256), 127));
// }

line_rend_init();
const point_count = 3;
const line_rdata = line_rdata_new();
line_rdata_build(line_rdata, point_count);

line_rdata_instance(line_rdata, 0, vec2(-16, 0), 1.0, 0, vec4(255, 0, 0, 255));
line_rdata_instance(line_rdata, 1, vec2(16, 0), 1.0, 0, vec4(0, 255, 0, 255));
line_rdata_instance(line_rdata, 2, vec2(20, 20), 1.0, 0, vec4(0, 0, 255, 255));
line_rend_build(line_rdata);

console.log(line_rdata);

gl.enable(gl.BLEND)
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

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

    camera.position = vec2_lerp1(camera.position, player_body.position, 0.05);
    cam2_compute_proj(camera, canvas_el.width, canvas_el.height);
    cam2_compute_view(camera);

    gl.viewport(0, 0, canvas_el.width, canvas_el.height);
    gl.clearColor(clear_color[0], clear_color[1], clear_color[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    bg_rend_render(background, camera, time);
    grid_rend_render(grid, camera);
    // point_rend_render(point_rdata, camera);
    line_rend_render(line_rdata, camera);
    box_rend_render(box_rdata, camera);
    rend_player_render(player, camera);
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
