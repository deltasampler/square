import {vec2_t} from "@cl/type.ts";

export class body_t {
    position: vec2_t;
    rotation: number;
    radius: number;
    min: vec2_t;
    max: vec2_t;
};

export function body_circle(position: vec2_t, rotation: number, radius: number): body_t {
    const body = new body_t();
    body.position = position;
    body.rotation = rotation;
    body.radius = radius;

    return body;
}
