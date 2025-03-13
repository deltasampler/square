import {pow} from "@cl/math";
import {vec2_t} from "@cl/type.ts";
import {vec2, vec2_addmuls2, vec2_copy, vec2_muls1, vec2_muls2, vec2_zero} from "@cl/vec2.ts";

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

export function body_integrate(body: body_t, step: number): void {
    vec2_addmuls2(body.position, body.vel, step);

    vec2_copy(body.acc, vec2_muls1(body.force, body.mass_inv));

    vec2_addmuls2(body.vel, body.acc, step);

    vec2_muls2(body.vel, pow(body.damping, step));

    vec2_zero(body.force);
}
