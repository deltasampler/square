import {gui_window, gui_canvas, gui_render} from "@gui/gui.ts";
import {io_init, io_kb_key_down, io_key_down, kb_event_t} from "@engine/io.ts";
import {gen_level1} from "./levels.ts";
import {gl_init} from "@engine/gl.ts";
import {cam2_compute_proj, cam2_compute_view, cam2_new} from "@cl/cam2.ts";
import {grid_new, rend_grid_init, rend_grid_render} from "./rend_grid.ts";
import {vec2, vec2_add2, vec2_copy, vec2_dist, vec2_lerp, vec2_lerp1, vec2_muls, vec2_muls1, vec2_muls2, vec2_refl, vec2_refl1, vec2_set, vec2_sub, vec2_sub1, vec2_unit2} from "@cl/vec2.ts";
import {rgb} from "@cl/vec3.ts";
import {box_rend_build, box_rend_new, box_rend_update, rend_boxes_build, rend_boxes_init, rend_boxes_render} from "./rend_boxes.ts";
import {rend_player_init, rend_player_render} from "./rend_player.ts";
import {clamp } from "@cl/math.ts";
import {aabb2, aabb2_is_overlapping_sideways, aabb2_overlap_aabb} from "@cl/aabb2.ts";

const root = gui_window(null);
const canvas = gui_canvas(root);

gui_render(root, document.body);

const canvas_el = canvas.canvas_el;
const gl = gl_init(canvas_el);

const clear_color = rgb(129.0, 193.0, 204.0);
const level = gen_level1();
const boxes = level.boxes;
const camera = cam2_new();
const player = level.player;
const grid = grid_new(vec2(), vec2(1024.0), vec2(1.0), 0.01, rgb(255.0, 255.0, 255.0));

const box_rend = box_rend_new();
box_rend_build(box_rend, level);

io_init();

const gravity = -0.5;
const speed = 10;
const air_speed = 1;
const jump_force = 35;
const air_drag = 0.97;

let delta_time = 0;
let time = 0;
let last_time = 0;

io_kb_key_down(function(event: kb_event_t): void {
    if (event.code === "KeyR") {
        vec2_set(player.position, 0.0, 5.0);
    }
});

function update(): void {
    const body = player.body;

    if (io_key_down("KeyA")) {
        body.velocity[0] -= (player.contact ? speed : air_speed) * delta_time;
    }

    if (io_key_down("KeyD")) {
        body.velocity[0] += (player.contact ? speed : air_speed) * delta_time;
    }

    if (io_key_down("Space") && player.contact) {
        body.velocity[0] += player.contact.body.velocity[0];
        player.contact = null;
        body.velocity[1] += jump_force * delta_time;
    }

    if (!player.contact) {
        body.velocity[1] += gravity * delta_time;
    } else {
        vec2_add2(body.velocity, player.contact.body.velocity);
    }

    vec2_add2(player.position, body.velocity);

    for (const box of boxes) {
        if (box.body.is_dynamic) {
            const animation = box.animation;

            if (animation) {
                if (animation.dir > 0.0) {
                    if (vec2_dist(box.position, animation.end) <= 0.1) {
                        animation.dir = -1.0;
                    }
                } else if (animation.dir < 0.0) {
                    if (vec2_dist(box.position, animation.start) <= 0.1) {
                        animation.dir = 1.0;
                    }
                }

                const direction = vec2_unit2(vec2_sub1(animation.end, animation.start));
                const velocity = vec2_muls2(direction, animation.speed * animation.dir);
                vec2_copy(box.body.velocity, velocity);
                vec2_add2(box.position, box.body.velocity);
            }
        }

        const overlap = aabb2_overlap_aabb(aabb2(player.position, player.size), aabb2(box.position, box.size));

        if (!overlap) {
            continue;
        }

        if (body.can_collide) {
            var normal = vec2();

            if (overlap[0] < overlap[1]) {
                if (player.position[0] < box.position[0]) {
                    player.position[0] -= overlap[0];
                    normal = vec2(-1.0, 0.0);
                } else {
                    player.position[0] += overlap[0];
                    normal = vec2(1.0, 0.0);
                }
            } else {
                if (player.position[1] < box.position[1]) {
                    player.position[1] -= overlap[1]; 
                    normal = vec2(0.0, -1.0);
                } else {
                    player.position[1] += overlap[1];
                    normal = vec2(0.0, 1.0);

                    if (Math.abs(body.velocity[1]) < 0.8) {
                        body.velocity[1] = 0;
                        player.contact = box;
                    }
                }
            }

            const e = Math.min(body.restitution, body.restitution);

            body.velocity = vec2_muls1(vec2_refl1(body.velocity, normal), e);
        }
    }

    if (player.contact) {
        body.velocity[0] *= Math.min(player.body.friction, player.contact.body.friction);
        const t = player.position[1] - player.size[1] / 2;
        const b = player.contact.position[1] + player.contact.size[1] / 2;
        const d = Math.abs(b - t);

        if (player.contact.body.is_dynamic) {
            body.velocity[0] = player.contact.body.velocity[0] * delta_time;
        }

        if (!aabb2_is_overlapping_sideways(aabb2(player.position, player.size), aabb2(player.contact.position, player.contact.size)) || d > 0.1) {
            player.contact = null;
        }
    } else {
        body.velocity[0] *= air_drag;
    }

    body.velocity[0] = clamp(body.velocity[0], -1.0, 1.0);
    body.velocity[1] = clamp(body.velocity[1], -1.0, 1.0);
}

rend_grid_init();

rend_boxes_init();
rend_boxes_build(box_rend);

rend_player_init();

gl.enable(gl.BLEND)
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

function render(): void {
    box_rend_update(box_rend, level);

    camera.position = vec2_lerp1(camera.position, player.position, 0.05);
    cam2_compute_proj(camera, canvas_el.width, canvas_el.height);
    cam2_compute_view(camera);

    gl.viewport(0, 0, canvas_el.width, canvas_el.height);
    gl.clearColor(clear_color[0], clear_color[1], clear_color[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    rend_grid_render(grid, camera);
    rend_boxes_render(box_rend, camera);
    rend_player_render(level.player, camera);
}

function loop(): void {
    time = performance.now();
    delta_time = (time - last_time) / 1000.0;
    last_time = time;

    update();
    render();

    requestAnimationFrame(loop);
}

loop();
