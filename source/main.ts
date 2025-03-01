import {gui_window, gui_canvas, gui_render} from "@gui/gui.ts";
import {io_init, io_kb_key_down, io_key_down, kb_event_t} from "@engine/io.ts";
import {gen_level1} from "./levels.ts";
import {gl_init} from "@engine/gl.ts";
import {cl_cam2_compute_proj, cl_cam2_compute_view, cl_cam2_new} from "@cl/cam2.ts";
import {grid_new, rend_grid_init, rend_grid_render} from "./rend_grid.ts";
import {cl_vec2, cl_vec2_add, cl_vec2_add2, cl_vec2_clone, cl_vec2_copy, cl_vec2_dist, cl_vec2_len, cl_vec2_lerp, cl_vec2_mul_s, cl_vec2_mul_s2, cl_vec2_refl, cl_vec2_set, cl_vec2_sub, cl_vec2_sub2, cl_vec2_unit, cl_vec2_unit2, cl_vec2_zero} from "@cl/vec2.ts";
import {cl_rgb} from "@cl/vec3.ts";
import {box_rend_build, box_rend_new, box_rend_update, rend_boxes_build, rend_boxes_init, rend_boxes_render} from "./rend_boxes.ts";
import {rend_player_init, rend_player_render} from "./rend_player.ts";
import {cl_abs, cl_clamp } from "@cl/math.ts";
import {cl_aabb2, cl_aabb2_is_overlapping_sideways, cl_aabb2_overlap_aabb} from "@cl/aabb2.ts";
import {ball_rend_build, ball_rend_new, ball_rend_t, ball_rend_update, rend_balls_build, rend_balls_init, rend_balls_render} from "./rend_balls.ts";
import { ball_new, ball_t, box_t } from "./world.ts";
import { vec2_t } from "@cl/type.ts";
import { cl_rgba } from "@cl/vec4.ts";

const root = gui_window(null);
const canvas = gui_canvas(root);

gui_render(root, document.body);

const canvas_el = canvas.canvas_el;
const gl = gl_init(canvas_el);

const clear_color = cl_rgb(129.0, 193.0, 204.0);
const level = gen_level1();
const boxes = level.boxes;
const camera = cl_cam2_new();
const player = level.player;
const grid = grid_new(cl_vec2(), cl_vec2(1024.0), cl_vec2(1.0), 0.01, cl_rgb(255.0, 255.0, 255.0));

const box_rend = box_rend_new();
box_rend_build(box_rend, level);

const ball_rend = ball_rend_new();
ball_rend_build(ball_rend, 100);

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
        cl_vec2_set(player.position, 0.0, 5.0);
    }
});

const shooters: box_t[] = [];

for (const box of boxes) {
    if (box.shooter) {
        shooters.push(box);
    }
}

setInterval(function(): void {
    for (const shooter of shooters) {
        const gun = shooter.shooter;

        if (gun) {
            if (level.balls.length < 1) {
                const ball = ball_new(shooter.position, gun.ball_size, cl_vec2_mul_s(gun.dir, gun.force));
                level.balls.push(ball);
            }
        }
    }
}, 1000);

function closest_point_on_line(start: vec2_t, end: vec2_t, point: vec2_t): vec2_t {
    const bax = end[0] - start[0];
    const bay = end[1] - start[1];
    const pax = point[0] - start[0];
    const pay = point[1] - start[1];
    const t = (bax * pax + bay * pay) / (bax * bax + bay * bay);
    const tc = cl_clamp(t, 0.0, 1.0);

    return cl_vec2(start[0] + bax * tc, start[1] + bay * tc);
}

