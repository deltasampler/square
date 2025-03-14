import {gui_window, gui_canvas, gui_render} from "@gui/gui.ts";
import {io_init, io_kb_key_down, io_key_down, kb_event_t} from "@engine/io.ts";
import {level_1} from "./levels.ts";
import {gl_init} from "@engine/gl.ts";
import {cam2_compute_proj, cam2_compute_view, cam2_new} from "@cl/cam2.ts";
import {grid_new, rend_grid_init, rend_grid_render} from "./rend_grid.ts";
import {vec2, vec2_add2, vec2_addmuls2, vec2_clamp2, vec2_copy, vec2_dir1, vec2_dot, vec2_lerp1, vec2_muls1, vec2_muls2, vec2_set, vec2_sub1} from "@cl/vec2.ts";
import {rgb} from "@cl/vec3.ts";
import {box_rend_build, box_rend_new, box_rend_update, rend_boxes_build, rend_boxes_init, rend_boxes_render} from "./rend_boxes.ts";
import {rend_player_init, rend_player_render} from "./rend_player.ts";
import {min} from "@cl/math.ts";
import {mtv_aabb2_aabb2, overlap_aabb2_aabb2_x} from "@cl/collision2.ts";
import {body_integrate} from "./phys.ts";
import {box_t, load_level, player_new} from "./world.ts";
import {rend_background_init, rend_background_render} from "./rend_background.ts";

const root = gui_window(null);
const canvas = gui_canvas(root);

gui_render(root, document.body);

const canvas_el = canvas.canvas_el;
const gl = gl_init(canvas_el);

const level = load_level(level_1);
const player = player_new(vec2(), vec2(1.0), 10.0);
const clear_color = rgb(129.0, 193.0, 204.0);
const camera = cam2_new();
const grid = grid_new(vec2(), vec2(1024.0), vec2(1.0), 0.01, rgb(255.0, 255.0, 255.0));

const box_rend = box_rend_new();
box_rend_build(box_rend, level);

io_init();

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
        player_body.contact = null ;
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

        vec2_add2(body.force, vec2_muls2(move_direction, animation.speed * animation.dir));
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

        if (body.can_collide) {
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

rend_grid_init();

rend_boxes_init();
rend_boxes_build(box_rend);

rend_player_init();

rend_background_init();

gl.enable(gl.BLEND)
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

function render(): void {
    box_rend_update(box_rend, level);

    camera.position = vec2_lerp1(camera.position, player_body.position, 0.05);
    cam2_compute_proj(camera, canvas_el.width, canvas_el.height);
    cam2_compute_view(camera);

    gl.viewport(0, 0, canvas_el.width, canvas_el.height);
    gl.clearColor(clear_color[0], clear_color[1], clear_color[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    rend_background_render(camera, time);
    rend_grid_render(grid, camera);
    rend_boxes_render(box_rend, camera);
    rend_player_render(player, camera);
}

function loop(): void {
    time = performance.now();
    delta_time = min((time - last_time) / 1000.0, 0.1);
    last_time = time;

    update();
    render();

    requestAnimationFrame(loop);
}

loop();
