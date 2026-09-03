// longjump.js - 멀리뛰기
// 조작: RUN 연타로 도움닫기 → 발구름판 앞에서 JUMP 를 누르면 도약, 누르는 동안 각도 상승, 떼면 확정.
'use strict';

const LongJump = {
    id: 'longjump', name: 'LONG JUMP', nameKr: '멀리뛰기',
    qualify: 6.50, wr: 8.90, lowerIsBetter: false,
    format: v => v.toFixed(2), unit: 'M',
    attempts: 3,
    hint: ['RUN 연타로 달려서 흰 발구름판 위에서 JUMP', 'JUMP 를 누르고 있으면 각도가 올라갑니다. 45도쯤에서 떼세요', '판을 지나서 뛰면 FOUL. 기회는 3번'],
    actionLabel: 'JUMP',

    TUNE: {
        PPM: 12,
        BOARD: 40,            // 파울 라인 위치 (m). 발구름판은 그 앞 1m
        BOARD_W: 1.0,         // 발구름판 폭 (m)
        GRACE: 0.15,          // 파울 라인을 살짝 넘긴 경우 봐주는 거리 (m)
        ANGLE_SPEED: 75,      // 초당 각도 상승 (도)
        POWER: 0.78           // 비거리 배율
    },

    create() {
        const ev = this, T = this.TUNE, L = Stadium.L, S = Engine.S;
        const G = 9.8;
        const st = { attempt: 0, best: 0, marks: [], gotNewBest: false };

        function newAttempt() {
            st.attempt++;
            st.phase = 'ready'; st.t = 0; st.msg = ''; st.timer = 0;
            st.p = { pos: 0, v: 0, anim: 0, lastBtn: null, taps: 0, y: 0 };
            st.jump = null;
        }
        function foul() {
            st.phase = 'land'; st.t = 0; st.result = null; st.msg = 'FOUL';
            st.marks.push(null);
            Sound.fail(); Native.vibrate(200);
        }
        function launch(angle) {
            const j = st.jump, p = st.p;
            const v = Math.max(p.v, 1), a = angle * Math.PI / 180;
            j.angle = angle;
            j.dist = (v * v * Math.sin(2 * a) / G) * T.POWER;
            j.height = (Math.pow(v * Math.sin(a), 2) / (2 * G)) * T.POWER;
            j.T = Math.max(0.35, (2 * v * Math.sin(a) / G) * Math.sqrt(T.POWER));
            j.t = 0;
            st.phase = 'fly';
            Sound.tone(300, 700, 0.18, 'square', 0.06);
        }
        function landed() {
            const p = st.p, j = st.jump;
            p.pos = j.from + j.dist;
            const d = p.pos - T.BOARD;
            st.phase = 'land'; st.t = 0;
            st.result = Math.max(0, d);
            st.marks.push(st.result);
            st.msg = ev.format(st.result) + ' M';
            const nb = Game.isBetter(ev, st.result);
            if (st.result > st.best) st.best = st.result;
            Game.recordResult(ev, st.result);
            st.newBest = nb; if (nb) st.gotNewBest = true;
            st.qualifiedNow = st.result >= ev.qualify;
            if (st.qualifiedNow) { nb ? Sound.record() : Sound.jingle(); Native.haptic('MEDIUM'); }
            else Sound.tone(500, 300, 0.2, 'triangle', 0.06);
        }

        const scene = {
            pads: true,
            enter() { Engine.setActionLabel('JUMP'); st.camX = 0; newAttempt(); },
            update(dt) {
                st.t += dt;
                const p = st.p;
                if (st.phase === 'ready') {
                    st.msg = 'TRY ' + st.attempt + '/' + ev.attempts;
                    if (st.t > 1.2) { st.phase = 'run'; st.t = 0; st.msg = ''; Sound.beep(); }
                } else if (st.phase === 'run') {
                    st.timer += dt;
                    RunTune.step(p, dt);
                    if (p.pos > T.BOARD + 0.6) foul();
                    else if (st.timer > 20) foul();
                } else if (st.phase === 'hold') {
                    st.jump.angle = Math.min(90, st.jump.angle + T.ANGLE_SPEED * dt);
                    p.y = 0;
                    if (st.jump.angle >= 90) launch(90);
                } else if (st.phase === 'fly') {
                    const j = st.jump;
                    j.t += dt;
                    const s = Math.min(1, j.t / j.T);
                    p.pos = j.from + j.dist * s;
                    p.y = j.height * 4 * s * (1 - s);   // m 단위 높이
                    if (s >= 1) landed();
                } else if (st.phase === 'land') {
                    p.y = 0;
                    if (st.t > 2.4) {
                        const done = (Game.mode === 'olympic' && st.qualifiedNow) || st.attempt >= ev.attempts;
                        if (done) {
                            st.phase = 'done';
                            Game.eventFinished(ev, { value: st.best, qualified: st.best >= ev.qualify, newBest: !!st.gotNewBest, marks: st.marks });
                        } else newAttempt();
                    }
                }
                const target = p.pos * T.PPM - S.W * 0.35;
                st.camX = Math.max(-12 * T.PPM, Math.min(58 * T.PPM - S.W, target));
            },
            onPress(name) {
                const p = st.p;
                if (st.phase !== 'run') return;
                if (name === 'runL' || name === 'runR') {
                    RunTune.tap(p, name);
                    Sound.step();
                } else if (name === 'action') {
                    if (p.v < 1) return;
                    if (p.pos > T.BOARD + T.GRACE) { foul(); return; }
                    st.jump = { from: p.pos, angle: 0 };
                    st.phase = 'hold';
                    Native.haptic('LIGHT');
                }
            },
            onRelease(name) {
                if (name === 'action' && st.phase === 'hold') launch(st.jump.angle);
            },
            draw(g) {
                const W = S.W, H = S.H, P = T.PPM;
                Stadium.drawBackdrop(g, st.camX, W);
                // 도움닫기 주로
                const bx = Math.round(T.BOARD * P - st.camX);
                g.fillStyle = '#c2553e'; g.fillRect(0, L.trackTop, bx, L.trackBot - L.trackTop);
                g.fillStyle = '#ffffff'; g.fillRect(0, L.trackTop, bx, 1); g.fillRect(0, L.trackBot - 1, bx, 1);
                for (let m = 0; m < T.BOARD; m += 10) {
                    const x = Math.round(m * P - st.camX);
                    if (x < -30 || x > W + 10) continue;
                    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x, L.trackTop, 1, L.trackBot - L.trackTop);
                    Font.text(g, String(m), x + 3, L.trackTop + 2, { color: 'rgba(255,255,255,0.8)' });
                }
                // 발구름판(흰색)과 파울 라인(빨강)
                const bw = Math.round(T.BOARD_W * P);
                g.fillStyle = '#ffffff'; g.fillRect(bx - bw, L.trackTop, bw, L.trackBot - L.trackTop);
                g.fillStyle = '#d8d8d8'; for (let y = L.trackTop + 3; y < L.trackBot - 2; y += 4) g.fillRect(bx - bw + 2, y, bw - 4, 1);
                g.fillStyle = '#e03030'; g.fillRect(bx, L.trackTop, 2, L.trackBot - L.trackTop);
                // 모래밭
                const px0 = bx + 2, px1 = Math.round((T.BOARD + 14) * P - st.camX);
                g.fillStyle = '#e6d3a3'; g.fillRect(px0, L.trackTop, px1 - px0, L.trackBot - L.trackTop);
                g.fillStyle = '#cdb887';
                for (let x = px0 + 3; x < px1; x += 7) g.fillRect(x, L.trackTop + 6 + (x % 3) * 5, 2, 1);
                g.fillStyle = '#7a5a30'; g.fillRect(px0, L.trackTop, px1 - px0, 1); g.fillRect(px0, L.trackBot - 1, px1 - px0, 1);
                if (px1 < W) { g.fillStyle = '#3c9a3c'; g.fillRect(px1, L.trackTop, W - px1, L.trackBot - L.trackTop); g.fillStyle = '#2e7d2e'; g.fillRect(px1, L.trackTop, W - px1, 2); }
                // 모래밭 거리 표시 (1m 마다, 5m 부터 숫자)
                for (let m = 1; m <= 10; m++) {
                    const x = Math.round((T.BOARD + m) * P - st.camX);
                    g.fillStyle = m >= 5 ? '#7a5a30' : 'rgba(122,90,48,0.5)';
                    g.fillRect(x, L.trackTop, 1, m >= 5 ? 6 : 3);
                    if (m >= 5) Font.text(g, String(m), x + 2, L.trackTop + 1, { color: '#7a5a30' });
                }
                // 기준 기록 깃발
                const qx = Math.round((T.BOARD + ev.qualify) * P - st.camX);
                g.fillStyle = '#ffffff'; g.fillRect(qx, L.trackTop - 12, 1, 12);
                g.fillStyle = '#e03030'; g.fillRect(qx + 1, L.trackTop - 12, 6, 4);
                // 이번 시도의 착지 표시
                st.marks.forEach(m => { if (m != null) { const x = Math.round((T.BOARD + m) * P - st.camX); g.fillStyle = '#ffffff'; g.fillRect(x - 1, L.trackBot - 6, 3, 3); } });
                Stadium.drawGrassBelow(g, W, H);

                // 선수
                const p = st.p, x = p.pos * P - st.camX, gy = L.groundY(1) - p.y * P;
                let pose;
                if (st.phase === 'ready') pose = Athlete.POSE.stand;
                else if (st.phase === 'run') pose = p.v < 0.4 ? Athlete.POSE.stand : Athlete.runPose(p.anim, 8 + p.v);
                else if (st.phase === 'hold') pose = Athlete.POSE.takeoff;
                else if (st.phase === 'fly') pose = st.jump.t / st.jump.T > 0.7 ? Athlete.POSE.land : Athlete.POSE.fly;
                else pose = st.result == null ? Athlete.POSE.fall : Athlete.POSE.land;
                Athlete.draw(g, x, gy, pose, Athlete.PAL.player, 1);
                if (st.phase === 'land' && st.result != null && st.t < 0.5) {
                    g.fillStyle = '#e6d3a3';
                    for (let i = 0; i < 6; i++) g.fillRect(x - 8 + i * 3, L.groundY(1) - 4 - Math.round(Math.sin(st.t * 12 + i) * 5), 2, 2);
                }

                // HUD
                Draw.panel(g, 0, 0, W, 36, 'rgba(0,0,0,0.6)');
                Font.text(g, ev.name, 4, 4, { color: '#ffd95c' });
                const best = Game.best(ev);
                Font.text(g, 'BEST ' + (best == null ? '-.--' : ev.format(best)), W - 4, 4, { color: '#ffffff', align: 'right' });
                Font.text(g, 'QUALIFY ' + ev.format(ev.qualify) + ' M', W - 4, 20, { color: '#9ad0ff', align: 'right' });
                Font.text(g, 'TRY ' + st.attempt + '/' + ev.attempts, W / 2, 2, { scale: 2, color: '#ffffff', align: 'center' });
                const kmh = Math.round(p.v * 3.6);
                Font.text(g, 'SPEED ' + String(kmh).padStart(2, '0') + ' KM/H', 4, 20, { color: '#ffffff' });
                const ratio = Math.min(1, p.v / RunTune.VMAX);
                Draw.rect(g, 4, 29, 60, 4, 'rgba(0,0,0,0.5)');
                Draw.rect(g, 4, 29, Math.round(60 * ratio), 4, ratio > 0.85 ? '#ff5050' : ratio > 0.6 ? '#ffd95c' : '#60e060');
                // 이번 종목 기록들
                if (st.marks.length) Font.text(g, st.marks.map((m, i) => (m == null ? 'X' : ev.format(m))).join('  '), W / 2, 20, { color: '#c8d8ff', align: 'center' });

                // 각도 화살표: 누르는 동안 선수 몸에서 뻗어 나오며 수평에서 천천히 올라감
                if (st.phase === 'hold' || (st.phase === 'fly' && st.jump.t < 0.35)) {
                    const a = st.jump.angle, good = a > 38 && a < 50;
                    const col = good ? '#60ff60' : '#ffd95c';
                    const ox = x + 10, oy = gy - 3;
                    const rad = a * Math.PI / 180, len = 30;
                    const ex = ox + Math.cos(rad) * len, ey = oy - Math.sin(rad) * len;
                    // 45도 안내선
                    Draw.line(g, ox, oy, ox + Math.cos(Math.PI / 4) * len, oy - Math.sin(Math.PI / 4) * len, 'rgba(255,255,255,0.35)', 1);
                    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(Math.round(ox), Math.round(oy), len, 1);
                    // 화살표
                    Draw.line(g, ox, oy, ex, ey, col, 3);
                    const ah = 6, ang1 = rad + Math.PI * 0.8, ang2 = rad - Math.PI * 0.8;
                    Draw.line(g, ex, ey, ex + Math.cos(ang1) * ah, ey - Math.sin(ang1) * ah, col, 3);
                    Draw.line(g, ex, ey, ex + Math.cos(ang2) * ah, ey - Math.sin(ang2) * ah, col, 3);
                    // 각도 숫자 (머리 위)
                    const label = Math.round(a) + ' DEG';
                    const lw = Font.width(label, 1);
                    Draw.panel(g, x - lw / 2 - 3, gy - 42, lw + 6, 11, 'rgba(0,0,0,0.65)');
                    Font.text(g, label, x, gy - 40, { color: col, align: 'center' });
                }
                // 메시지
                const my = 36;
                if (st.msg) {
                    const isFoul = st.msg === 'FOUL', big = st.phase === 'land';
                    const sc = 2, mw = Font.width(st.msg, sc);
                    Draw.panel(g, W / 2 - mw / 2 - 8, my + 4, mw + 16, 22, 'rgba(0,0,0,0.65)', 'rgba(255,255,255,0.4)');
                    Font.text(g, st.msg, W / 2, my + 8, { scale: sc, color: isFoul ? '#ff5050' : (big && st.qualifiedNow) ? '#60ff60' : '#ffd95c', align: 'center' });
                    if (big && !isFoul) Engine.kr(st.qualifiedNow ? (st.newBest ? '신기록! 기준 통과' : '기준 통과!') : '기준 ' + ev.format(ev.qualify) + 'm 미달', W / 2, my + 30, { size: 8, color: st.qualifiedNow ? '#c0ffc0' : '#ffb0b0' });
                    if (isFoul) Engine.kr('파울! 발구름판을 넘었습니다', W / 2, my + 30, { size: 8, color: '#ffb0b0' });
                }
            }
        };
        scene.debug = st;
        return scene;
    }
};
