import {vec2_t} from "@cl/type.ts";
import {vec2} from "@cl/vec2.ts";
import {level_new, level_t} from "./entities.ts";
import {box_brick, box_end_zone, box_ground, box_mover, box_spikes, box_start_zone} from "./presets.ts";

function extract_vec2(array: any): vec2_t {
    if (!array) {
        array = [];
    }

    return vec2(array[0] ?? 0, array[1] ?? 0.0);
}

export function load_level(json: string): level_t {
    const level = level_new();
    const data = JSON.parse(json);
    const entities = data.entities;
    const start_zone_position = extract_vec2(data.start_zone_position);
    const start_zone_size = extract_vec2(data.start_zone_size);
    const end_zone_position = extract_vec2(data.end_zone_position);
    const end_zone_size = extract_vec2(data.end_zone_size);

    level.spawn_point = extract_vec2(data.spawn_point);
    level.start_zone = box_start_zone(start_zone_position, start_zone_size);
    level.end_zone = box_end_zone(end_zone_position, end_zone_size);
    level.boxes.push(level.start_zone);
    level.boxes.push(level.end_zone);

    for (const entity of entities) {
        if (entity.type === "ground") {
            const position = extract_vec2(entity.position);
            const size = extract_vec2(entity.size);

            level.boxes.push(box_ground(position, size));
        } else if (entity.type === "mover") {
            const size = extract_vec2(entity.size);
            const start = extract_vec2(entity.start);
            const end = extract_vec2(entity.end);
            const force = entity.force;
            const dir = entity.dir;

            level.boxes.push(box_mover(size, start, end, force, dir));
        } else if (entity.type === "spikes") {
            const position = extract_vec2(entity.position);
            const size = extract_vec2(entity.size);

            level.boxes.push(box_spikes(position, size));
        } else if (entity.type === "brick") {
            const position = extract_vec2(entity.position);
            const size = extract_vec2(entity.size);
            const cell_size = extract_vec2(entity.cell_size);
            const box = box_brick(position, size);
            box.params[1] = cell_size[0];
            box.params[2] = cell_size[1];

            level.boxes.push(box);
        }
    }

    return level;
}
