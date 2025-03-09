import {vec2} from "@cl/vec2.ts";
import {box_ground, box_mover, box_shooter, level_new, level_t, player_new} from "./world.ts";

export function gen_level1(): level_t {
    const level = level_new();

    level.boxes.push(box_ground(vec2(0.0, -14.0), vec2(40.0, 2.0)));
    level.boxes.push(box_ground(vec2(-20.0, -5.0), vec2(10.0)));
    level.boxes.push(box_ground(vec2(0.0, -5.0), vec2(10.0)));
    level.boxes.push(box_ground(vec2(20.0, -5.0), vec2(10.0)));

    level.boxes.push(box_shooter(vec2(0.0, 12.0), vec2(1.0), vec2(-1.0, -1.0), 0.1, 1.0))

    for (let i = 0; i < 5; i += 1) {
        const offset = 5.0 + i * 5.0;
        level.boxes.push(box_mover(vec2(5, 1.0), vec2(-40.0, offset), vec2(40.0, offset), Math.random(), 0.1))
    }

    level.player = player_new(vec2(0.0, 10.0), vec2(1.0));

    return level;
}
