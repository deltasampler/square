import {vec2, vec2n_copy, vec2_copy, vec2_t} from "@cl/math/vec2.ts";
import {vec3, vec3n_copy, vec3_t} from "@cl/math/vec3.ts";
import {rgb} from "@cl/math/vec3_color.ts";
import {vec4, vec4n_copy, vec4_set, vec4_t} from "@cl/math/vec4.ts";

// vector serialization
export function vec_serialize(vec: Float32Array): number[] {
    return Array.from(vec);
}

export function vec_deserialize(data: any, size: number) {
    const is_valid = data && Array.isArray(data) && data.length === size;

    if (!is_valid) {
        return null;
    }

    return new Float32Array(data);
}

// transform
export class transform_t {
    position: vec2_t;
    rotation: number;
    scaling: vec2_t;
};

export function transform_new(): transform_t {
    const out = new transform_t();
    out.position = vec2();
    out.rotation = 0.0;
    out.scaling = vec2(1.0);

    return out;
}

export function transform_clone(transform: transform_t): transform_t {
    const out = new transform_t();
    out.position = vec2n_copy(transform.position);
    out.rotation = transform.rotation;
    out.scaling = vec2n_copy(transform.scaling);

    return out;
}

export function transform_serialize(transform: transform_t): Record<string, any> {
    return {
        position: vec_serialize(transform.position),
        rotation: transform.rotation,
        scaling: vec_serialize(transform.scaling)
    };
}

export function transform_deserialize(record: Record<string, any>): transform_t {
    const out = transform_new();
    out.position = vec_deserialize(record.position, 2) ?? out.position;
    out.rotation = record.rotation ?? out.rotation;
    out.scaling = vec_deserialize(record.scaling, 2) ?? out.scaling;

    return out;
}

// geometry
export enum GEOMETRY_TYPE {
    BOX,
    CIRCLE
};

export class geometry_t {
    type: GEOMETRY_TYPE;
    size: vec2_t;
    radius: number;
};

export function geometry_new(): geometry_t {
    const out = new geometry_t();
    out.type = GEOMETRY_TYPE.BOX;
    out.size = vec2(1.0);
    out.radius = 1.0;

    return out;
}

export function geometry_clone(geometry: geometry_t): geometry_t {
    const out = new geometry_t();
    out.type = geometry.type;
    out.size = vec2n_copy(geometry.size)
    out.radius = geometry.radius;

    return out;
}

export function geometry_serialize(geometry: geometry_t): Record<string, any> {
    return {
        type: geometry.type,
        size: vec_serialize(geometry.size),
        radius: geometry.radius
    };
}

export function geometry_deserialize(record: Record<string, any>): geometry_t {
    const out = new geometry_t();
    out.type = record.type ?? out.type;
    out.size = vec_deserialize(record.size, 2) ?? out.size;
    out.radius = record.radius ?? out.radius;

    return out;
}

// body
export class body_t {
    mass: number;
    force: vec2_t;
    acceleration: vec2_t;
    velocity: vec2_t;
    damping: number;
    friction: number;
    restitution: number;
    dynamic_flag: boolean;
    collision_flag: boolean;
};

export function body_new(): body_t {
    const out = new body_t();
    out.mass = 1.0;
    out.force = vec2();
    out.acceleration = vec2();
    out.velocity = vec2();
    out.damping = 0.01;
    out.friction = 0.2;
    out.restitution = 0.5;
    out.dynamic_flag = false;
    out.collision_flag = true;

    return out;
}

export function body_clone(body: body_t): body_t {
    const out = new body_t();
    out.mass = body.mass;
    out.force = vec2n_copy(body.force);
    out.acceleration = vec2n_copy(body.acceleration);
    out.velocity = vec2n_copy(body.velocity);
    out.damping = body.damping;
    out.friction = body.friction;
    out.restitution = body.restitution;
    out.dynamic_flag = body.dynamic_flag;
    out.collision_flag = body.collision_flag;

    return out;
}

