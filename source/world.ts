import {vec2_t, vec4_t} from "@cl/type.ts";
import {vec2, vec2_clamp, vec2_clone, vec2_lerp} from "@cl/vec2.ts";
import {rgba} from "@cl/vec4.ts";

export class rigid_body_t {
    is_dynamic: boolean;
    is_kinematic: boolean;
    can_collide: boolean;
    velocity: vec2_t;
    friction: number;
    restitution: number;
};

export class animation_t {
    start: vec2_t;
    end: vec2_t;
    factor: number;
    speed: number;
    dir: number;
};

export class shooter_t {
    force: number;
    dir: vec2_t;
    ball_size: number;
};

export class box_t {
    position: vec2_t;
    size: vec2_t;
    body: rigid_body_t;
    animation: animation_t|null;
    shooter: shooter_t|null;
    color: vec4_t;
};

export class ball_t {
    position: vec2_t;
    diameter: number;
    body: rigid_body_t;
    color: vec4_t;
};

export class laser_t {
    position: vec2_t;
    direction: vec2_t;
    segments: vec2_t[];
    color: vec4_t;
};

export class player_t {
    position: vec2_t;
    size: vec2_t;
    body: rigid_body_t;
    contact: box_t|null;
};

export class level_t {
    boxes: box_t[];
    balls: ball_t[];
    lasers: laser_t[];
    player: player_t;
};

export function rigid_body_new(): rigid_body_t {
    const body = new rigid_body_t();
    body.is_dynamic = false;
    body.is_kinematic = false;
    body.can_collide = true;
    body.velocity = vec2();
    body.friction = 0.2;
    body.restitution = 0.8;

    return body;
}

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
    box.position = position;
    box.size = size;
    box.body = rigid_body_new();
    box.animation = null;
    box.color = rgba(176.0, 176.0, 176.0, 255.0);

    return box;
}

export function box_mover(size: vec2_t, start: vec2_t, end: vec2_t, factor: number, speed: number): box_t {
    const box = new box_t();
    box.position = vec2_lerp(start, end, factor);
    box.size = size;
    box.body = rigid_body_new();
    box.body.is_dynamic = true;
    box.body.is_kinematic = true;
    box.animation = animation_new(start, end, factor, speed);
    box.color = rgba(176.0, 176.0, 176.0, 255.0);

    return box;
}

export function box_shooter(position: vec2_t, size: vec2_t, dir: vec2_t, force: number, ball_size: number): box_t {
    const box = new box_t();
    box.position = position;
    box.size = size;
    box.body = rigid_body_new();
    box.body.is_dynamic = false;
    box.body.is_kinematic = false;
    box.shooter = shooter_new(dir, force, ball_size);
    box.color = rgba(177.0, 113.0, 209.0, 255.0);

    return box;
}

export function player_new(position: vec2_t, size: vec2_t): player_t {
    const player = new player_t();
    player.position = position;
    player.size = size;
    player.body = rigid_body_new();
    player.contact = null;

    return player;
};

export function level_new(): level_t {
    const level = new level_t();
    level.boxes = [];
    level.balls = [];
    level.lasers = [];

    return level;
}

export function shooter_new(dir: vec2_t, force: number, ball_size: number) {
    const shooter = new shooter_t();
    shooter.dir = dir;
    shooter.force = force;
    shooter.ball_size = ball_size;

    return shooter;
}

export function ball_new(position: vec2_t, diameter: number, velocity: vec2_t): ball_t {
    const ball = new ball_t();
    ball.position = vec2_clone(position);
    ball.diameter = diameter;
    ball.body = rigid_body_new();
    ball.body.is_dynamic = true;
    ball.body.velocity = velocity;
    ball.color = rgba(255.0, 255.0, 255.0, 255.0);

    return ball;
}
