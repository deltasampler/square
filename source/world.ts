import {vec2_t, vec3_t} from "@cl/type.ts";
import {vec2, vec2_abs, vec2_add1, vec2_divs2, vec2_lerp1, vec2_sub1} from "@cl/vec2.ts";
import {body_new, body_t} from "./phys.ts";
import { vec3, vec3_pack256 } from "@cl/vec3.ts";

export class animation_t {
    start: vec2_t;
    end: vec2_t;
    factor: number;
    speed: number;
    dir: number;
};

export function animation_new(start: vec2_t, end: vec2_t, factor: number, speed: number, dir: number): animation_t {
    const anim = new animation_t();
    anim.start = start;
    anim.end = end;
    anim.factor = factor;
    anim.speed = speed;
    anim.dir = dir;

    return anim;
}

export class box_t {
    body: body_t;
    animation: animation_t|null;
    inner_color: vec3_t;
    outer_color: vec3_t;
    opacity: number;
    border: number;
    option: number;
};

export enum TYPE_BIT {
    BORDER,
    CHECKS,
    BRICKS,
    SPIKES
};

export function box_new() {
    const box = new box_t();
    box.opacity = 1;
    box.option = 0;
    box.border = 0.2;

    return box;
}

export function box_ground(position: vec2_t, size: vec2_t): box_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.restitution = 0.5;

    const box = box_new();
    box.body = body;
    box.inner_color = vec3(212, 212, 212);
    box.outer_color = vec3(138, 138, 138);
    box.border = 1.0;
    box.option = vec3_pack256(1, 5, 0);

    return box;
}

export function box_start_zone(min: vec2_t, max: vec2_t): box_t {
    const body = body_new();
    body.position = vec2_divs2(vec2_add1(min, max), 2.0);
    body.size = vec2_abs(vec2_sub1(max, min));
    body.restitution = 0.5;
    body.can_collide = false;

    const box = box_new();
    box.body = body;
    box.inner_color = vec3(0, 0, 0);
    box.outer_color = vec3(178, 255, 161);
    box.opacity = 0.1;
    box.option = vec3_pack256(1, 5, 0);
    box.border = 0.2;

    return box;
}

export function box_end_zone(min: vec2_t, max: vec2_t): box_t {
    const body = body_new();
    body.position = vec2_divs2(vec2_add1(min, max), 2.0);
    body.size = vec2_abs(vec2_sub1(max, min));
    body.restitution = 0.5;
    body.can_collide = false;

    const box = box_new();
    box.body = body;
    box.inner_color = vec3(255, 131, 82);
    box.outer_color = vec3(255, 131, 82);
    box.opacity = 0.0;

    return box;
}

export function box_boost_up(position: vec2_t, size: vec2_t): box_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.restitution = 0.5;

    const box = box_new();
    box.body = body;
    box.inner_color = vec3(255, 71, 71);
    box.outer_color = vec3(255, 71, 71);

    return box;
}

export function box_mover(size: vec2_t, start: vec2_t, end: vec2_t, factor: number, speed: number, dir: number): box_t {
    const body = body_new();
    body.position = vec2_lerp1(start, end, factor);
    body.size = size;
    body.mass_inv = 1.0 / 10.0;
    body.restitution = 0.3;
    body.is_dynamic = true;

    const box = box_new();
    box.body = body;
    box.inner_color = vec3(204, 204, 204);
    box.outer_color = vec3(0, 0, 0);
    box.border = 0.1;
    box.option = vec3_pack256(0, 5, 0);

    box.animation = animation_new(start, end, factor, speed, dir);

    return box;
}

export class level_t {
    spawn_point: vec2_t;
    start_zone: box_t;
    end_zone: box_t;
    boxes: box_t[];
};

export function level_new(): level_t {
    const level = new level_t();
    level.spawn_point = vec2();
    level.boxes = [];

    return level;
}

export class player_t {
    body: body_t;
};

export function player_new(position: vec2_t, size: vec2_t, mass: number): player_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.mass_inv = 1.0 / mass;
    body.is_dynamic = true;

    const player = new player_t();
    player.body = body;

    return player;
};

function extract_vec2(array: any): vec2_t {
    if (!array) {
        array = [];
    }

    return vec2(array[0] ?? 0, array[1] ?? 0.0);
}

export function load_level(json: string): level_t {
    const level = level_new();
    const data = JSON.parse(json);
    const entities = data.entities;
    const start_zone_min = extract_vec2(data.start_zone_min);
    const start_zone_max = extract_vec2(data.start_zone_max);
    const end_zone_min = extract_vec2(data.end_zone_min);
    const end_zone_max = extract_vec2(data.end_zone_max);

    level.spawn_point = extract_vec2(data.spawn_point);

    level.start_zone = box_start_zone(start_zone_min, start_zone_max);
    level.boxes.push(level.start_zone);

    for (const entity of entities) {
        if (entity.type === "ground") {
            const position = extract_vec2(entity.position);
            const size = extract_vec2(entity.size);

            level.boxes.push(box_ground(position, size))
        } else if (entity.type === "mover") {
            const size = extract_vec2(entity.size);
            const start = extract_vec2(entity.start);
            const end = extract_vec2(entity.end);
            const factor = entity.factor;
            const speed = entity.speed;
            const dir = entity.dir;

            level.boxes.push(box_mover(size, start, end, factor, speed, dir));
        }
    }

    return level;
}
