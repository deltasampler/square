import {LEVEL_KEYS, LEVELS} from "./levels.ts";

const LEVELS_KEY = "levels";

export function store_get_levels(): Record<string, any> {
    const json = localStorage.getItem(LEVELS_KEY) ?? '[]';
    const levels = JSON.parse(json) ?? [];

    return levels;
}

export function store_set_levels(levels: Record<string, any>): void {
    localStorage.setItem(LEVELS_KEY, JSON.stringify(levels));
}

export function store_add_level(name: string): void {
    const levels = store_get_levels();

    if (levels.indexOf(name) < 0) {
        levels.push(name);
    }

    store_set_levels(levels);
}

export function store_set_level(level: Record<string, any>): void {
    localStorage.setItem(level.name, JSON.stringify(level));
}

export function store_get_level(name: string): Record<string, any>|null {
    const json = localStorage.getItem(name);

    if (!json) {
        return null;
    }

    const level = JSON.parse(json) ?? {};

    if (!level.name) {
        return null;
    }

    return level
}

export function store_default_levels() {
    const levels = store_get_levels();

    if (levels.length) {
        return;
    }

    store_set_levels(LEVEL_KEYS);

    for (let i = 0; i < LEVEL_KEYS.length; i += 1) {
        const key = LEVEL_KEYS[i];
        localStorage.setItem(key, LEVELS[i]);
    }
}
