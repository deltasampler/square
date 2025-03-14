import {vec2_t} from "@cl/type.ts";
import {vec2_clone} from "@cl/vec2.ts";
import {vec3} from "@cl/vec3.ts";
import {animation_new, body_new, box_new, box_option_pack, box_t, BOX_TYPE, OPT_BORDER, OPT_MASK, OPT_TEXTURE} from "./entities.ts";

export function box_start_zone(position: vec2_t, size: vec2_t): box_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.restitution = 0.5;
    body.can_collide = false;

    const box = box_new();
    box.body = body;
    box.inner_color = vec3(0, 0, 0);
    box.outer_color = vec3(178, 255, 161);
    box.opacity = 0.1;
    box.border_width = 0.2;
    box.option = box_option_pack(OPT_MASK.DEFAULT, OPT_BORDER.ALL, OPT_TEXTURE.FLAT);
    box.type = BOX_TYPE.START_ZONE;

    return box;
}

export function box_end_zone(position: vec2_t, size: vec2_t): box_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.restitution = 0.5;
    body.can_collide = false;

    const box = box_new();
    box.body = body;
    box.inner_color = vec3(0, 0, 0);
    box.outer_color = vec3(255, 131, 82);
    box.opacity = 0.1;
    box.option = box_option_pack(OPT_MASK.DEFAULT, OPT_BORDER.ALL, OPT_TEXTURE.FLAT);
    box.type = BOX_TYPE.END_ZONE;

    return box;
}

export function box_ground(position: vec2_t, size: vec2_t): box_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.restitution = 0.5;

    const box = box_new();
    box.body = body;
    box.inner_color = vec3(128, 100, 97);
    box.outer_color = vec3(40, 199, 135);
    box.border_width = 1.0;
    box.option = box_option_pack(OPT_MASK.DEFAULT, OPT_BORDER.TOP, OPT_TEXTURE.FLAT);

    return box;
}

export function box_brick(position: vec2_t, size: vec2_t): box_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.restitution = 0.5;

    const box = box_new();
    box.body = body;
    box.inner_color = vec3(212, 133, 91);
    box.outer_color = vec3(145, 145, 145);
    box.border_width = 0.1;
    box.option = box_option_pack(OPT_MASK.DEFAULT, OPT_BORDER.ALL, OPT_TEXTURE.BRICK);

    return box;
}

export function box_spikes(position: vec2_t, size: vec2_t): box_t {
    const body = body_new();
    body.position = position;
    body.size = size;
    body.restitution = 0.5;

    const box = box_new();
    box.body = body;
    box.inner_color = vec3(207, 207, 207);
    box.outer_color = vec3(207, 207, 207);
    box.border_width = 1.0;
    box.opacity = 1.0;
    box.option = box_option_pack(OPT_MASK.SPIKES, OPT_BORDER.NONE, OPT_TEXTURE.FLAT);
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
    box.inner_color = vec3(204, 204, 204);
    box.outer_color = vec3(0, 0, 0);
    box.border_width = 0.1;
    box.option = box_option_pack(OPT_MASK.DEFAULT, OPT_BORDER.ALL, OPT_TEXTURE.FLAT);

    box.animation = animation_new(start, end, force, dir);

    return box;
}
