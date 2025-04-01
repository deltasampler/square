import {vec2_t, vec3_t, vec4_t} from "@cl/type.ts";
import {vec2, vec2_clone} from "@cl/vec2.ts";
import {vec3, vec3_clone} from "@cl/vec3.ts";
import { vec4_clone } from "@cl/vec4";

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

export function body_clone(body: body_t): body_t {
    const out = new body_t();
    out.position = vec2_clone(body.position);
    out.size = vec2_clone(body.size);
    out.mass_inv = body.mass_inv;
    out.force = vec2_clone(body.force);
    out.acc = vec2_clone(body.acc);
    out.vel = vec2_clone(body.vel);
    out.friction = body.friction;
    out.damping = body.damping;
    out.restitution = body.restitution;
    out.is_dynamic = body.is_dynamic;
    out.can_collide = body.can_collide;
    out.contact = body.contact;

    return out;
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

export function animation_clone(anim: animation_t): animation_t {
    const out = new animation_t();
    out.start = vec2_clone(anim.start);
    out.end = vec2_clone(anim.end);
    out.force = anim.force;
    out.dir = anim.dir;
    out.repetitive = anim.repetitive;

    return out;
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
    drag_pos: vec2_t;
    drag_size: vec2_t;
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

export function box_clone(box: box_t): box_t {
    const out = new box_t();

    out.body = body_clone(box.body);
    out.inner_color = vec4_clone(box.inner_color);
    out.outer_color = vec4_clone(box.outer_color);
    out.option = vec4_clone(box.option);
    out.params = vec3_clone(box.params);
    out.is_death = box.is_death;
    out.is_platform = box.is_platform;
    out.type = box.type;

    if (box.animation) {
        out.animation = animation_clone(box.animation);
    }

    return out;
}

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
