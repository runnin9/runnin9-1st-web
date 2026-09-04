// engine.js - 픽셀 캔버스, 터치 패드 입력, 사운드, 저장, 씬 관리, 네이티브 연동
'use strict';

const KR_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans KR", "Malgun Gothic", sans-serif';

// ---------- 저장 ----------
const Store = {
    KEY: 'r9athletics',
    load() { try { return JSON.parse(localStorage.getItem(this.KEY)) || {}; } catch (e) { return {}; } },
    save(d) { try { localStorage.setItem(this.KEY, JSON.stringify(d)); } catch (e) { /* 무시 */ } }
};

// ---------- 사운드 (칩튠 합성) ----------
const Sound = (() => {
    let ac = null;
    function unlock() {
        try {
            if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
            if (ac.state === 'suspended') ac.resume();
        } catch (e) { /* 오디오 미지원 */ }
    }
    function tone(f0, f1, dur, type, vol, delay) {
        if (!ac) return;
        try {
            const t = ac.currentTime + (delay || 0);
            const o = ac.createOscillator(), gn = ac.createGain();
            o.type = type || 'square';
            o.frequency.setValueAtTime(f0, t);
            o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
            gn.gain.setValueAtTime(vol, t);
            gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(gn); gn.connect(ac.destination);
            o.start(t); o.stop(t + dur);
        } catch (e) { /* 무시 */ }
    }
    function noise(dur, vol) {
        if (!ac) return;
        try {
            const n = Math.floor(ac.sampleRate * dur);
            const b = ac.createBuffer(1, n, ac.sampleRate);
            const d = b.getChannelData(0);
            for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
            const src = ac.createBufferSource(); src.buffer = b;
            const gn = ac.createGain(); gn.gain.value = vol;
            src.connect(gn); gn.connect(ac.destination); src.start();
        } catch (e) { /* 무시 */ }
    }
    return {
        unlock, tone, noise,
        step() { tone(200, 140, 0.035, 'square', 0.025); },
        beep() { tone(660, 660, 0.12, 'square', 0.06); },
        gun() { noise(0.3, 0.35); tone(150, 40, 0.25, 'sawtooth', 0.15); },
        fail() { tone(220, 50, 0.6, 'sawtooth', 0.1); },
        select() { tone(880, 1200, 0.06, 'square', 0.05); },
        jingle() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.16, 'square', 0.07, i * 0.12)); },
        record() { [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => tone(f, f, 0.14, 'square', 0.07, i * 0.1)); },
        over() { [400, 350, 300, 200].forEach((f, i) => tone(f, f * 0.9, 0.25, 'triangle', 0.09, i * 0.22)); }
    };
})();

// ---------- 네이티브 앱(Capacitor) 연동 (웹에서는 모두 건너뜀) ----------
const Native = (() => {
    const cap = window.Capacitor;
    const isNative = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
    const plugin = n => (isNative && cap.Plugins && cap.Plugins[n]) || null;
    function init(onBack) {
        if (!isNative) return;
        const sb = plugin('StatusBar');
        if (sb) { try { sb.hide(); } catch (e) {} }
        const app = plugin('App');
        if (app) { try { app.addListener('backButton', () => onBack(() => app.exitApp())); } catch (e) {} }
    }
    function haptic(style) {
        const h = plugin('Haptics');
        if (h) { try { h.impact({ style: style || 'MEDIUM' }); } catch (e) {} }
    }
    function vibrate(ms) {
        const h = plugin('Haptics');
        if (h) { try { h.vibrate({ duration: ms }); } catch (e) {} }
        else if (navigator.vibrate) { try { navigator.vibrate(ms); } catch (e) {} }
    }
    return { isNative, init, haptic, vibrate };
})();

// ---------- 픽셀 그리기 도우미 ----------
const Draw = {
    rect(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
    // 두께 t 의 픽셀 선
    line(g, x0, y0, x1, y1, c, t) {
        t = t || 2;
        const o = Math.floor(t / 2);
        x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
        const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
        let err = dx + dy;
        g.fillStyle = c;
        for (let i = 0; i < 400; i++) {
            g.fillRect(x0 - o, y0 - o, t, t);
            if (x0 === x1 && y0 === y1) break;
            const e2 = 2 * err;
            if (e2 >= dy) { err += dy; x0 += sx; }
            if (e2 <= dx) { err += dx; y0 += sy; }
        }
    },
    // 반투명 패널
    panel(g, x, y, w, h, fill, border) {
        g.fillStyle = fill || 'rgba(0,0,0,0.6)'; g.fillRect(x, y, w, h);
        if (border) { g.fillStyle = border; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); }
    }
};

