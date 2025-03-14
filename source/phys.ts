import {pow} from "@cl/math";
import {vec2_addmuls2, vec2_copy, vec2_muls1, vec2_muls2, vec2_zero} from "@cl/vec2.ts";
import { body_t } from "./entities";

export function body_integrate(body: body_t, step: number): void {
    vec2_addmuls2(body.position, body.vel, step);

    vec2_copy(body.acc, vec2_muls1(body.force, body.mass_inv));

    vec2_addmuls2(body.vel, body.acc, step);

    vec2_muls2(body.vel, pow(body.damping, step));

    vec2_zero(body.force);
}
