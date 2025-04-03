import {vec2_t, vec3_t, vec4_t} from "@cl/type.ts";
import {vec2, vec2_clone, vec2_equals} from "@cl/vec2.ts";
import {vec3, vec3_clone} from "@cl/vec3.ts";
import {vec4, vec4_clone} from "@cl/vec4.ts";
import {box_end_zone, box_start_zone} from "./presets.ts";

// body
export class body_t {
    position: vec2_t;
    size: vec2_t;
    rotation: number;
    mass_inv: number;
    force: vec2_t;
    acc: vec2_t;
    vel: vec2_t;
    friction: number;
    damping: number;
    restitution: number;
    can_collide: boolean;
    is_dynamic: boolean;
    contact: body_t|null;
};

export function body_new(): body_t {
    const body = new body_t();
    body.position = vec2();
    body.size = vec2(1.0);
    body.rotation = 0.0;
    body.mass_inv = 0.0;
    body.force = vec2();
    body.acc = vec2();
    body.vel = vec2();
    body.friction = 0.5;
    body.damping = 0.01;
    body.restitution = 0.9;
    body.can_collide = true;
    body.is_dynamic = false;
    body.contact = null;

    return body;
}

export function body_clone(body: body_t): body_t {
    const out = new body_t();
    out.position = vec2_clone(body.position);
    out.size = vec2_clone(body.size);
    out.rotation = body.rotation;
    out.mass_inv = body.mass_inv;
    out.force = vec2_clone(body.force);
    out.acc = vec2_clone(body.acc);
    out.vel = vec2_clone(body.vel);
    out.friction = body.friction;
    out.damping = body.damping;
    out.restitution = body.restitution;
    out.can_collide = body.can_collide;
    out.is_dynamic = body.is_dynamic;
    out.contact = body.contact;

    return out;
}

export function body_to_json(body: body_t): Record<string, any> {
    return {
        position: Array.from(body.position),
        size: Array.from(body.size),
        rotation: body.rotation,
        mass_inv: body.mass_inv,
        force: Array.from(body.force),
        acc: Array.from(body.acc),
        vel: Array.from(body.vel),
        friction: body.friction,
        damping: body.damping,
        restitution: body.restitution,
        can_collide: body.can_collide,
        is_dynamic: body.is_dynamic
    };
}

export function body_from_json(data: Record<string, any>): body_t {
    const body = new body_t();
    body.position = new Float32Array(data.position ?? [0.0, 0.0]);
    body.size = new Float32Array(data.size ?? [0.0, 0.0]);
    body.rotation = data.rotation ?? 0.0;
    body.mass_inv = data.mass_inv ?? 0.0;
    body.force = new Float32Array(data.force ?? [0.0, 0.0]);
    body.acc = new Float32Array(data.acc ?? [0.0, 0.0]);
    body.vel = new Float32Array(data.vel ?? [0.0, 0.0]);
    body.friction = data.friction ?? 0.0;
    body.damping = data.damping ?? 0.0;
    body.restitution = data.restitution ?? 0.0;
    body.can_collide = data.can_collide ?? false;
    body.is_dynamic = data.is_dynamic ?? false;
    body.contact = null;

    return body;
}

// animation
export class animation_t {
    start: vec2_t;
    end: vec2_t;
    force: number;
    dir: number;
    repetitive: boolean;
};

