import {vec2_t, vec3_t, vec4_t} from "@cl/type.ts";
import {vec2} from "@cl/vec2.ts";
import {vec3} from "@cl/vec3.ts";

export class body_t {
    position: vec2_t;
    size: vec2_t;
    mass_inv: number;
    force: vec2_t;
    acc: vec2_t;
    vel: vec2_t;
    friction: number;
    damping: number;
    restitution: number;
    is_dynamic: boolean;
    can_collide: boolean;
    contact: body_t|null;
};

export function body_new(): body_t {
    const body = new body_t();
    body.position = vec2();
    body.size = vec2(1.0);
    body.mass_inv = 0.0;
    body.force = vec2();
    body.acc = vec2();
    body.vel = vec2();
    body.friction = 0.5;
    body.damping = 0.01;
    body.restitution = 0.9;
    body.is_dynamic = false;
    body.can_collide = true;
    body.contact = null;

    return body;
}

export class animation_t {
    start: vec2_t;
    end: vec2_t;
    force: number;
    dir: number;
    repetitive: boolean;
};

export function animation_new(start: vec2_t, end: vec2_t, force: number, dir: number): animation_t {
    const anim = new animation_t();
    anim.start = start;
    anim.end = end;
    anim.force = force;
    anim.dir = dir;

    return anim;
}

export class portal_t {
    destination: box_t;
};

export enum EFFECT_TYPE {
    FORCE
};

export class effect_t {
    type: EFFECT_TYPE;
    force: vec2_t;
};

export enum OPT_MASK {
    DEFAULT,
    SPIKES
};

export enum OPT_BORDER {
    NONE,
    LEFT,
    RIGHT,
    BOTTOM,
    TOP,
    ALL
};

export enum OPT_TEXTURE {
    FLAT,
    CHECK,
    BRICK
};

export enum BOX_TYPE {
    DEFAULT,
    START_ZONE,
    END_ZONE
};

export class box_t {
    body: body_t;
    inner_color: vec4_t;
    outer_color: vec4_t;
    option: vec4_t;
    params: vec3_t;
    is_death: boolean;
    is_platform: boolean;
    type: BOX_TYPE;
    animation: animation_t|null;
    portal: portal_t|null;
    effect: effect_t|null;
};

export function box_new() {
    const box = new box_t();
    box.params = vec3(0.2, 0, 0);

    return box;
}

export class player_t {
    body: body_t;
    inner_color: vec4_t;
    outer_color: vec4_t;
    option: number;
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