export function body_serialize(body: body_t): Record<string, any> {
    return {
        mass: body.mass,
        force: vec_serialize(body.force),
        acceleration: vec_serialize(body.acceleration),
        velocity: vec_serialize(body.velocity),
        damping: body.damping,
        friction: body.friction,
        restitution: body.restitution,
        dynamic_flag: body.dynamic_flag,
        collision_flag: body.collision_flag
    };
}

export function body_deserialize(record: Record<string, any>): body_t {
    const out = new body_t();
    out.mass = record.mass ?? out.mass;
    out.force = vec_deserialize(record.force, 2) ?? out.force;
    out.acceleration = vec_deserialize(record.acceleration, 2) ?? out.acceleration;
    out.velocity = vec_deserialize(record.velocity, 2) ?? out.velocity;
    out.damping = record.damping ?? out.damping;
    out.friction = record.friction ?? out.friction;
    out.restitution = record.restitution ?? out.restitution;
    out.dynamic_flag = record.dynamic_flag ?? out.dynamic_flag;
    out.collision_flag = record.collision_flag ?? out.collision_flag;

    return out;
}

// style
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

export enum OPT_SELECT {
    FALSE,
    TRUE
};

export class style_t {
    zindex: number;
    inner_color: vec4_t;
    outer_color: vec4_t;
    option: vec4_t;
    params: vec3_t;
};

export function style_new(): style_t {
    const out = new style_t();
    out.zindex = 0;
    out.inner_color = vec4(0, 0, 0, 255);
    out.outer_color = vec4(255);
    out.option = vec4();
    out.params = vec3();

    return out;
}

export function style_clone(style: style_t): style_t {
    const out = new style_t();
    out.zindex = style.zindex;
    out.inner_color = vec4n_copy(style.inner_color);
    out.outer_color = vec4n_copy(style.outer_color);
    out.option = vec4n_copy(style.option);
    out.params = vec3n_copy(style.params);

    return out;
}

export function style_serialize(style: style_t): Record<string, any> {
    return {
        zindex: style.zindex,
        inner_color: vec_serialize(style.inner_color),
        outer_color: vec_serialize(style.outer_color),
        option: [style.option[0], style.option[1], style.option[2], 0],
        params: vec_serialize(style.params)
    };
}

export function style_deserialize(record: Record<string, any>): style_t {
    const out = new style_t();
    out.zindex = record.zindex ?? out.zindex;
    out.inner_color = vec_deserialize(record.inner_color, 4) ?? out.inner_color;
    out.outer_color = vec_deserialize(record.outer_color, 4) ?? out.outer_color;
    out.option = vec_deserialize(record.option, 4) ?? out.option;
    out.params = vec_deserialize(record.params, 3) ?? out.params;

    return out;
}

// animation
export class animation_t {
    start: vec2_t;
    end: vec2_t;
    force: number;
    dir: number;
    looping_flag: boolean;
};

export function animation_new(): animation_t {
    const out = new animation_t();
    out.start = vec2();
    out.end = vec2();
    out.force = 0.0;
    out.dir = 0.0;
    out.looping_flag = false;

    return out;
}

export function animation_clone(animation: animation_t): animation_t {
    const out = new animation_t();
    out.start = vec2n_copy(animation.start);
    out.end = vec2n_copy(animation.end);
    out.force = animation.force;
    out.dir = animation.dir;
    out.looping_flag = animation.looping_flag;

    return out;
}

export function animation_from(start: vec2_t, end: vec2_t, force: number, dir: number, looping_flag: boolean): animation_t {
    const out = new animation_t();
    out.start = vec2n_copy(start);
    out.end = vec2n_copy(end);
    out.force = force;
    out.dir = dir;
    out.looping_flag = looping_flag;

    return out;
}