function point_closest(position: vec2_t, size: vec2_t, point: vec2_t): vec2_t {
    const x = position[0], y = position[1];
    const hsx = size[0] / 2.0, hsy = size[1] / 2.0;
    const minx = x - hsx, miny = y - hsy;
    const maxx = x + hsx, maxy = y + hsy;
    const px = point[0], py = point[1];

    if (px >= minx && px <= maxx && py >= miny && py <= maxy) {
        const cx = cl_abs(minx - point[0]) < cl_abs(maxx - point[0]) ? minx : maxx;
        const cy = cl_abs(miny - point[1]) < cl_abs(maxy - point[1]) ? miny : maxy;
        const a = closest_point_on_line(cl_vec2(minx, cy), cl_vec2(maxx, cy), point)
        const b = closest_point_on_line(cl_vec2(cx, miny), cl_vec2(cx, maxy), point);

        if (cl_vec2_dist(a, point) < cl_vec2_dist(b, point)) {
            return a;
        }

        return b;
    }

    const a = closest_point_on_line(cl_vec2(minx, maxy), cl_vec2(maxx, maxy), point)
    const b = closest_point_on_line(cl_vec2(maxx, miny), cl_vec2(maxx, maxy), point);

    return cl_vec2(a[0], b[1]);
}

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
        cl_vec2_add2(body.velocity, player.contact.body.velocity);
    }

    cl_vec2_add2(player.position, body.velocity);

    for (const box of boxes) {
        if (box.body.is_dynamic) {
            const animation = box.animation;

            if (animation) {
                if (animation.dir > 0.0) {
                    if (cl_vec2_dist(box.position, animation.end) <= 0.1) {
                        animation.dir = -1.0;
                    }
                } else if (animation.dir < 0.0) {
                    if (cl_vec2_dist(box.position, animation.start) <= 0.1) {
                        animation.dir = 1.0;
                    }
                }

                const direction = cl_vec2_unit2(cl_vec2_sub(animation.end, animation.start));
                const velocity = cl_vec2_mul_s2(direction, animation.speed * animation.dir);
                cl_vec2_copy(box.body.velocity, velocity);
                cl_vec2_add2(box.position, box.body.velocity);
            }
        }

        const overlap = cl_aabb2_overlap_aabb(cl_aabb2(player.position, player.size), cl_aabb2(box.position, box.size));

        if (!overlap) {
            continue;
        }

        if (body.can_collide) {
            var normal = cl_vec2();

            if (overlap[0] < overlap[1]) {
                if (player.position[0] < box.position[0]) {
                    player.position[0] -= overlap[0];
                    normal = cl_vec2(-1.0, 0.0);
                } else {
                    player.position[0] += overlap[0];
                    normal = cl_vec2(1.0, 0.0);
                }
            } else {
                if (player.position[1] < box.position[1]) {
                    player.position[1] -= overlap[1]; 
                    normal = cl_vec2(0.0, -1.0);
                } else {
                    player.position[1] += overlap[1];
                    normal = cl_vec2(0.0, 1.0);

                    if (Math.abs(body.velocity[1]) < 0.8) {
                        body.velocity[1] = 0;
                        player.contact = box;
                    }
                }
            }

            const e = Math.min(body.restitution, body.restitution);

            body.velocity = cl_vec2_mul_s(cl_vec2_refl(body.velocity, normal), e);
        }
    }

    // balls
    for (const ball of level.balls) {
        cl_vec2_add2(ball.position, ball.body.velocity);

        for (const b of level.boxes) {
            if (b.shooter) {
                continue;
            }

            const overlap = point_closest(b.position, b.size, ball.position,);

            if (overlap) {
                const d = cl_vec2_sub(ball.position, overlap);
                const n = cl_vec2_unit(d);
                const l = cl_vec2_len(d);

                if (l <= ball.diameter / 2.0) {
                    cl_vec2_add2(ball.position, cl_vec2_mul_s(n, l - ball.diameter / 2.0));
                    const e = Math.min(b.body.restitution, ball.body.restitution);
                    ball.body.velocity = cl_vec2_mul_s(cl_vec2_refl(ball.body.velocity, n), e);
                }
            }
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

        if (!cl_aabb2_is_overlapping_sideways(cl_aabb2(player.position, player.size), cl_aabb2(player.contact.position, player.contact.size)) || d > 0.1) {
            player.contact = null;
        }
    } else {
        body.velocity[0] *= air_drag;
    }

    body.velocity[0] = cl_clamp(body.velocity[0], -1.0, 1.0);
    body.velocity[1] = cl_clamp(body.velocity[1], -1.0, 1.0);
}

rend_grid_init();

rend_boxes_init();
rend_boxes_build(box_rend);

rend_balls_init();
rend_balls_build(ball_rend);

rend_player_init();

gl.enable(gl.BLEND)
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

function render(): void {
    box_rend_update(box_rend, level);
    ball_rend_update(ball_rend, level);

    camera.position = cl_vec2_lerp(camera.position, player.position, 0.05);
    cl_cam2_compute_proj(camera, canvas_el.width, canvas_el.height);
    cl_cam2_compute_view(camera);

    gl.viewport(0, 0, canvas_el.width, canvas_el.height);
    gl.clearColor(clear_color[0], clear_color[1], clear_color[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    rend_grid_render(grid, camera);
    rend_boxes_render(box_rend, camera);
    rend_balls_render(ball_rend, camera);
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
