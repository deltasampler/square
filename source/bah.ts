import {body_t} from "./body.ts";
import {circle_ab, circle_area, circle_growth, circle_new, circle_overlap, circle_t} from "@cl/circle.ts";

export class pair_t {
    body0: body_t;
    body1: body_t;
};

export function pair_new(body0: body_t, body1: body_t) {
    const pair = new pair_t();
    pair.body0 = body0;
    pair.body1 = body1;

    return pair;
}

export class bah_node_t {
    id: number;
    ba: circle_t;
    parent: bah_node_t|null;
    child0: bah_node_t|null;
    child1: bah_node_t|null;
    body: body_t|null;
};

let bah_node_id = 0;

export function bah_node_new(ba: circle_t, parent: bah_node_t|null, body: body_t|null = null) {
    const node = new bah_node_t();
    node.id = bah_node_id++;
    node.ba = ba;
    node.parent = parent;
    node.child0 = null;
    node.child1 = null;
    node.body = body;

    return node;
}

export function bah_node_is_leaf(node: bah_node_t): boolean {
    return node.body !== null;
}

export function bah_node_overlaps(node0: bah_node_t, node1: bah_node_t): boolean {
    return circle_overlap(node0.ba, node1.ba);
}

export function bah_node_recalc_ba(node: bah_node_t): void {
    if (bah_node_is_leaf(node)) {
        return;
    }

    node.ba = circle_ab(node.child0!.ba, node.child1!.ba);

    if (node.parent) {
        bah_node_recalc_ba(node.parent);
    }
}

export function bah_node_insert(node: bah_node_t, body: body_t): void {
    const ba = circle_new(body.position, body.radius);

    if (bah_node_is_leaf(node)) {
        node.child0 = bah_node_new(node.ba, node, node.body);
        node.child1 = bah_node_new(ba, node, body);
        node.body = null;

        bah_node_recalc_ba(node);
    } else {
        if (circle_growth(node.child0!.ba, ba) < circle_growth(node.child1!.ba, ba)) {
            bah_node_insert(node.child0!, body);
        } else {
            bah_node_insert(node.child1!, body);
        }
    }
}

export function bah_node_remove(node: bah_node_t): void {
    const parent = node.parent;

    if (parent) {
        let sib: bah_node_t;

        if (parent.child0 === node) {
            sib = parent.child1!;
        } else {
            sib = parent.child0!;
        }

        parent.ba = sib.ba;
        parent.body = sib.body;
        parent.child0 = sib.child0;
        parent.child1 = sib.child1;

        sib.parent = null;
        sib.body = null;
        sib.child0 = null;
        sib.child1 = null;

        bah_node_recalc_ba(parent);
    }

    if (node.child0) {
        node.child0.parent = null;
    }

    if (node.child1) {
        node.child1.parent = null;
    }
}

export function bah_potential_pairs(node: bah_node_t, pairs: pair_t[], limit: number): number {
    if (bah_node_is_leaf(node) || limit === 0) {
        return 0;
    }

    return bah_potential_pairs_with(node.child0!, node.child1!, pairs, limit);
}

export function bah_potential_pairs_with(node0: bah_node_t, node1: bah_node_t, pairs: pair_t[], limit: number): number {
    if (!bah_node_overlaps(node0, node1) || limit === 0) {
        return 0;
    }

    if (bah_node_is_leaf(node0) && bah_node_is_leaf(node1)) {
        pairs.push(pair_new(node0.body!, node1.body!));

        return 1;
    }

    if (bah_node_is_leaf(node1) || (!bah_node_is_leaf(node0) && circle_area(node0.ba) >= circle_area(node1.ba))) {
        const count = bah_potential_pairs_with(node0.child0!, node1, pairs, limit);

        if (limit > count) {
            return count + bah_potential_pairs_with(node0.child1!, node1, pairs, limit - count);
        } else {
            return count;
        }
    } else {
        const count = bah_potential_pairs_with(node0, node1.child0!, pairs, limit);

        if (limit > count) {
            return count + bah_potential_pairs_with(node0, node1.child1!, pairs, limit - count);
        } else {
            return count;
        }
    }
}
