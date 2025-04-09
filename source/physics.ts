import {vec2, vec2_add2, vec2_addmuls2, vec2_clamp2, vec2_clone, vec2_copy, vec2_dir1, vec2_dot, vec2_muls1, vec2_muls2, vec2_neg, vec2_refl, vec2_refl1, vec2_sub1, vec2_zero} from "@cl/vec2.ts";
import {deg90odd, pow} from "@cl/math.ts";
import {mtv_raabb_raabb2, overlap_raabb_raabb2_x} from "@cl/collision2.ts";
import {box_t, body_t, player_t, transform_t, projectile_t} from "./world.ts";
import {VEL_LIMIT} from "./config.ts";

export function box_left(box: box_t): number {
    const index = deg90odd(box.transform.rotation) ? 1 : 0;

    return box.transform.position[0] - box.geometry.size[index] / 2.0;
}

export function box_right(box: box_t): number {
    const index = deg90odd(box.transform.rotation) ? 1 : 0;

    return box.transform.position[0] + box.geometry.size[index] / 2.0;
}

export function box_down(box: box_t): number {
    const index = deg90odd(box.transform.rotation) ? 0 : 1;

    return box.transform.position[1] - box.geometry.size[index] / 2.0;
}

export function box_up(box: box_t): number {
    const index = deg90odd(box.transform.rotation) ? 0 : 1;

    return box.transform.position[1] + box.geometry.size[index] / 2.0;
}

export function player_left(box: player_t): number {
    return box.transform.position[0] - box.geometry.size[0] / 2.0;
}

export function player_right(box: player_t): number {
    return box.transform.position[0] + box.geometry.size[0] / 2.0;
}

export function player_down(box: player_t): number {
    return box.transform.position[1] - box.geometry.size[1] / 2.0;
}

export function player_up(box: player_t): number {
    return box.transform.position[1] + box.geometry.size[1] / 2.0;
}

export class phys_t {
    boxes: box_t[];
    static_boxes: box_t[];
    dynamic_boxes: box_t[];
    kinematic_boxes: box_t[];
    projectiles: projectile_t[];
    touching_curr: box_t[];
    touching_prev: box_t[];
    on_touch_start: (box: box_t) => void;
    on_touch_end: (box: box_t) => void;
};

export function phys_new(): phys_t {
    const phys = new phys_t();
    phys.boxes = [];
    phys.dynamic_boxes = [];
    phys.kinematic_boxes = [];
    phys.projectiles = [];
    phys.touching_curr = [];
    phys.touching_prev = [];
    phys.on_touch_start = function() {}
    phys.on_touch_end = function() {}

    return phys;
}

export function categorize_boxes(phys: phys_t, boxes: box_t[]) {
    phys.boxes = [];
    phys.static_boxes = [];
    phys.dynamic_boxes = [];
    phys.kinematic_boxes = [];

    for (const box of boxes) {
        const body = box.body;

        phys.boxes.push(box);

        if (body.dynamic_flag) {
            phys.dynamic_boxes.push(box);
        } else {
            phys.static_boxes.push(box)
        }

        if (box.animation) {
            phys.kinematic_boxes.push(box);
        }
    }

    phys.static_boxes.sort((a, b) => box_left(a) - box_left(b));
}

export function body_integrate(tranform: transform_t, body: body_t, step: number): void {
    vec2_addmuls2(tranform.position, body.velocity, step);

    vec2_copy(body.acceleration, vec2_muls1(body.force, 1.0 / body.mass));

    vec2_addmuls2(body.velocity, body.acceleration, step);

    vec2_muls2(body.velocity, pow(body.damping, step));

    vec2_zero(body.force);
}

