// sprites.js - 픽셀아트 선수(절차적 생성)와 경기장 배경
'use strict';

// ---------- 선수 ----------
// pose: { hipH, lean, thighL, shinL, thighR, shinR, armL, foreL, armR, foreR }
// 각도 단위는 도. 0 = 수직 아래, + = 앞(진행 방향)
const Athlete = (() => {
    const PAL = {
        player: { skin: '#f4c290', skinDark: '#c48a5a', shirt: '#e8382c', shirtDark: '#a3241c', shorts: '#fafafa', hair: '#2a1e1e', shoe: '#ffe066' },
        cpu:    { skin: '#e2b48a', skinDark: '#b07a50', shirt: '#2f6fe0', shirtDark: '#1e4aa0', shorts: '#f0f0f0', hair: '#4a2c14', shoe: '#e6e6e6' }
    };
    const r = a => a * Math.PI / 180;

    function runPose(p, lean) {
        const thigh = ph => 42 * Math.sin(ph);
        const bend = ph => Math.max(0, Math.min(95, 45 - 45 * Math.sin(ph - 0.5)));
        const tl = thigh(p), tr = thigh(p + Math.PI);
        return {
            hipH: 9 - Math.abs(Math.sin(p)) * 1.2, lean: lean == null ? 12 : lean,
            thighL: tl, shinL: tl - bend(p), thighR: tr, shinR: tr - bend(p + Math.PI),
            armL: -tl * 0.8 - 10, foreL: -tl * 0.8 + 80, armR: -tr * 0.8 - 10, foreR: -tr * 0.8 + 80
        };
    }
    const POSE = {
        stand:  { hipH: 10, lean: 0, thighL: 3, shinL: 3, thighR: -3, shinR: -3, armL: 5, foreL: 5, armR: -5, foreR: -5 },
        crouch: { hipH: 6, lean: 78, thighL: 75, shinL: -15, thighR: -35, shinR: -110, armL: -5, foreL: -5, armR: -8, foreR: -8 },
        set:    { hipH: 10, lean: 85, thighL: 55, shinL: 10, thighR: -30, shinR: -45, armL: 0, foreL: 0, armR: -4, foreR: -4 },
        win:    { hipH: 10, lean: -5, thighL: 6, shinL: 6, thighR: -6, shinR: -6, armL: 150, foreL: 175, armR: -150, foreR: -175 },
        fall:   { hipH: 3, lean: 95, thighL: 20, shinL: 10, thighR: -10, shinR: -20, armL: 60, foreL: 90, armR: 40, foreR: 70 },
        takeoff:{ hipH: 10, lean: 5, thighL: 70, shinL: 10, thighR: -25, shinR: -35, armL: 120, foreL: 160, armR: -40, foreR: -20 },
        fly:    { hipH: 10, lean: 10, thighL: 55, shinL: 35, thighR: 45, shinR: 25, armL: 150, foreL: 175, armR: 140, foreR: 170 },
        land:   { hipH: 5, lean: 35, thighL: 75, shinL: 45, thighR: 70, shinR: 40, armL: 70, foreL: 80, armR: 60, foreR: 70 },
        windup: { hipH: 9, lean: -12, thighL: 45, shinL: 20, thighR: -30, shinR: -40, armL: -150, foreL: -165, armR: 50, foreR: 70 },
        throw:  { hipH: 8, lean: 28, thighL: 55, shinL: 35, thighR: -40, shinR: -30, armL: 125, foreL: 150, armR: -30, foreR: -20 },
        hurdle: { hipH: 10, lean: 30, thighL: 88, shinL: 80, thighR: -10, shinR: -110, armL: 70, foreL: 75, armR: -60, foreR: -40 },
        stumble:{ hipH: 6, lean: 60, thighL: 40, shinL: 20, thighR: -20, shinR: -60, armL: 40, foreL: 80, armR: 20, foreR: 60 },
        spin:   { hipH: 8, lean: -8, thighL: 30, shinL: 20, thighR: -30, shinR: -30, armL: 85, foreL: 88, armR: 85, foreR: 88 },
        arch:   { hipH: 10, lean: -55, thighL: -30, shinL: -80, thighR: -20, shinR: -70, armL: -150, foreL: -170, armR: -140, foreR: -160 },
        matland:{ hipH: 4, lean: -80, thighL: 20, shinL: 60, thighR: 30, shinR: 70, armL: -120, foreL: -140, armR: -100, foreR: -120 }
    };
    // 창을 들고 달리는 포즈: 앞팔을 어깨 위로 올림
    function runPoseJavelin(p, lean) {
        const o = runPose(p, lean);
        o.armL = -140; o.foreL = -160;
        return o;
    }

    function draw(g, x, groundY, pose, pal, facing) {
        pal = pal || PAL.player;
        const F = facing || 1;
        const pt = (o, ang, len) => ({ x: o.x + Math.sin(r(ang)) * len * F, y: o.y + Math.cos(r(ang)) * len });
        const hip = { x: x, y: groundY - pose.hipH };
        const kneeL = pt(hip, pose.thighL, 5), footL = pt(kneeL, pose.shinL, 5);
        const kneeR = pt(hip, pose.thighR, 5), footR = pt(kneeR, pose.shinR, 5);
        const sh = { x: hip.x + Math.sin(r(pose.lean)) * 8 * F, y: hip.y - Math.cos(r(pose.lean)) * 8 };
        const elbL = pt(sh, pose.armL, 4), handL = pt(elbL, pose.foreL, 4);
        const elbR = pt(sh, pose.armR, 4), handR = pt(elbR, pose.foreR, 4);
        const head = { x: sh.x + Math.sin(r(pose.lean)) * 4 * F, y: sh.y - Math.cos(r(pose.lean)) * 4 };

        // 뒤쪽(먼 쪽) 팔·다리
        Draw.line(g, sh.x, sh.y, elbR.x, elbR.y, pal.skinDark, 2);
        Draw.line(g, elbR.x, elbR.y, handR.x, handR.y, pal.skinDark, 2);
        Draw.line(g, hip.x, hip.y, kneeR.x, kneeR.y, pal.skinDark, 2);
        Draw.line(g, kneeR.x, kneeR.y, footR.x, footR.y, pal.skinDark, 2);
        Draw.rect(g, footR.x - 1 + F, footR.y - 1, 3, 2, pal.shoe);
        // 몸통
        Draw.line(g, hip.x, hip.y, sh.x, sh.y, pal.shirt, 4);
        Draw.rect(g, hip.x - 2, hip.y - 1, 4, 3, pal.shorts);
        // 머리
        Draw.rect(g, head.x - 2, head.y - 2, 5, 5, pal.skin);
        Draw.rect(g, head.x - 2, head.y - 3, 5, 2, pal.hair);
        Draw.rect(g, head.x - 2 - (F > 0 ? 0 : 1), head.y - 1, 2, 2, pal.hair);
        Draw.rect(g, head.x + (F > 0 ? 1 : -1), head.y, 1, 1, '#222');
        // 앞쪽 다리·팔
        Draw.line(g, hip.x, hip.y, kneeL.x, kneeL.y, pal.skin, 2);
        Draw.line(g, kneeL.x, kneeL.y, footL.x, footL.y, pal.skin, 2);
        Draw.rect(g, footL.x - 1 + F, footL.y - 1, 3, 2, pal.shoe);
        Draw.line(g, sh.x, sh.y, elbL.x, elbL.y, pal.skin, 2);
        Draw.line(g, elbL.x, elbL.y, handL.x, handL.y, pal.skin, 2);
        return { hip, shoulder: sh, head, hand: handL, handBack: handR, footL, footR };
    }

    // 창: (x,y) 에서 angle(라디안, 위쪽 양수) 방향으로 길이 len
    function drawJavelin(g, x, y, angle, len) {
        len = len || 24;
        const tx = x + Math.cos(angle) * len * 0.55, ty = y - Math.sin(angle) * len * 0.55;
        const bx = x - Math.cos(angle) * len * 0.45, by = y + Math.sin(angle) * len * 0.45;
        Draw.line(g, bx, by, tx, ty, '#d8d8e0', 1);
        Draw.line(g, x + Math.cos(angle) * len * 0.42, y - Math.sin(angle) * len * 0.42, tx, ty, '#606070', 1);
        Draw.rect(g, x - 1, y - 1, 2, 2, '#e04040');
    }

    // 허들: (x, groundY) 에 높이 h. fallen 이면 넘어진 모습
    function drawHurdle(g, x, groundY, h, fallen) {
        h = h || 13;
        if (fallen) {
            Draw.rect(g, x - 2, groundY - 3, 14, 2, '#e8e8e8');
            Draw.rect(g, x + 2, groundY - 3, 3, 2, '#202020');
            Draw.rect(g, x + 8, groundY - 3, 3, 2, '#202020');
            Draw.rect(g, x - 2, groundY - 1, 2, 1, '#909090'); Draw.rect(g, x + 10, groundY - 1, 2, 1, '#909090');
            return;
        }
        Draw.rect(g, x, groundY - h, 1, h, '#909090');
        Draw.rect(g, x + 6, groundY - h, 1, h, '#909090');
        Draw.rect(g, x - 2, groundY - 1, 4, 1, '#909090'); Draw.rect(g, x + 5, groundY - 1, 4, 1, '#909090');
        Draw.rect(g, x - 1, groundY - h, 9, 3, '#e8e8e8');
        Draw.rect(g, x + 1, groundY - h, 2, 3, '#202020');
        Draw.rect(g, x + 5, groundY - h, 2, 3, '#202020');
    }

    return { PAL, POSE, runPose, runPoseJavelin, draw, drawJavelin, drawHurdle };
})();

