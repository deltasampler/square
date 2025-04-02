import {vec2_t} from "@cl/type.ts";
import {vec2_clone} from "@cl/vec2.ts";
import {vec4} from "@cl/vec4.ts";
import {animation_new, body_new, box_new, box_t, BOX_TYPE, OPT_BORDER, OPT_MASK, OPT_TEXTURE} from "./entities.ts";

export function box_start_zone(position: vec2_t, size: vec2_t): box_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.restitution = 0.5;
    body.can_collide = false;

    const box = box_new();
    box.type = BOX_TYPE.START_ZONE;
    box.body = body;
    box.inner_color = vec4(0, 0, 0, 25);
    box.outer_color = vec4(178, 255, 161, 255);
    box.option = vec4(OPT_MASK.DEFAULT, OPT_BORDER.ALL, OPT_TEXTURE.FLAT, 0);
    box.params[0] = 0.2;

    return box;
}

export function box_end_zone(position: vec2_t, size: vec2_t): box_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.restitution = 0.5;
    body.can_collide = false;

    const box = box_new();
    box.type = BOX_TYPE.END_ZONE;
    box.body = body;
    box.inner_color = vec4(0, 0, 0, 25);
    box.outer_color = vec4(255, 131, 82, 255);
    box.option = vec4(OPT_MASK.DEFAULT, OPT_BORDER.ALL, OPT_TEXTURE.FLAT, 0);
    box.params[0] = 0.2;

    return box;
}

export function box_ground(position: vec2_t, size: vec2_t): box_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.restitution = 0.5;

    const box = box_new();
    box.body = body;
    box.inner_color = vec4(128, 100, 97, 255);
    box.outer_color = vec4(40, 199, 135, 255);
    box.params[0] = 1.0;
    box.option = vec4(OPT_MASK.DEFAULT, OPT_BORDER.TOP, OPT_TEXTURE.FLAT, 0);

    return box;
}

export function box_brick(position: vec2_t, size: vec2_t): box_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.restitution = 0.5;

    const box = box_new();
    box.body = body;
    box.inner_color = vec4(212, 133, 91, 255);
    box.outer_color = vec4(145, 145, 145, 255);
    box.params[0] = 0.1;
    box.option = vec4(OPT_MASK.DEFAULT, OPT_BORDER.ALL, OPT_TEXTURE.BRICK, 0);

    return box;
}

export function box_spikes(position: vec2_t, size: vec2_t): box_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.restitution = 0.5;

    const box = box_new();
    box.body = body;
    box.inner_color = vec4(207, 207, 207, 255);
    box.outer_color = vec4(207, 207, 207, 255);
    box.params[0] = 1.0;
    box.option = vec4(OPT_MASK.SPIKES, OPT_BORDER.NONE, OPT_TEXTURE.FLAT, 0);
    box.is_death = true;

    return box;
}

export function box_mover(size: vec2_t, start: vec2_t, end: vec2_t, force: number, dir: number): box_t {
    const body = body_new();
    body.position = vec2_clone(start);
    body.size = size;
    body.mass_inv = 1.0 / 10.0;
    body.restitution = 0.3;
    body.is_dynamic = true;

    const box = box_new();
    box.body = body;
    box.inner_color = vec4(204, 204, 204, 255);
    box.outer_color = vec4(0, 0, 0, 255);
    box.params[0] = 0.1;
    box.option = vec4(OPT_MASK.DEFAULT, OPT_BORDER.ALL, OPT_TEXTURE.FLAT, 0);

    box.animation = animation_new(start, end, force, dir, true);

    return box;
}