export function phys_player_collision(phys: phys_t, player: player_t, box: box_t): boolean {
    const player_transform = player.transform;
    const player_geometry = player.geometry;
    const player_body = player.body;
    const box_transform = box.transform;
    const box_geometry = box.geometry;
    const box_body = box.body;

    const result = mtv_raabb_raabb2(
        player_transform.position, player_geometry.size, deg90odd(player_transform.rotation),
        box_transform.position, box_geometry.size, deg90odd(box_transform.rotation)
    );

    if (!result) {
        return false;
    }

    phys.touching_curr.push(box);
    phys.on_touch_start(box);

    if (box_body.collision_flag) {
        if (result.dir[1] > 0.0) {
            player.contact = box;
        }

        // resolve interpenetration
        vec2_addmuls2(player_transform.position, result.dir, result.depth);

        // resolve velocity
        const relative_velocity = vec2_sub1(player_body.velocity, box_body.velocity);
        const normal_velocity = vec2_dot(relative_velocity, result.dir);
        const tangent = vec2(-result.dir[1], result.dir[0]);
        const tangential_velocity = vec2_dot(relative_velocity, tangent);

        if (normal_velocity < 0) {
            const inv_mass0 = 1.0 / player_body.mass;
            const inv_mass1 = 1.0 / box_body.mass;

            // normal impulse
            const restitution = Math.min(player_body.restitution, box_body.restitution);
            const normal_impluse_mag = -(1.0 + restitution) * normal_velocity / (inv_mass0 + inv_mass1);
            const normal_impulse = vec2_muls1(result.dir, normal_impluse_mag * inv_mass0);
            vec2_add2(player_body.velocity, normal_impulse);

            // friction impulse
            const friction = Math.sqrt(player_body.friction * box_body.friction) * Math.abs(normal_impluse_mag);
            let friction_impulse_mag = -tangential_velocity / (inv_mass0 + inv_mass1);
            friction_impulse_mag = Math.max(-friction, Math.min(friction_impulse_mag, friction));
            const friction_impulse = vec2_muls1(tangent, friction_impulse_mag * inv_mass0 * 2.0); // multiply by 2.0 when applying to 1 body

            vec2_add2(player_body.velocity, friction_impulse);
        }

        // clamp velocity
        vec2_clamp2(player_body.velocity, vec2(-VEL_LIMIT), vec2(VEL_LIMIT));
    }

    return true;
}

export function phys_projectile_collision(phys: phys_t, projectile: projectile_t, box: box_t): boolean {
    const player_transform = projectile.transform;
    const player_geometry = projectile.geometry;
    const player_body = projectile.body;
    const box_transform = box.transform;
    const box_geometry = box.geometry;
    const box_body = box.body;

    const result = mtv_raabb_raabb2(
        player_transform.position, player_geometry.size, deg90odd(player_transform.rotation),
        box_transform.position, box_geometry.size, deg90odd(box_transform.rotation)
    );

    if (!result) {
        return false;
    }

    if (box_body.collision_flag) {
        // resolve interpenetration
        vec2_addmuls2(player_transform.position, result.dir, result.depth);

        // resolve velocity
        const relative_velocity = vec2_sub1(player_body.velocity, box_body.velocity);
        const normal_velocity = vec2_dot(relative_velocity, result.dir);
        const tangent = vec2(-result.dir[1], result.dir[0]);
        const tangential_velocity = vec2_dot(relative_velocity, tangent);

        if (normal_velocity < 0) {
            const inv_mass0 = 1.0 / player_body.mass;
            const inv_mass1 = 1.0 / box_body.mass;

            // normal impulse
            const restitution = 1.0;
            // const restitution = Math.min(player_body.restitution, box_body.restitution);
            const normal_impluse_mag = -(1.0 + restitution) * normal_velocity / (inv_mass0 + inv_mass1);
            const normal_impulse = vec2_muls1(result.dir, normal_impluse_mag * inv_mass0);
            vec2_add2(player_body.velocity, normal_impulse);

            // friction impulse
            const friction = Math.sqrt(player_body.friction * box_body.friction) * Math.abs(normal_impluse_mag);
            let friction_impulse_mag = -tangential_velocity / (inv_mass0 + inv_mass1);
            friction_impulse_mag = Math.max(-friction, Math.min(friction_impulse_mag, friction));
            const friction_impulse = vec2_muls1(tangent, friction_impulse_mag * inv_mass0 * 2.0); // multiply by 2.0 when applying to 1 body

            vec2_add2(player_body.velocity, friction_impulse);
        }

        // clamp velocity
        vec2_clamp2(player_body.velocity, vec2(-VEL_LIMIT), vec2(VEL_LIMIT));
    }

    return true;
}

