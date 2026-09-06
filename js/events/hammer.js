// hammer.js - 해머던지기
// 조작: RUN 연타로 회전 속도 상승 → 해머가 앞쪽일 때(GO) THROW 를 누르면 방향 확정·해머 정지 →
// 누르는 동안 각도 상승 → 떼면 던지기. 앞쪽이 아닐 때 누르면 케이지 FOUL.
'use strict';

const Hammer = {
    id: 'hammer', name: 'HAMMER THROW',
    qualify: 55.00, wr: 86.74, lowerIsBetter: false,
    format: v => v.toFixed(2), unit: 'M',
    attempts: 3,
    actionLabel: 'THROW',

    TUNE: {
        PPM: 12,
        RADIUS: 1.8,          // 해머 줄 길이 (m)
        W_GAIN: 2.0,          // 한 번 두드릴 때 늘어나는 각속도 (rad/s)
        W_DRAG: 0.5,          // 초당 각속도 감쇠 비율 (누르려고 연타를 멈추는 사이 덜 줄도록 완만하게) (누르는 동안은 감쇠 없음)
        W_MAX: 9.42,          // 최고 각속도 (rad/s, 초당 1.5회전). 약 4.5회/초 연타면 도달
        ANGLE_SPEED: 75,      // 초당 각도 상승 (도)
        POWER: 2.9,           // 비거리 배율
        RELEASE_WINDOW: 70,   // 앞쪽 기준 이 각도(도) 안에서 눌러야 함
        GO_LEAD: 120, GO_LAG: 30,   // GO 표시 구간: 앞쪽 도달 전 120도 ~ 지난 뒤 30도 (반응 시간 보정)
        TIME_SCALE: 1.0,      // 비행 시간 배율 (1.0 = 실제 물리 시간)
        LIMIT: 14             // 이 시간(초) 안에 던지지 않으면 FOUL
    },

    create() {
        const ev = this, T = this.TUNE, L = Stadium.L, S = Engine.S;
        const G = 9.8;
        const st = { attempt: 0, best: 0, marks: [], gotNewBest: false, landed: [] };
        const CIRCLE = 0;   // 서클 중심 (m)

        function newAttempt() {
            st.attempt++;
            st.phase = 'ready'; st.t = 0; st.msg = ''; st.timer = 0;
            st.p = { theta: Math.PI, w: 0, lastBtn: null, taps: 0, turns: 0 };
            st.j = null;
        }
        function dirError() {   // 해머 방향과 앞쪽(오른쪽)의 각도 차 (도, -180~180)
            let d = (st.p.theta * 180 / Math.PI) % 360;
            if (d > 180) d -= 360; if (d < -180) d += 360;
            return d;
        }
        function foul(reason) {
            st.phase = 'land'; st.t = 0; st.result = null; st.msg = 'FOUL'; st.foulReason = reason;
            st.marks.push(null);
            Sound.fail(); Native.vibrate(200);
        }
        function release(angle) {
            const p = st.p;
            const err = st.j.err;
            const v = st.j.w * T.RADIUS, a = angle * Math.PI / 180;
            const acc = Math.cos(err * Math.PI / 180);
            const j = st.j;
            j.angle = angle; j.err = err;
            j.from = CIRCLE + Math.cos(p.theta) * T.RADIUS;
            j.dist = (v * v * Math.sin(2 * a) / G) * T.POWER * acc;
            j.height = (Math.pow(v * Math.sin(a), 2) / (2 * G)) * T.POWER;
            // 비거리·높이를 POWER 배 했으므로 시간은 sqrt(POWER) 배 → 화면상 중력이 실제 g 와 같게 보임
            j.T = Math.max(0.6, (2 * v * Math.sin(a) / G) * Math.sqrt(T.POWER) * T.TIME_SCALE);
            j.t = 0; j.x = j.from; j.y = 1.2;
            st.phase = 'fly';
            Sound.tone(400, 800, 0.15, 'square', 0.06);
            Native.haptic('MEDIUM');
        }
        function landed() {
            const j = st.j;
            j.x = j.from + j.dist; j.y = 0;
            st.landed.push(j.x);
            st.phase = 'land'; st.t = 0;
            st.result = Math.max(0, j.x - CIRCLE - 1.07);   // 서클 반지름 1.07m 기준
            st.marks.push(st.result);
            st.msg = ev.format(st.result) + ' M';
            const nb = Game.isBetter(ev, st.result);
            if (st.result > st.best) st.best = st.result;
            Game.recordResult(ev, st.result);
            st.newBest = nb; if (nb) st.gotNewBest = true;
            st.qualifiedNow = st.result >= ev.qualify;
            Sound.tone(150, 60, 0.2, 'triangle', 0.1);
            if (st.qualifiedNow) { nb ? Sound.record() : Sound.jingle(); Native.haptic('MEDIUM'); }
        }

        // 해머 공: 밝은 테두리 + 어두운 속 (어두운 관중석 위에서도 보이도록)
        function drawBall(g, x, y) {
            Draw.rect(g, x - 3, y - 3, 7, 7, '#e8e8f0');
            Draw.rect(g, x - 2, y - 2, 5, 5, '#303038');
            Draw.rect(g, x - 1, y - 1, 2, 2, '#686878');
        }

        // 화면 위로 벗어난 동안 위치와 높이 표시
        function drawOffscreenMarker(g, x, h) {
            const y = 40;
            Draw.rect(g, x - 1, y, 3, 2, '#ffffff'); Draw.rect(g, x - 2, y + 2, 5, 2, '#ffffff'); Draw.rect(g, x - 3, y + 4, 7, 2, '#ffffff');
            Font.text(g, Math.round(h) + 'M', x, y + 8, { color: '#ffffff', align: 'center' });
        }

        const scene = {
            pads: true,
            enter() { Engine.setActionLabel('THROW'); st.camX = -S.W * 0.3; newAttempt(); },
            update(dt) {
                st.t += dt;
                const p = st.p;
                if (st.phase === 'ready') {
                    st.msg = 'TRY ' + st.attempt + '/' + ev.attempts;
                    if (st.t > 1.2) { st.phase = 'spin'; st.t = 0; st.msg = ''; Sound.beep(); }
                } else if (st.phase === 'spin') {
                    st.timer += dt;
                    p.w = Math.max(0, p.w - p.w * T.W_DRAG * dt);
                    const before = p.theta;
                    p.theta += p.w * dt;
                    if (Math.floor(before / (2 * Math.PI)) !== Math.floor(p.theta / (2 * Math.PI))) p.turns++;
                    if (st.timer > T.LIMIT) foul('time');
                } else if (st.phase === 'hold') {
                    // 해머는 누른 자리에 멈춰 있고 각도만 오름
                    st.j.angle = Math.min(90, st.j.angle + T.ANGLE_SPEED * dt);
                    if (st.j.angle >= 90) release(90);
                } else if (st.phase === 'fly') {
                    const j = st.j;
                    j.t += dt;
                    const s = Math.min(1, j.t / j.T);
                    j.x = j.from + j.dist * s;
                    j.y = 1.2 * (1 - s) + j.height * 4 * s * (1 - s);
                    if (s >= 1) landed();
                } else if (st.phase === 'land') {
                    if (st.t > 2.6) {
                        const done = (Game.mode === 'olympic' && st.qualifiedNow) || st.attempt >= ev.attempts;
                        if (done) {
                            st.phase = 'done';
                            Game.eventFinished(ev, { value: st.best, qualified: st.best >= ev.qualify, newBest: !!st.gotNewBest, marks: st.marks });
                        } else newAttempt();
                    }
                }
                const focus = (st.phase === 'fly' || (st.phase === 'land' && st.result != null)) ? st.j.x : CIRCLE;
                const target = focus * T.PPM - S.W * (st.phase === 'fly' ? 0.35 : 0.3);
                const tgt = Math.max(-S.W * 0.3, Math.min(105 * T.PPM - S.W, target));
                st.camX = st.phase === 'fly' ? tgt : st.camX + (tgt - st.camX) * Math.min(1, dt * 8);
            },
            onPress(name) {
                const p = st.p;
                if (name === 'runL' || name === 'runR') {
                    if (st.phase !== 'spin') return;
                    const gain = name !== p.lastBtn ? T.W_GAIN : T.W_GAIN * 0.7;
                    p.w = Math.min(T.W_MAX, p.w + gain);
                    p.lastBtn = name; p.taps++;
                    Sound.step();
                } else if (name === 'action') {
                    if (st.phase !== 'spin' || p.w < 3) return;
                    const err = dirError();
                    if (Math.abs(err) > T.RELEASE_WINDOW) { foul('cage'); return; }
                    st.j = { angle: 0, err, w: p.w };
                    st.phase = 'hold';
                    Native.haptic('LIGHT');
                }
            },
            onRelease(name) {
                if (name === 'action' && st.phase === 'hold') release(st.j.angle);
            },
            draw(g) {
                const W = S.W, H = S.H, P = T.PPM;
                Stadium.drawBackdrop(g, st.camX, W);
                // 필드: 잔디 위 서클과 낙하 구역
                g.fillStyle = '#3c9a3c'; g.fillRect(0, L.trackTop, W, L.trackBot - L.trackTop);
                g.fillStyle = '#2e7d2e'; g.fillRect(0, L.trackTop, W, 2);
                const cx = Math.round(CIRCLE * P - st.camX), gy = L.groundY(1);
                // 서클 (타원)과 케이지 (뒤쪽 기둥·그물)
                g.fillStyle = '#c8c8d0'; g.fillRect(cx - 14, gy - 2, 28, 3);
                g.fillStyle = '#9a9aa4'; g.fillRect(cx - 16, gy + 1, 32, 1);
                g.fillStyle = '#707080';
                g.fillRect(cx - 30, L.trackTop - 8, 2, gy - L.trackTop + 8);
                g.fillRect(cx - 22, L.trackTop - 12, 2, gy - L.trackTop + 12);
                g.fillStyle = 'rgba(120,120,140,0.5)';
                for (let y = L.trackTop - 10; y < gy; y += 4) g.fillRect(cx - 29, y, 8, 1);
                // 거리선 (10m 마다) 와 기준 깃발
                for (let m = 10; m <= 100; m += 10) {
                    const x = Math.round((CIRCLE + 1.07 + m) * P - st.camX);
                    if (x < -20 || x > W + 10) continue;
                    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(x, L.trackTop, 1, L.trackBot - L.trackTop);
                    Font.text(g, String(m), x + 3, L.trackTop + 2, { color: '#ffffff' });
                }
                const qx = Math.round((CIRCLE + 1.07 + ev.qualify) * P - st.camX);
                g.fillStyle = '#ffffff'; g.fillRect(qx, L.trackTop - 12, 1, 12);
                g.fillStyle = '#e03030'; g.fillRect(qx + 1, L.trackTop - 12, 6, 4);
                Stadium.drawGrassBelow(g, W, H);
                // 착지 자국
                st.landed.forEach((lx, i) => {
                    if (st.phase === 'land' && i === st.landed.length - 1) return;
                    const x = lx * P - st.camX;
                    if (x > -10 && x < W + 10) { g.fillStyle = '#6a4a2a'; g.fillRect(Math.round(x) - 3, gy - 2, 6, 3); }
                });

                // 선수와 해머
                const p = st.p;
                const spinning = st.phase === 'spin' || st.phase === 'hold';
                const facing = Math.cos(p.theta) >= 0 ? 1 : -1;
                const hx = cx + Math.cos(p.theta) * T.RADIUS * P;
                const hy = gy - 14 + Math.sin(p.theta) * 5;   // 타원 궤도 (원근)
                const behind = Math.sin(p.theta) < 0;
                const drawHammer = () => {
                    Draw.line(g, cx + facing * 3, gy - 16, hx, hy, '#b0b0c0', 1);
                    drawBall(g, hx, hy);
                };
                if (spinning && behind) drawHammer();
                let pose = Athlete.POSE.stand;
                if (spinning) pose = Athlete.POSE.spin;
                else if (st.phase === 'fly' && st.t < 0.6) pose = Athlete.POSE.throw;
                else if (st.phase === 'land' && st.result == null) pose = Athlete.POSE.fall;
                Athlete.draw(g, cx, gy, pose, Athlete.PAL.player, spinning ? facing : 1);
                if (spinning && !behind) drawHammer();
                if (st.phase === 'ready') { Draw.line(g, cx + 3, gy - 16, cx + 14, gy - 4, '#b0b0c0', 1); drawBall(g, cx + 14, gy - 4); }
                // 날아가는 / 떨어진 해머
                if (st.phase === 'fly') {
                    // 실제 높이 그대로: 높이 오르면 화면 위로 사라졌다가 떨어지며 다시 나타남
                    const j = st.j, jx = j.x * P - st.camX, jy = gy - j.y * P;
                    if (jy < 38) drawOffscreenMarker(g, jx, j.y);
                    else drawBall(g, jx, jy);
                } else if (st.phase === 'land' && st.result != null) {
                    const jx = st.j.x * P - st.camX;
                    drawBall(g, jx, gy - 3);
                    if (st.t < 0.4) { g.fillStyle = '#6a4a2a'; for (let i = 0; i < 5; i++) g.fillRect(jx - 6 + i * 3, gy - 3 - Math.round(Math.sin(st.t * 14 + i) * 4), 2, 2); }
                }

                // 방향 표시: 앞쪽 구간이 초록으로 켜짐
                if (spinning) {
                    const e = dirError();
                    const ok = st.phase === 'hold' ? true : (e >= -T.GO_LEAD && e <= T.GO_LAG);
                    const ax = cx + 26, ay = gy - 30;
                    Draw.panel(g, ax - 4, ay - 10, 36, 20, 'rgba(0,0,0,0.6)');
                    Font.text(g, ok ? 'GO' : '..', ax + 14, ay - 6, { scale: 1, color: ok ? '#60ff60' : '#888', align: 'center' });
                    Draw.rect(g, ax + 2, ay + 3, 24, 4, 'rgba(255,255,255,0.2)');
                    Draw.rect(g, ax + 2 + Math.round(12 + Math.cos(p.theta) * 12) - 1, ay + 3, 3, 4, ok ? '#60ff60' : '#ffd95c');
                }
                // 회전 속도계
                Draw.panel(g, 0, 0, W, 36, 'rgba(0,0,0,0.6)');
                Font.text(g, ev.name, 4, 4, { color: '#ffd95c' });
                const best = Game.best(ev);
                Font.text(g, 'BEST ' + (best == null ? '--.--' : ev.format(best)), W - 4, 4, { color: '#ffffff', align: 'right' });
                Font.text(g, 'QUALIFY ' + ev.format(ev.qualify) + ' M', W - 4, 20, { color: '#9ad0ff', align: 'right' });
                Font.text(g, 'TRY ' + st.attempt + '/' + ev.attempts, W / 2, 2, { scale: 2, color: '#ffffff', align: 'center' });
                const rps = (p.w / (2 * Math.PI)).toFixed(1);
                Font.text(g, 'SPIN ' + rps + ' RPS', 4, 20, { color: '#ffffff' });
                const ratio = Math.min(1, p.w / T.W_MAX);
                Draw.rect(g, 4, 29, 60, 4, 'rgba(0,0,0,0.5)');
                Draw.rect(g, 4, 29, Math.round(60 * ratio), 4, ratio > 0.85 ? '#ff5050' : ratio > 0.6 ? '#ffd95c' : '#60e060');
                if (st.marks.length) Font.text(g, st.marks.map(m => (m == null ? 'X' : ev.format(m))).join('  '), W / 2, 20, { color: '#c8d8ff', align: 'center' });
                if (st.phase === 'fly') {
                    const ds = ev.format(Math.max(0, st.j.x - CIRCLE - 1.07)) + ' M', dw = Font.width(ds, 2);
                    Draw.panel(g, W / 2 - dw / 2 - 6, 38, dw + 12, 20, 'rgba(0,0,0,0.6)');
                    Font.text(g, ds, W / 2, 41, { scale: 2, color: '#ffffff', align: 'center' });
                }
                // 각도 화살표 (누르는 동안)
                if (st.phase === 'hold') {
                    const a = st.j.angle, good = a > 38 && a < 50;
                    const col = good ? '#60ff60' : '#ffd95c';
                    const ox = cx + 8, oy = gy - 20;
                    const rad = a * Math.PI / 180, len = 30;
                    const ex = ox + Math.cos(rad) * len, ey = oy - Math.sin(rad) * len;
                    Draw.line(g, ox, oy, ox + Math.cos(Math.PI / 4) * len, oy - Math.sin(Math.PI / 4) * len, 'rgba(255,255,255,0.35)', 1);
                    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(Math.round(ox), Math.round(oy), len, 1);
                    Draw.line(g, ox, oy, ex, ey, col, 3);
                    const ah = 6, ang1 = rad + Math.PI * 0.8, ang2 = rad - Math.PI * 0.8;
                    Draw.line(g, ex, ey, ex + Math.cos(ang1) * ah, ey - Math.sin(ang1) * ah, col, 3);
                    Draw.line(g, ex, ey, ex + Math.cos(ang2) * ah, ey - Math.sin(ang2) * ah, col, 3);
                    const label = Math.round(a) + ' DEG', lw = Font.width(label, 1);
                    Draw.panel(g, cx - lw / 2 - 3, gy - 58, lw + 6, 11, 'rgba(0,0,0,0.65)');
                    Font.text(g, label, cx, gy - 56, { color: col, align: 'center' });
                }
                // 메시지
                const my = 36;
                if (st.msg) {
                    const isFoul = st.msg === 'FOUL', big = st.phase === 'land';
                    const sc = 2, mw = Font.width(st.msg, sc);
                    Draw.panel(g, W / 2 - mw / 2 - 8, my + 4, mw + 16, 22, 'rgba(0,0,0,0.65)', 'rgba(255,255,255,0.4)');
                    Font.text(g, st.msg, W / 2, my + 8, { scale: sc, color: isFoul ? '#ff5050' : (big && st.qualifiedNow) ? '#60ff60' : '#ffd95c', align: 'center' });
                    if (big && !isFoul) Engine.kr(st.qualifiedNow ? (st.newBest ? Lang.t('new_record_pass') : Lang.t('pass')) : Lang.t('fail_q', { q: ev.format(ev.qualify) }), W / 2, my + 30, { size: 8, color: st.qualifiedNow ? '#c0ffc0' : '#ffb0b0' });
                    if (isFoul) Engine.kr(st.foulReason === 'time' ? Lang.t('foul_time') : Lang.t('foul_cage'), W / 2, my + 30, { size: 8, color: '#ffb0b0' });
                }
            }
        };
        scene.debug = st;
        return scene;
    }
};