export function animation_new(start: vec2_t, end: vec2_t, force: number, dir: number, repetitive: boolean): animation_t {
    const anim = new animation_t();
    anim.start = vec2_clone(start);
    anim.end = vec2_clone(end);
    anim.force = force;
    anim.dir = dir;
    anim.repetitive = repetitive;

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

export function animation_to_json(animation: animation_t): Record<string, any> {
    return {
        start: Array.from(animation.start),
        end: Array.from(animation.end),
        force: animation.force,
        dir: animation.dir,
        repetitive: animation.repetitive
    };
}

export function animation_from_json(data: Record<string, any>): animation_t {
    const animation = new animation_t();
    animation.start = new Float32Array(data.start ?? [0.0, 0.0]);
    animation.end = new Float32Array(data.end ?? [0.0, 0.0]);
    animation.force = data.force ?? 0.0;
    animation.dir = data.dir ?? 0.0;
    animation.repetitive = data.repetitive ?? false;

    return animation;
}

// effect
export enum EFFECT_TYPE {
    FORCE
};

export class effect_t {
    type: EFFECT_TYPE;
    force: vec2_t;
};

// portal
export class portal_t {
    destination: box_t;
};

// box
export enum BOX_TYPE {
    DEFAULT,
    START_ZONE,
    END_ZONE
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

export class box_t {
    type: BOX_TYPE;
    zindex: number;
    inner_color: vec4_t;
    outer_color: vec4_t;
    option: vec4_t;
    params: vec3_t;
    is_death: boolean;
    is_platform: boolean;

    body: body_t;
    animation: animation_t|null;
    effect: effect_t|null;
    portal: portal_t|null;

    // editor
    drag_pos: vec2_t;
    drag_size: vec2_t;
};

export function box_new() {
    const box = new box_t();
    box.type = BOX_TYPE.DEFAULT
    box.zindex = 0;
    box.inner_color = vec4(255);
    box.outer_color = vec4(255);
    box.option = vec4();
    box.params = vec3();
    box.is_death = false;
    box.is_platform = false;
    box.body = body_new();
    box.animation = null;
    box.effect = null;
    box.portal = null;
    box.drag_pos = vec2();
    box.drag_size = vec2();

    return box;
}

export function box_clone(box: box_t): box_t {
    const out = new box_t();

    out.type = box.type;
    out.zindex = box.zindex;
    out.inner_color = vec4_clone(box.inner_color);
    out.outer_color = vec4_clone(box.outer_color);
    out.option = vec4_clone(box.option);
    out.params = vec3_clone(box.params);
    out.is_death = box.is_death;
    out.is_platform = box.is_platform;
    out.body = body_clone(box.body);

    if (box.animation) {
        out.animation = animation_clone(box.animation);
    }

    return out;
}

export function box_to_json(box: box_t): Record<string, any> {
    return {
        type: box.type,
        zindex: box.zindex,
        inner_color: Array.from(box.inner_color),
        outer_color: Array.from(box.outer_color),
        option: [box.option[0], box.option[1], box.option[2], 0],
        params: Array.from(box.params),
        is_death: box.is_death,
        is_platform: box.is_platform,
        body: body_to_json(box.body),
        animation: box.animation ? animation_to_json(box.animation) : null,
    };
}

export function box_from_json(data: Record<string, any>): box_t {
    const box = new box_t();
    box.type = data.type;
    box.zindex = data.zindex ?? 0;
    box.inner_color = new Float32Array(data.inner_color ?? [0, 0, 0, 0]);
    box.outer_color = new Float32Array(data.outer_color ?? [0, 0, 0, 0]);
    box.option = new Float32Array(data.option ?? [0, 0, 0, 0]);
    box.params = new Float32Array(data.params ?? [0.0, 0.0, 0.0]);
    box.is_death = data.is_death ?? false;
    box.is_platform = data.is_platform ?? false;
    box.body = body_from_json(data.body);
    box.animation = data.animation ? animation_from_json(data.animation) : null;
    box.effect = null;
    box.portal = null;
    box.drag_pos = vec2();
    box.drag_size = vec2();

    return box;
}

// player
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

// level
export class level_t {
    start_zone: box_t;
    end_zone: box_t;
    boxes: box_t[];
};

export function level_new(): level_t {
    const level = new level_t();
    level.boxes = [];

    return level;
}

export function level_to_json(level: level_t): string {
    return JSON.stringify({
        boxes: level.boxes.map(box_to_json)
    });
}

export function level_from_json(str: string): level_t {
    const data = JSON.parse(str);

    const level = new level_t();
    level.boxes = data.boxes ? data.boxes.map(box_from_json) : [];
    level.start_zone = level.boxes.find(box => box.type === BOX_TYPE.START_ZONE) ?? box_start_zone(vec2(-16, 0), vec2(4));
    level.end_zone = level.boxes.find(box => box.type === BOX_TYPE.END_ZONE) ?? box_end_zone(vec2(16, 0), vec2(4));

    return level;
}

export function level_dedup(level: level_t): void {
    const boxes: box_t[] = [];

    for (const box of level.boxes) {
        const dup_box = boxes.find(b => {
            return vec2_equals(b.body.position, box.body.position) && vec2_equals(b.body.size, box.body.size)
        });

        if (dup_box) {
            continue;
        }

        boxes.push(box);
    }

    level.boxes = boxes;
}

export function level_sort(level: level_t): void {
    level.boxes.sort((a, b) => b.zindex - a.zindex);
}

export function level_load(level: level_t, str: string): void {
    level.boxes = [];
}
