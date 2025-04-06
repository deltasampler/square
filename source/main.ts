import {gui_window, gui_canvas, gui_render, gui_window_grid, unit, UT, gui_window_layout} from "@gui/gui.ts";
import {gl_init} from "@engine/gl.ts";
import {cam2_compute_proj, cam2_compute_view, cam2_new} from "@cl/cam2.ts";
import {min, rad} from "@cl/math.ts";
import {box_t, BOX_TYPE, level_clone, level_new, player_new} from "./world.ts";
import {vec2, vec2_add2, vec2_copy, vec2_lerp1} from "@cl/vec2.ts";
import {box_rdata_build, box_rdata_instance, box_rdata_new, box_rend_build, box_rend_init, box_rend_render} from "./box_rend.ts";
import {clear_select_boxes, editor_camera_controls, editor_gui_window, editor_kb_key_down, editor_m_button_down, editor_m_button_up, editor_m_move, editor_new, editor_rend_grid, editor_rend_init, editor_rend_selection} from "./editor.ts";
import {io_init, io_kb_key_down, io_key_down, io_m_button_down, io_m_button_up, io_m_move, kb_event_t, m_event_t} from "@engine/io.ts";
import {bg_rdata_new, bg_rend_init, bg_rend_render} from "@engine/bg_rend.ts";
import {categorize_boxes, phys_new, update_physics} from "./physics.ts";
import {player_rend_init, player_rend_render} from "./player_rend.ts";
import {create_timer_el, format_time} from "./timer.ts";
import {BOX_LIMIT, WORLD_SIZE} from "./config.ts";
import {vec3_copy} from "@cl/vec3.ts";
import {store_default_levels} from "./storage.ts";

store_default_levels();

const style = document.createElement("style");
style.innerHTML = `
    .fullscreen {
        width: 100vw;
        height: 100vh;
        position: absolute;
        top: 0;
        left: 0;
    }
`;

document.head.append(style);

// init gl
const canvas_el = document.createElement("canvas");
const gl = gl_init(canvas_el);

// init io
io_init();

// variables
let delta_time = 0;
let time = 0;
let last_time = 0;

let editor_flag = true;
const editor = editor_new();

let game_level = level_new();
const game_camera = cam2_new();
const game_phys = phys_new();

const timer_el = create_timer_el(document.body);
let timer = 0;
let is_timer_running = false;
let is_in_start_zone = false;

game_phys.on_touch_start = function(box: box_t) {
    if (!is_in_start_zone && box.type === BOX_TYPE.START_ZONE) {
        is_in_start_zone = true;
        timer = 0.0;
        is_timer_running = false;
    }
    
    if (box.type === BOX_TYPE.END_ZONE) {
        is_timer_running = false;
    }
    
    if (box.death_flag) {
        if (box.death_flag) {
            vec2_copy(player.transform.position, level.start_zone.transform.position);
        }
    }
}

game_phys.on_touch_end = function(box: box_t) {
    if (box.type === BOX_TYPE.START_ZONE) {
        is_in_start_zone = false;
        is_timer_running = true;
    }
}

let level = editor.level;
let camera = editor.camera;
let player = player_new();

// init renderers
const bg_rdata = bg_rdata_new(editor.level.bg_lower_color, editor.level.bg_upper_color);

const box_rdata = box_rdata_new();
box_rdata_build(box_rdata, BOX_LIMIT);
box_rdata.len = 0;

bg_rend_init();

box_rend_init();
box_rend_build(box_rdata);

player_rend_init();

editor_rend_init();

gl.enable(gl.BLEND)
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.enable(gl.CULL_FACE);

// input events
io_m_move(function(event: m_event_t): void {
    if (event.target !== canvas_el) {
        return;
    }

    if (editor_flag) {
        editor_m_move(event, editor, canvas_el.width, canvas_el.height);
    }
});

io_m_button_down(function(event: m_event_t): void {
    if (event.target !== canvas_el) {
        return;
    }

    if (editor_flag) {
        editor_m_button_down(event, editor, canvas_el.width, canvas_el.height);
    }
});

io_m_button_up(function(event: m_event_t): void {
    if (event.target !== canvas_el) {
        return;
    }

    if (editor_flag) {
        editor_m_button_up(event, editor);
    }
});