export function animation_serialize(animation: animation_t): Record<string, any> {
    return {
        start: vec_serialize(animation.start),
        end: vec_serialize(animation.end),
        force: animation.force,
        dir: animation.dir,
        looping_flag: animation.looping_flag
    };
}

export function animation_deserialize(record: Record<string, any>): animation_t {
    const out = new animation_t();
    out.start = vec_deserialize(record.start, 2) ?? out.start;
    out.end = vec_deserialize(record.end, 2) ?? out.end;
    out.force = record.force ?? out.force;
    out.dir = record.dir ?? out.dir;
    out.looping_flag = record.looping_flag ?? out.looping_flag;

    return out;
}

// box
export enum BOX_TYPE {
    DEFAULT,
    START_ZONE,
    END_ZONE
};

export class box_t {
    type: BOX_TYPE;
    transform: transform_t;
    geometry: geometry_t;
    body: body_t;
    style: style_t;
    animation: animation_t|null;
    platform_flag: boolean;
    death_flag: boolean;
    drag_position: vec2_t;
    drag_size: vec2_t;
};

export function box_new(): box_t {
    const out = new box_t();
    out.type = BOX_TYPE.DEFAULT;
    out.transform = transform_new();
    out.geometry = geometry_new();
    out.body = body_new();
    out.style = style_new();
    out.animation = null;
    out.platform_flag = false;
    out.death_flag = false;
    out.drag_position = vec2();
    out.drag_size = vec2();

    return out;
}

export function box_clone(box: box_t): box_t {
    const out = new box_t();
    out.type = box.type;
    out.transform = transform_clone(box.transform);
    out.geometry = geometry_clone(box.geometry);
    out.body = body_clone(box.body);
    out.style = style_clone(box.style);
    out.animation = box.animation ? animation_clone(box.animation) : null;
    out.platform_flag = box.platform_flag;
    out.death_flag = box.death_flag;
    out.drag_position = vec2n_copy(box.drag_position);
    out.drag_size = vec2n_copy(box.drag_size);

    return out;
}

export function box_serialize(box: box_t): Record<string, any> {
    return {
        type: box.type,
        transform: transform_serialize(box.transform),
        geometry: geometry_serialize(box.geometry),
        body: body_serialize(box.body),
        style: style_serialize(box.style),
        animation: box.animation ? animation_serialize(box.animation) : null,
        platform_flag: box.platform_flag,
        death_flag: box.death_flag,
        drag_position: vec_serialize(box.drag_position),
        drag_size: vec_serialize(box.drag_size)
    };
}

export function box_deserialize(record: Record<string, any>): box_t {
    const out = new box_t();
    out.type = record.type ?? out.type;
    out.transform = transform_deserialize(record.transform) ?? out.transform;
    out.geometry = geometry_deserialize(record.geometry) ?? out.geometry;
    out.body = body_deserialize(record.body) ?? out.body;
    out.style = style_deserialize(record.style) ?? out.style;
    out.animation = record.animation ? animation_deserialize(record.animation) : null;
    out.platform_flag = record.platform_flag ?? out.platform_flag;
    out.death_flag = record.death_flag ?? out.death_flag;
    out.drag_position = vec_deserialize(record.drag_position, 2) ?? out.drag_position;
    out.drag_size = vec_deserialize(record.drag_size, 2) ?? out.drag_size;

    return out;
}

// box_preset
export enum BOX_PRESET {
    GROUND,
    BRICK,
    SPIKES,
    MOVER,
    START_ZONE,
    END_ZONE,
    EFFECT,
    PORTAL,
    SHOOTER
};

export function box_ground(position: vec2_t, size: vec2_t): box_t {
    const box = box_new();
    vec2_copy(box.transform.position, position);
    vec2_copy(box.geometry.size, size);
    box.style.inner_color = vec4(128, 100, 97, 255);
    box.style.outer_color = vec4(40, 199, 135, 255);
    vec4_set(box.style.option, OPT_MASK.DEFAULT, OPT_BORDER.TOP, OPT_TEXTURE.FLAT, OPT_SELECT.FALSE);
    box.style.params[0] = 1.0;

    return box;
}

