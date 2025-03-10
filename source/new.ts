import {create_canvas} from "@engine/canvas.ts";
import {io_init, io_key_down} from "@engine/io.ts";
import {d2_aabb, d2_aabb2, d2_center_transform, d2_clear_color, d2_fill, d2_fill_vec, d2_init, d2_reset_transform} from "@engine/d2.ts";
import { vec2_t, vec3_t } from "@cl/type";
import { vec2, vec2_add, vec2_add2, vec2_copy, vec2_div, vec2_div_s, vec2_div_s2, vec2_mul_s } from "@cl/vec2";
import { vec3 } from "@cl/vec3";

const canvas_el = create_canvas(document.body);
d2_init(canvas_el);
io_init();

class body_t {
    position: vec2_t;
    size: vec2_t;
    is_dynamic: boolean;
    mass: number;
    acc: vec2_t;
    acc_last: vec2_t;
    acc_avg: vec2_t;
    vel: vec2_t;
    friction: number;
    restitution: number;
};

function body_new(): body_t {
    const body = new body_t();
    body.position = vec2();
    body.size = vec2();
    body.is_dynamic = false;
    body.mass = 0.0;
    body.acc = vec2();
    body.acc_last = vec2();
    body.acc_avg = vec2();
    body.vel = vec2();
    body.friction = 0.0;
    body.restitution = 0.0;

    return body;
}

class entity_t {
    body: body_t;
    color: vec3_t;
};

function entity_new(body: body_t, color: vec3_t): entity_t {
    const entity = new entity_t();
    entity.body = body;
    entity.color = color;

    return entity;
}

function box_ground(position: vec2_t, size: vec2_t): entity_t {
    const body = body_new();
    body.position = position;
    body.size = size;

    const color = vec3(230, 230, 230);

    return entity_new(body, color);
}

function box_player(position: vec2_t, size: vec2_t): entity_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.is_dynamic = true;
    body.mass = 1000.0;

    const color = vec3(255, 0, 0);

    return entity_new(body, color);
}

const entities: entity_t[] = [];
entities.push(box_ground(vec2(), vec2(400.0, 100.0)));

const player = box_player(vec2(0.0, 200.0), vec2(50.0, 50.0));
entities.push(player);

const dynamic_bodies: body_t[] = [];
const static_bodies: body_t[] = [];

for (const entity of entities) {
    if (entity.body.is_dynamic) {
        dynamic_bodies.push(entity.body);
    } else {
        static_bodies.push(entity.body);
    }
}

function body_update(body: body_t, time_step: number): void {
    vec2_copy(body.acc_last, body.acc);

    vec2_add2(body.position, vec2_mul_s(body.vel, time_step));
    vec2_add2(body.position, vec2_mul_s(body.acc_last, time_step * time_step * 0.5));

    vec2_copy(body.acc_avg, vec2_div_s2(vec2_add(body.acc_last, body.acc), 2.0));

    vec2_add2(body.vel, vec2_mul_s(body.acc_avg, time_step));
}

function body_apply_force(body: body_t, force: vec2_t): void {
    vec2_copy(body.acc, vec2_div_s(force, body.mass));
}

function update(): void {
    if (io_key_down("KeyA")) {
        body_apply_force(player.body, vec2(-1.0, 0.0));
    }

    if (io_key_down("KeyD")) {
        body_apply_force(player.body, vec2(1.0, 0.0));
    }

    if (io_key_down("KeyS")) {
        body_apply_force(player.body, vec2(0.0, -1.0));
    }

    if (io_key_down("KeyW")) {
        body_apply_force(player.body, vec2(0.0, 1.0));
    }

    for (const body of dynamic_bodies) {
        body_update(body, 1000.0 / 60.0);
    }
}

function render(): void {
    d2_reset_transform();
    d2_clear_color(0, 0, 0);
    d2_center_transform();

    for (const entity of entities) {
        d2_fill_vec(entity.color);
        d2_aabb2(entity.body.position, entity.body.size);
    }
}

function loop(): void {
    update();
    render();

    requestAnimationFrame(loop);
}

loop();