io_kb_key_down(function(event: kb_event_t): void {
    if (event.code === "Backquote") {
        editor_flag = !editor_flag;

        if (editor_flag) {
            camera = editor.camera;
            level = editor.level;
            canvas_el.classList.remove("fullscreen");
            canvas_el.width = canvas_el.parentElement!.clientWidth;
            canvas_el.height = canvas_el.parentElement!.clientHeight;
            timer_el.style.display = "none";
        } else {
            camera = game_camera;
            clear_select_boxes(editor);
            game_level = level_clone(editor.level);
            level = game_level;
            player = player_new();
            vec2_copy(player.transform.position, game_level.start_zone.transform.position);
            canvas_el.classList.add("fullscreen");
            canvas_el.width = window.innerWidth;
            canvas_el.height = window.innerHeight;
            timer_el.style.display = "block";
            categorize_boxes(game_phys, level.boxes);
        }
    }

    if (editor_flag) {
        editor_kb_key_down(event, editor);
    } else {
        if (event.code === "KeyR") {
            vec2_copy(player.transform.position, level.start_zone.transform.position);
        }
    }
});

function update(): void {
    if (editor_flag) {
        editor_camera_controls(editor);
    } else {
        camera.position = vec2_lerp1(camera.position, player.transform.position, 0.05);
    }

    cam2_compute_proj(camera, canvas_el.width, canvas_el.height);
    cam2_compute_view(camera);

    if (!editor_flag) {
        // apply control forces to player
        const force = player.contact ? 3000.0 : 1500.0;

        if (io_key_down("KeyA")) {
            vec2_add2(player.body.force, vec2(-force, 0.0));
        }

        if (io_key_down("KeyD")) {
            vec2_add2(player.body.force, vec2(force, 0.0));
        }

        // apply jump force to player
        if (io_key_down("Space") && player.contact) {
            player.body.velocity[1] = 80.0;
            player.contact = null;
        }

        update_physics(game_phys, player, delta_time);

        if (Math.abs(player.transform.position[0]) > WORLD_SIZE || Math.abs(player.transform.position[1]) > WORLD_SIZE) {
            vec2_copy(player.transform.position, level.start_zone.transform.position);
        }
    }
}

function render(): void {
    gl.viewport(0, 0, canvas_el.width, canvas_el.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const boxes = level.boxes;

    for (let i = 0; i < boxes.length; i += 1) {
        const box = boxes[i];

        box_rdata_instance(
            box_rdata,
            i,
            box.transform.position,
            box.geometry.size,
            rad(box.transform.rotation),
            box.style.zindex,
            box.style.inner_color,
            box.style.outer_color,
            box.style.option,
            box.style.params
        );
    }

    vec3_copy(bg_rdata.lower_color, level.bg_lower_color);
    vec3_copy(bg_rdata.upper_color, level.bg_upper_color);

    bg_rend_render(bg_rdata, camera, 0.0);

    if (editor_flag) {
        editor_rend_grid(editor);
    }

    box_rdata.len = boxes.length;
    box_rend_render(box_rdata, camera);

    if (editor_flag) {
        editor_rend_selection(editor);
    } else {
        player_rend_render(player, camera);
    }

    if (is_timer_running) {
        timer += delta_time;
    }

    timer_el.innerHTML = format_time(timer);
}

function loop(): void {
    time = performance.now();
    delta_time = min((time - last_time) / 1000.0, 0.1);
    last_time = time;

    update();
    render();

    requestAnimationFrame(loop);
}

function gui(): void {
    const root = gui_window(null);
    gui_window_grid(
        root,
        [unit(300, UT.PX), unit(1, UT.FR), unit(300, UT.PX)],
        [unit(1, UT.FR), unit(1, UT.FR), unit(1, UT.FR)]
    );

    const left = gui_window(root);
    editor_gui_window(editor, left);

    const right = gui_window(root);
    const canvas = gui_canvas(right);
    canvas.canvas_el = canvas_el;

    gui_window_layout(
        root,
        [
            left, right, right,
            left, right, right,
            left, right, right
        ]
    );

    gui_render(root, document.body);
}

loop();
gui();