export function box_brick(position: vec2_t, size: vec2_t): box_t {
    const box = box_new();
    vec2_copy(box.transform.position, position);
    vec2_copy(box.geometry.size, size);
    box.style.inner_color = vec4(212, 133, 91, 255);
    box.style.outer_color = vec4(145, 145, 145, 255);
    vec4_set(box.style.option, OPT_MASK.DEFAULT, OPT_BORDER.ALL, OPT_TEXTURE.BRICK, OPT_SELECT.FALSE);
    box.style.params[0] = 0.1;
    box.style.params[1] = 1.0;
    box.style.params[2] = 0.5;

    return box;
}

export function box_spikes(position: vec2_t, size: vec2_t): box_t {
    const box = box_new();
    vec2_copy(box.transform.position, position);
    vec2_copy(box.geometry.size, size);
    box.style.inner_color = vec4(207, 207, 207, 255);
    box.style.outer_color = vec4(207, 207, 207, 255);
    vec4_set(box.style.option, OPT_MASK.SPIKES, OPT_BORDER.NONE, OPT_TEXTURE.FLAT, OPT_SELECT.FALSE);
    box.style.params[0] = 1.0;
    box.death_flag = true;

    return box;
}

export function box_mover(size: vec2_t, start: vec2_t, end: vec2_t, force: number, dir: number): box_t {
    const box = box_new();
    box.type = BOX_TYPE.DEFAULT;
    vec2_copy(box.transform.position, start);
    vec2_copy(box.geometry.size, size);
    box.body.mass = 10.0;
    box.body.restitution = 0.3;
    box.body.dynamic_flag = true;
    box.style.inner_color = vec4(204, 204, 204, 255);
    box.style.outer_color = vec4(0, 0, 0, 255);
    vec4_set(box.style.option, OPT_MASK.DEFAULT, OPT_BORDER.ALL, OPT_TEXTURE.FLAT, OPT_SELECT.FALSE);
    box.style.params[0] = 0.1;
    box.animation = animation_from(start, end, force, dir, true);

    return box;
}

export function box_start_zone(position: vec2_t, size: vec2_t): box_t {
    const box = box_new();
    box.type = BOX_TYPE.START_ZONE;
    vec2_copy(box.transform.position, position);
    vec2_copy(box.geometry.size, size);
    box.body.collision_flag = false;
    box.style.inner_color = vec4(0, 0, 0, 25);
    box.style.outer_color = vec4(178, 255, 161, 255);
    vec4_set(box.style.option, OPT_MASK.DEFAULT, OPT_BORDER.ALL, OPT_TEXTURE.FLAT, OPT_SELECT.FALSE);
    box.style.params[0] = 0.2;

    return box;
}

export function box_end_zone(position: vec2_t, size: vec2_t): box_t {
    const box = box_new();
    box.type = BOX_TYPE.END_ZONE;
    vec2_copy(box.transform.position, position);
    vec2_copy(box.geometry.size, size);
    box.body.collision_flag = false;
    box.style.inner_color = vec4(0, 0, 0, 25);
    box.style.outer_color = vec4(255, 131, 82, 255);
    vec4_set(box.style.option, OPT_MASK.DEFAULT, OPT_BORDER.ALL, OPT_TEXTURE.FLAT, OPT_SELECT.FALSE);
    box.style.params[0] = 0.2;

    return box;
}

// projectile
export class projectile_t {
    transform: transform_t;
    geometry: geometry_t;
    body: body_t;
    style: style_t;
    death_flag: boolean;
};

export function projectile_new(): projectile_t {
    const out = new projectile_t();
    out.transform = transform_new();
    out.geometry = geometry_new();
    out.body = body_new();
    out.style = style_new();
    out.death_flag = false;

    return out;
}

