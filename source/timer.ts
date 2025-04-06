export function create_timer_el(parent: HTMLElement): HTMLDivElement {
    const timer_el = document.createElement("div");
    timer_el.className = "timer";
    timer_el.style.width = "100vw";
    timer_el.style.height = "100vh";
    timer_el.style.position = "absolute";
    timer_el.style.left = "0";
    timer_el.style.top = "0";
    timer_el.style.zIndex = "1";
    timer_el.style.fontSize = "48px";
    timer_el.style.color = "#ffffff";
    timer_el.style.lineHeight = "1.5";
    timer_el.style.textAlign = "center";
    timer_el.style.fontFamily = "monospace";
    timer_el.style.pointerEvents = "none";
    timer_el.innerHTML = "0:00.000";
    parent.append(timer_el);

    return timer_el;
}

export function format_time(str: number): string {
    const m = Math.floor(str / 60);
    const s = Math.floor(str % 60);
    const ms = Math.round((str % 1) * 1000);

    return (
        String(m).padStart(2, '0') + ":" +
        String(s).padStart(2, '0') + "." +
        String(ms).padStart(3, '0')
    );
}
