import {vec2_t, vec4_t} from "@cl/type.ts";
import {vec2_lerp1} from "@cl/vec2.ts";
import {rgba} from "@cl/vec4.ts";
import {body_new, body_t} from "./phys.ts";

export class animation_t {
    start: vec2_t;
    end: vec2_t;
    factor: number;
    speed: number;
    dir: number;
};

export class box_t {
    body: body_t;
    animation: animation_t|null;
    color: vec4_t;
};

export class player_t {
    body: body_t;
};

export class level_t {
    boxes: box_t[];
    player: player_t;
};

export function animation_new(start: vec2_t, end: vec2_t, factor: number, speed: number): animation_t {
    const anim = new animation_t();
    anim.start = start;
    anim.end = end;
    anim.factor = factor;
    anim.speed = speed;
    anim.dir = 1.0;

    return anim;
}

export function box_ground(position: vec2_t, size: vec2_t): box_t {
    const box = new box_t();

    box.body = body_new();
    box.body.position = position;
    box.body.size = size;
    box.animation = null;
    box.color = rgba(176.0, 176.0, 176.0, 255.0);
    box.body.restitution = 0.5;

    return box;
}

export function box_mover(size: vec2_t, start: vec2_t, end: vec2_t, factor: number, speed: number): box_t {
    const box = new box_t();

    box.body = body_new();
    box.body.position = vec2_lerp1(start, end, factor);
    box.body.size = size;
    box.body.is_dynamic = true;
    box.animation = animation_new(start, end, factor, speed);
    box.color = rgba(176.0, 176.0, 176.0, 255.0);
    box.body.mass_inv = 1.0 / 10.0;
    box.body.restitution = 0.3;

    return box;
}

export function player_new(position: vec2_t, size: vec2_t): player_t {
    const player = new player_t();
    player.body = body_new();
    player.body.position = position;
    player.body.size = size;
    player.body.mass_inv = 1.0 / 10.0;
    player.body.is_dynamic = true;

    return player;
};

export function level_new(): level_t {
    const level = new level_t();
    level.boxes = [];

    return level;
}