export function projectile_clone(projectile: projectile_t): projectile_t {
    const out = new projectile_t();
    out.transform = transform_clone(projectile.transform);
    out.geometry = geometry_clone(projectile.geometry);
    out.body = body_clone(projectile.body);
    out.style = style_clone(projectile.style);
    out.death_flag = projectile.death_flag;

    return out;
}

// player
export class player_t {
    transform: transform_t;
    geometry: geometry_t;
    body: body_t;
    contact: box_t|null;
    style: style_t;
};

export function player_new(): player_t {
    const out = new player_t();
    out.transform = transform_new();
    out.geometry = geometry_new();
    out.body = body_new();
    out.body.mass = 10.0;
    out.contact = null;
    out.style = style_new();

    return out;
}

export function player_clone(player: player_t): player_t {
    const out = new player_t();
    out.transform = transform_clone(player.transform);
    out.geometry = geometry_clone(player.geometry);
    out.body = body_clone(player.body);
    out.contact = player.contact;
    out.style = style_clone(player.style);

    return out;
}

// level
export class level_t {
    name: string;
    boxes: box_t[];
    start_zone: box_t;
    end_zone: box_t;
    bg_lower_color: vec3_t;
    bg_upper_color: vec3_t;
};

export function level_new(): level_t {
    const out = new level_t();
    out.name = "Level 1";
    out.boxes = [];
    level_add_box(out, box_ground(vec2(0.0, -4.0), vec2(32.0, 8.0)));
    out.start_zone = level_add_box(out, box_start_zone(vec2(-14.0, 2.0), vec2(4.0)));
    out.end_zone = level_add_box(out, box_end_zone(vec2(14.0, 2.0), vec2(4.0)));
    out.bg_lower_color = rgb(124, 198, 228);
    out.bg_upper_color = rgb(30, 116, 214);

    return out;
}

export function level_clone(level: level_t): level_t {
    const out = new level_t();
    out.name = level.name;
    out.boxes = level.boxes.map(box => box_clone(box));
    out.start_zone = out.boxes.find(b => b.type === BOX_TYPE.START_ZONE)!;
    out.end_zone = out.boxes.find(b => b.type === BOX_TYPE.END_ZONE)!;
    out.bg_lower_color = vec3n_copy(level.bg_lower_color);
    out.bg_upper_color = vec3n_copy(level.bg_upper_color);

    return out;
}

export function level_serialize(level: level_t): Record<string, any> {
    return {
        name: level.name,
        boxes: level.boxes.map(box_serialize),
        bg_lower_color: vec_serialize(level.bg_lower_color),
        bg_upper_color: vec_serialize(level.bg_upper_color)
    };
}

export function level_deserialize(out: level_t, record: Record<string, any>): level_t {
    out.name = record.name ?? out.name;
    out.boxes = (record.boxes || []).map((box_rec: any) => box_deserialize(box_rec));
    out.start_zone = out.boxes.find(b => b.type === BOX_TYPE.START_ZONE)!;
    out.end_zone = out.boxes.find(b => b.type === BOX_TYPE.END_ZONE)!;
    out.bg_lower_color = vec_deserialize(record.bg_lower_color, 3) ?? out.bg_lower_color;
    out.bg_upper_color = vec_deserialize(record.bg_upper_color, 3) ?? out.bg_upper_color;

    return out;
}

export function level_add_box(level: level_t, box: box_t): box_t {
    level.boxes.push(box);

    return box;
}

export function level_remove_box(level: level_t, box: box_t): void {
    const index = level.boxes.indexOf(box);

    if (index < 0) {
        return;
    }

    level.boxes.splice(index, 1);
}

export function level_to_json(level: level_t): string {
    return JSON.stringify(level_serialize(level));
}

export function level_from_json(level: level_t, str: string): level_t {
    const data = JSON.parse(str);

    return level_deserialize(level, data);
}
