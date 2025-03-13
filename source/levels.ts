import {vec2} from "@cl/vec2.ts";
import {box_ground, box_mover, level_new, level_t, player_new} from "./world.ts";
import { rand, rand_in } from "@cl/math.ts";

export function gen_level1(): level_t {
    const level = level_new();

    level.boxes.push(box_ground(vec2(0.0, -14.0), vec2(40.0, 2.0)));
    level.boxes.push(box_ground(vec2(-20.0, -5.0), vec2(10.0)));
    level.boxes.push(box_ground(vec2(0.0, -5.0), vec2(10.0)));
    level.boxes.push(box_ground(vec2(20.0, -5.0), vec2(10.0)));

    for (let i = 0; i < 10; i += 1) {
        const offset = 5.0 + i * 5.0;
        level.boxes.push(box_mover(vec2(5, 1.0), vec2(-10.0, offset), vec2(10.0, offset), Math.random(), 500.0))
    }

    level.player = player_new(vec2(0.0, 15.0), vec2(1.0));

    return level;
}

export function gen_level2(): level_t {
    const level = level_new();

    level.player = player_new(vec2(0.0, 8.0), vec2(1.0));

    level.boxes.push(box_ground(vec2(0.0, -16.0), vec2(16.0, 16.0)));

    for (let i = 0; i < 10; i += 1) {
        level.boxes.push(box_ground(vec2(i * rand_in(-3, 3), i * 6.0), vec2(2.0, 2.0)));
    }

    return level;
}