// ---------- 엔진 ----------
const Engine = (() => {
    const BASE_H = 180, MIN_W = 320;
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const buf = document.createElement('canvas');
    const g = buf.getContext('2d');
    const S = { W: 320, H: 180, scale: 1, dpr: 1, portrait: false, time: 0, actionLabel: 'JUMP', leftHanded: false };
    let scene = null, pads = null, padsVisible = false;
    const pressed = {};            // 패드 이름 -> 눌린 손가락 수
    const pointers = new Map();    // pointerId -> 패드 이름
    const krQueue = [];            // 고해상도 레이어에 그릴 한글 텍스트

    function resize() {
        S.dpr = Math.min(window.devicePixelRatio || 1, 3);
        const cw = window.innerWidth, ch = window.innerHeight;
        S.portrait = ch > cw;
        const pw = Math.round(cw * S.dpr), ph = Math.round(ch * S.dpr);
        canvas.width = pw; canvas.height = ph;
        canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
        // 정수 배율로 확대해 픽셀이 또렷하게 보이도록 함
        S.scale = Math.max(1, Math.floor(Math.min(ph / BASE_H, pw / MIN_W)));
        S.W = Math.ceil(pw / S.scale); S.H = Math.ceil(ph / S.scale);
        buf.width = S.W; buf.height = S.H;
        g.imageSmoothingEnabled = false; ctx.imageSmoothingEnabled = false;
        layoutPads();
        if (scene && scene.resize) scene.resize();
    }
    function layoutPads() {
        // 엄지 크기의 작은 패드. RUN 은 양쪽 아래 모서리,
        // 점프/던지기 패드는 오른쪽 RUN 옆에 붙임 (왼손잡이 설정이면 좌우 반전)
        const W = S.W, H = S.H;
        const h = Math.round(H * 0.3), w = Math.round(W * 0.2), m = 6, gap = 8;
        const aw = Math.round(W * 0.2);
        const y = H - h - m;
        const L = { x: m, y, w, h, label: 'RUN' };
        const R = { x: W - w - m, y, w, h, label: 'RUN' };
        const A = S.leftHanded
            ? { x: m + w + gap, y, w: aw, h, label: '' }
            : { x: W - w - m - gap - aw, y, w: aw, h, label: '' };
        pads = { runL: L, action: A, runR: R };
    }
    const HIT_PAD = 10;   // 판정 여유 (그림보다 넓게)
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', () => setTimeout(resize, 120));

    // ----- 입력 -----
    function toLogical(e) {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * S.dpr / S.scale, y: (e.clientY - r.top) * S.dpr / S.scale };
    }
    function padAt(x, y) {
        if (!padsVisible) return null;
        let best = null, bestD = Infinity;
        for (const k in pads) {
            const p = pads[k];
            if (x < p.x - HIT_PAD || x >= p.x + p.w + HIT_PAD || y < p.y - HIT_PAD || y >= p.y + p.h + HIT_PAD) continue;
            const d = Math.abs(x - (p.x + p.w / 2)) + Math.abs(y - (p.y + p.h / 2));
            if (d < bestD) { bestD = d; best = k; }
        }
        return best;
    }
    function down(id, x, y) {
        const name = padAt(x, y) || 'screen';
        pointers.set(id, name);
        pressed[name] = (pressed[name] || 0) + 1;
        Sound.unlock();
        tryLockLandscape();
        if (scene && scene.onPress) scene.onPress(name, x, y);
    }
    function up(id) {
        const name = pointers.get(id);
        if (name == null) return;
        pointers.delete(id);
        pressed[name] = Math.max(0, (pressed[name] || 0) - 1);
        if (scene && scene.onRelease) scene.onRelease(name);
    }
    canvas.addEventListener('pointerdown', e => { e.preventDefault(); const p = toLogical(e); down(e.pointerId, p.x, p.y); });
    window.addEventListener('pointerup', e => up(e.pointerId));
    window.addEventListener('pointercancel', e => up(e.pointerId));
    document.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
    document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    document.addEventListener('contextmenu', e => e.preventDefault());

    const KEYS = { KeyZ: 'runL', ArrowLeft: 'runL', KeyX: 'runR', ArrowRight: 'runR', Space: 'action', ArrowUp: 'action', KeyC: 'action', Enter: 'screen' };
    window.addEventListener('keydown', e => {
        const name = KEYS[e.code];
        if (!name) return;
        e.preventDefault();
        if (e.repeat) return;
        const id = 'key:' + e.code;
        pointers.set(id, name); pressed[name] = (pressed[name] || 0) + 1;
        Sound.unlock();
        if (scene && scene.onPress) scene.onPress(name, S.W / 2, S.H / 2);
    });
    window.addEventListener('keyup', e => { if (KEYS[e.code]) up('key:' + e.code); });

    let lockTried = false;
    function tryLockLandscape() {
        if (lockTried || Native.isNative) return;
        lockTried = true;
        try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}
    }

    // ----- 한글 텍스트 (고해상도 레이어) -----
    function kr(str, x, y, o) { krQueue.push({ str, x, y, o: o || {} }); }
    // 논리 픽셀 단위 글자 폭
    function krWidth(str, size, bold) {
        ctx.font = (bold === false ? '' : 'bold ') + (size || 10) * S.scale + 'px ' + KR_FONT;
        return ctx.measureText(str).width / S.scale;
    }
    // maxW 안에 들어가도록 줄바꿈 (띄어쓰기 우선, 긴 단어는 글자 단위)
    function krWrap(str, size, maxW, bold) {
        const lines = [];
        for (const para of String(str).split('\n')) {
            let line = '';
            for (const word of para.split(' ')) {
                const cand = line ? line + ' ' + word : word;
                if (krWidth(cand, size, bold) <= maxW) { line = cand; continue; }
                if (line) lines.push(line);
                line = '';
                for (const ch of word) {
                    if (krWidth(line + ch, size, bold) <= maxW) line += ch;
                    else { lines.push(line); line = ch; }
                }
            }
            lines.push(line);
        }
        return lines;
    }
    function flushKr() {
        if (!krQueue.length) return;
        const s = S.scale;
        for (const t of krQueue) {
            const size = (t.o.size || 10) * s;
            ctx.font = (t.o.bold === false ? '' : 'bold ') + size + 'px ' + KR_FONT;
            ctx.textAlign = t.o.align || 'center';
            ctx.textBaseline = 'top';
            if (t.o.shadow !== false) { ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(t.str, t.x * s + s, t.y * s + s); }
            ctx.fillStyle = t.o.color || '#ffffff';
            ctx.fillText(t.str, t.x * s, t.y * s);
        }
        krQueue.length = 0;
    }

    // ----- 패드 / 회전 안내 -----
    function drawPads() {
        for (const k in pads) {
            const p = pads[k];
            const on = pressed[k] > 0;
            g.fillStyle = on ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.42)';
            g.fillRect(p.x + 1, p.y + 1, p.w - 2, p.h - 2);
            g.fillStyle = on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)';
            g.fillRect(p.x + 1, p.y + 1, p.w - 2, 1); g.fillRect(p.x + 1, p.y + p.h - 2, p.w - 2, 1);
            g.fillRect(p.x + 1, p.y + 1, 1, p.h - 2); g.fillRect(p.x + p.w - 2, p.y + 1, 1, p.h - 2);
            const label = k === 'action' ? S.actionLabel : p.label;
            if (!label) continue;
            const sc = p.w >= 6 * label.length * 2 + 8 ? 2 : 1;
            Font.text(g, label, p.x + p.w / 2, p.y + p.h / 2 - 3.5 * sc, { scale: sc, color: on ? '#ffffff' : 'rgba(255,255,255,0.8)', align: 'center' });
        }
    }
    function drawRotate() {
        const W = S.W, H = S.H;
        g.fillStyle = '#10122a'; g.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2 - 20;
        // 가로로 누운 폰 아이콘
        Draw.rect(g, cx - 22, cy - 12, 44, 24, '#e8e8f0');
        Draw.rect(g, cx - 19, cy - 9, 38, 18, '#3aa0e8');
        Draw.rect(g, cx + 20, cy - 2, 1, 4, '#333');
        Font.text(g, 'ROTATE', cx, cy + 20, { scale: 2, color: '#ffd95c', align: 'center' });
        kr('폰을 가로로 돌려주세요', cx, cy + 42, { size: 11 });
    }

    // ----- 루프 -----
    let last = performance.now();
    function frame(now) {
        let dt = (now - last) / 1000; last = now;
        if (dt > 0.1) dt = 0.1; if (dt < 0) dt = 0;
        S.time += dt;
        if (scene && scene.update) scene.update(dt);
        g.fillStyle = '#000'; g.fillRect(0, 0, S.W, S.H);
        if (scene && scene.draw) scene.draw(g);
        if (padsVisible) drawPads();
        if (S.portrait) { krQueue.length = 0; drawRotate(); }
        ctx.drawImage(buf, 0, 0, S.W * S.scale, S.H * S.scale);
        flushKr();
        requestAnimationFrame(frame);
    }

    function setScene(s) {
        if (scene && scene.exit) scene.exit();
        scene = s;
        padsVisible = !!(s && s.pads);
        pointers.clear(); for (const k in pressed) pressed[k] = 0;
        if (s && s.enter) s.enter();
    }
    function isPressed(name) { return pressed[name] > 0; }
    function setActionLabel(l) { S.actionLabel = l; }
    function setLeftHanded(v) { S.leftHanded = !!v; layoutPads(); }
    function start() { resize(); requestAnimationFrame(frame); }
    function isPortrait() { return S.portrait; }
    function currentScene() { return scene; }

    return { S, g, pads: () => pads, setScene, currentScene, isPressed, setActionLabel, setLeftHanded, kr, krWidth, krWrap, start, isPortrait };
})();