export function update_physics(phys: phys_t, player: player_t, delta_time: number): void {
    // apply force to kinematic bodies
    for (const box of phys.kinematic_boxes) {
        const transform = box.transform;
        const body = box.body;
        const animation = box.animation!;

        const move_direction = vec2_dir1(animation.end, animation.start);
        const to_current = vec2_sub1(transform.position, animation.start);
        const progress = vec2_dot(to_current, move_direction);
        const total_distance = vec2_dot(vec2_sub1(animation.end, animation.start), move_direction);

        if (progress > total_distance) {
            animation.dir = -1.0;
            // vec2_refl(body.velocity, move_direction, body.velocity);
        } else if (progress < 0.0) {
            animation.dir = 1.0;
            // vec2_refl(body.velocity, vec2_neg(vec2_clone(move_direction)), body.velocity);
        }

        vec2_add2(body.force, vec2_muls2(move_direction, animation.force * animation.dir));
    }

    // player forces
    const player_transform = player.transform;
    const player_geometry = player.geometry;
    const player_body = player.body;

    // apply gravity force to player
    vec2_add2(player_body.force, vec2(0.0, -2000.0));

    phys.touching_curr = [];

    // player collision
    for (let i = 0; i < phys.static_boxes.length; i += 1) {
        const box = phys.static_boxes[i];

        if (box_left(box) > player_right(player)) {
            break;
        }

        if (player_down(player) < box_up(box) && player_up(player) > box_down(box)) {
            phys_player_collision(phys, player, box);
        }
    }

    phys.dynamic_boxes.sort((a, b) => box_left(a) - box_left(b));

    for (let i = 0; i < phys.dynamic_boxes.length; i += 1) {
        const box = phys.dynamic_boxes[i];

        if (box_left(box) > player_right(player)) {
            break;
        }

        if (player_down(player) < box_up(box) && player_up(player) > box_down(box)) {
            phys_player_collision(phys, player, box);
        }
    }

    for (const box of phys.touching_prev) {
        if (phys.touching_curr.indexOf(box) < 0) {
            phys.on_touch_end(box);
        }
    }

    phys.touching_prev = [...phys.touching_curr];

    if (player.contact) {
        if (!overlap_raabb_raabb2_x(
            player_transform.position, player_geometry.size, false, player.contact.transform.position,
            player.contact.geometry.size, deg90odd(player.contact.transform.rotation)
        )) {
            player.contact = null;
        }
    }

    for (const projectile of phys.projectiles) {
        for (let i = 0; i < phys.static_boxes.length; i += 1) {
            const box = phys.static_boxes[i];

            if (box_left(box) > (projectile.transform.position[0] + projectile.geometry.radius)) {
                break;
            }

            if ((projectile.transform.position[1] - projectile.geometry.radius) < box_up(box) && (projectile.transform.position[1] + projectile.geometry.radius) > box_down(box)) {
                phys_projectile_collision(phys, projectile, box);
            }
        }

        for (let i = 0; i < phys.dynamic_boxes.length; i += 1) {
            const box = phys.dynamic_boxes[i];

            if (box_left(box) > (projectile.transform.position[0] + projectile.geometry.radius)) {
                break;
            }

            if ((projectile.transform.position[1] - projectile.geometry.radius) < box_up(box) && (projectile.transform.position[1] + projectile.geometry.radius) > box_down(box)) {
                phys_projectile_collision(phys, projectile, box);
            }
        }
    }

    // itegration
    body_integrate(player_transform, player_body, delta_time);

    for (const box of phys.dynamic_boxes) {
        body_integrate(box.transform, box.body, delta_time);
    }

    for (const projectile of phys.projectiles) {
        body_integrate(projectile.transform, projectile.body, delta_time);
    }
}