// ---------- 달리기 조작감 (모든 종목 공용) ----------
// 속도는 두드릴 때마다 GAIN 만큼 붙고, 초당 DRAG 비율로 줄어듭니다.
// 안정 속도 = GAIN x (초당 연타 수) / DRAG. 최고 속도까지 약 2초가 걸립니다.
const RunTune = {
    GAIN: 0.84,          // 한 번 두드릴 때 붙는 속도 (m/s)
    SAME_BTN: 0.7,       // 같은 패드를 연속으로 두드릴 때의 효율
    DRAG: 0.6,           // 초당 감속 비율
    VMAX: 11.6,          // 최고 속도 (m/s)
    // 연타 입력 처리: 속도를 올리고 새 속도를 돌려줌
    tap(p, name) {
        const gain = name !== p.lastBtn ? this.GAIN : this.GAIN * this.SAME_BTN;
        p.v = Math.min(this.VMAX, p.v + gain);
        p.lastBtn = name; p.taps = (p.taps || 0) + 1;
        return p.v;
    },
    // 매 프레임 감속과 이동
    step(p, dt) {
        p.v = Math.max(0, p.v - p.v * this.DRAG * dt);
        p.pos += p.v * dt;
        p.anim += p.v * dt * 1.5;
    }
};

// ---------- 경기장 ----------
const Stadium = (() => {
    const CROWD = ['#8a8070', '#8a3a30', '#2c4480', '#9a8a40', '#3a6a48', '#9a9aa0', '#8a5a40', '#5a3a70'];
    let tile = null;
    function crowdTile() {
        if (tile) return tile;
        tile = document.createElement('canvas'); tile.width = 256; tile.height = 32;
        const c = tile.getContext('2d');
        c.fillStyle = '#262c40'; c.fillRect(0, 0, 256, 32);
        for (let y = 0; y < 32; y += 3) for (let x = 0; x < 256; x += 2) {
            if (Math.random() < 0.3) continue;
            c.fillStyle = CROWD[Math.floor(Math.random() * CROWD.length)];
            c.fillRect(x, y, 2, 2);
        }
        return tile;
    }

    // 레이아웃 상수 (화면 상단 기준 논리 픽셀)
    const L = { skyH: 18, standTop: 18, standBot: 50, trackTop: 62, laneH: 22, lanes: 2 };
    L.trackBot = L.trackTop + L.laneH * L.lanes;
    L.groundY = i => L.trackTop + L.laneH * (i + 1) - 2;   // i번 레인의 발 위치

    // 하늘, 관중석, 난간, 잔디(트랙 위까지)
    function drawBackdrop(g, camX, W) {
        g.fillStyle = '#5ab4f0'; g.fillRect(0, 0, W, L.standTop);
        g.fillStyle = '#7cc4f4'; g.fillRect(0, L.standTop - 6, W, 6);
        const t = crowdTile();
        const off = ((Math.floor(camX * 0.5) % 256) + 256) % 256;
        for (let x = -off; x < W; x += 256) g.drawImage(t, x, L.standTop, 256, L.standBot - L.standTop);
        g.fillStyle = '#20243a'; g.fillRect(0, L.standTop, W, 2);
        g.fillStyle = '#e8e8e8'; g.fillRect(0, L.standBot, W, 3);
        g.fillStyle = '#3c9a3c'; g.fillRect(0, L.standBot + 3, W, L.trackTop - L.standBot - 3);
        g.fillStyle = '#2e7d2e'; g.fillRect(0, L.trackTop - 2, W, 2);
    }
    // 트랙 아래 잔디
    function drawGrassBelow(g, W, H) {
        g.fillStyle = '#3c9a3c'; g.fillRect(0, L.trackBot, W, H - L.trackBot);
        g.fillStyle = '#2e7d2e'; g.fillRect(0, L.trackBot + 1, W, 1);
    }
    // 레인이 있는 트랙과 거리 표시
    function drawTrack(g, camX, W, opt) {
        opt = opt || {};
        const PPM = opt.ppm || 12, len = opt.length || 100;
        g.fillStyle = '#c2553e'; g.fillRect(0, L.trackTop, W, L.trackBot - L.trackTop);
        g.fillStyle = '#ffffff';
        for (let i = 0; i <= L.lanes; i++) g.fillRect(0, L.trackTop + i * L.laneH, W, 1);
        const start = Math.floor(camX / PPM / 10) * 10 - 10;
        for (let m = Math.max(0, start); m <= len; m += 10) {
            const x = Math.round(m * PPM - camX);
            if (x < -30 || x > W + 10) continue;
            g.fillStyle = 'rgba(255,255,255,0.55)';
            g.fillRect(x, L.trackTop, 1, L.trackBot - L.trackTop);
            Font.text(g, String(m), x + 3, L.trackTop + 2, { color: 'rgba(255,255,255,0.8)' });
        }
        const sx = Math.round(0 - camX), fx = Math.round(len * PPM - camX);
        g.fillStyle = '#ffffff'; g.fillRect(sx - 1, L.trackTop, 2, L.trackBot - L.trackTop);
        g.fillRect(fx - 1, L.trackTop, 3, L.trackBot - L.trackTop);
        for (let y = L.trackTop; y < L.trackBot; y += 4) { g.fillStyle = '#222'; g.fillRect(fx + 2, y + ((y / 4) % 2 ? 2 : 0), 2, 2); }
    }
    function draw(g, camX, W, H, opt) {
        drawBackdrop(g, camX, W);
        drawTrack(g, camX, W, opt);
        drawGrassBelow(g, W, H);
    }

    return { L, draw, drawBackdrop, drawTrack, drawGrassBelow };
})();
