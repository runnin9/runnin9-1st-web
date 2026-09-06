// javelin.js - 창던지기
// 조작: RUN 연타로 도움닫기 → 선 앞에서 THROW 를 누르면 준비 자세(각도 상승, 전진 계속) → 떼면 던지기.
// 누르고 있는 동안 선을 넘으면 FOUL.
'use strict';

const Javelin = {
    id: 'javelin', name: 'JAVELIN',
    qualify: 62.00, wr: 98.48, lowerIsBetter: false,
    format: v => v.toFixed(2), unit: 'M',
    attempts: 3,
    actionLabel: 'THROW',

    TUNE: {
        PPM: 12,
        LINE: 35,             // 파울 라인 (m)
        ANGLE_SPEED: 75,      // 초당 각도 상승 (도)
        WINDUP_DECEL: 30,     // 준비 자세 중 감속 (m/s^2). 최고 속도에서도 약 1.8m 안에 멈춤
        GRACE: 0.15,          // 선을 살짝 넘긴 경우 봐주는 거리 (m)
        BOOST: 2.1, BASE: 5,  // 창 속도 = 달리기 속도 x BOOST + BASE (m/s)
        POWER: 0.95,          // 비거리 배율
        TIME_SCALE: 0.85      // 비행 시간 배율 (1.0 = 실제 물리 시간)
    },

    create() {
        const ev = this, T = this.TUNE, L = Stadium.L, S = Engine.S;
        const G = 9.8;
        const st = { attempt: 0, best: 0, marks: [], gotNewBest: false, sticks: [] };

        function newAttempt() {
            st.attempt++;
            st.phase = 'ready'; st.t = 0; st.msg = ''; st.timer = 0;
            st.p = { pos: 0, v: 0, anim: 0, lastBtn: null, taps: 0 };
            st.j = null;
        }
        function foul() {
            st.phase = 'land'; st.t = 0; st.result = null; st.msg = 'FOUL';
            st.marks.push(null);
            Sound.fail(); Native.vibrate(200);
        }
        function release(angle) {
            const j = st.j, p = st.p;
            const vj = j.speed * T.BOOST + T.BASE, a = angle * Math.PI / 180;
            j.angle = angle;
            j.from = p.pos;
            j.dist = (vj * vj * Math.sin(2 * a) / G) * T.POWER;
            j.height = (Math.pow(vj * Math.sin(a), 2) / (2 * G)) * T.POWER;
            j.T = Math.max(0.6, (2 * vj * Math.sin(a) / G) * Math.sqrt(T.POWER) * T.TIME_SCALE);
            j.t = 0; j.x = p.pos; j.y = 1.8;
            st.phase = 'fly';
            Sound.tone(500, 900, 0.15, 'square', 0.06);
            Native.haptic('MEDIUM');
        }
        function landed() {
            const j = st.j;
            j.x = j.from + j.dist; j.y = 0;
            st.sticks.push(j.x);
            const d = j.x - T.LINE;
            st.phase = 'land'; st.t = 0;
            st.result = Math.max(0, d);
            st.marks.push(st.result);
            st.msg = ev.format(st.result) + ' M';
            const nb = Game.isBetter(ev, st.result);
            if (st.result > st.best) st.best = st.result;
            Game.recordResult(ev, st.result);
            st.newBest = nb; if (nb) st.gotNewBest = true;
            st.qualifiedNow = st.result >= ev.qualify;
            Sound.tone(200, 80, 0.12, 'triangle', 0.08);
            if (st.qualifiedNow) { nb ? Sound.record() : Sound.jingle(); Native.haptic('MEDIUM'); }
        }

        const scene = {
            pads: true,
            enter() { Engine.setActionLabel('THROW'); st.camX = 0; newAttempt(); },
            update(dt) {
                st.t += dt;
                const p = st.p;
                if (st.phase === 'ready') {
                    st.msg = 'TRY ' + st.attempt + '/' + ev.attempts;
                    if (st.t > 1.2) { st.phase = 'run'; st.t = 0; st.msg = ''; Sound.beep(); }
                } else if (st.phase === 'run') {
                    st.timer += dt;
                    RunTune.step(p, dt);
                    if (p.pos > T.LINE) foul();
                    else if (st.timer > 20) foul();
                } else if (st.phase === 'hold') {
                    st.j.angle = Math.min(90, st.j.angle + T.ANGLE_SPEED * dt);
                    p.v = Math.max(0, p.v - T.WINDUP_DECEL * dt);
                    p.pos += p.v * dt; p.anim += p.v * dt * 1.5;
                    if (p.pos > T.LINE + T.GRACE) { foul(); return; }
                    if (st.j.angle >= 90) release(90);
                } else if (st.phase === 'fly') {
                    const j = st.j;
                    j.t += dt;
                    const s = Math.min(1, j.t / j.T);
                    j.x = j.from + j.dist * s;
                    j.y = 1.8 * (1 - s) + j.height * 4 * s * (1 - s);
                    j.slope = (j.height * 4 * (1 - 2 * s) - 1.8) / Math.max(1, j.dist);
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
                // 카메라: 비행/착지 중엔 창을, 그 외엔 선수를 따라감
                const focus = (st.phase === 'fly' || (st.phase === 'land' && st.result != null)) ? st.j.x : p.pos;
                const target = focus * T.PPM - S.W * 0.35;
                const tgt = Math.max(-12 * T.PPM, Math.min((T.LINE + 115) * T.PPM - S.W, target));
                st.camX = st.phase === 'fly' ? tgt : st.camX + (tgt - st.camX) * Math.min(1, dt * 8);
            },
            onPress(name) {
                const p = st.p;
                if (st.phase !== 'run') return;
                if (name === 'runL' || name === 'runR') {
                    RunTune.tap(p, name);
                    Sound.step();
                } else if (name === 'action') {
                    if (p.v < 1) return;
                    st.j = { angle: 0, speed: p.v };
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
                // 도움닫기 주로
                const lx = Math.round(T.LINE * P - st.camX);
                g.fillStyle = '#c2553e'; g.fillRect(0, L.trackTop, lx, L.trackBot - L.trackTop);
                g.fillStyle = '#ffffff'; g.fillRect(0, L.trackTop, lx, 1); g.fillRect(0, L.trackBot - 1, lx, 1);
                for (let m = 0; m < T.LINE; m += 5) {
                    const x = Math.round(m * P - st.camX);
                    if (x < -30 || x > W + 10) continue;
                    const major = m % 10 === 0;
                    g.fillStyle = major ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)';
                    g.fillRect(x, L.trackTop, 1, major ? L.trackBot - L.trackTop : 6);
                    if (major) Font.text(g, String(m), x + 3, L.trackTop + 2, { color: 'rgba(255,255,255,0.8)' });
                }
                // THROW 권장 지점 (선 2m 전) 표시
                const hx = Math.round((T.LINE - 2) * P - st.camX);
                g.fillStyle = '#ffd95c'; g.fillRect(hx, L.trackBot - 5, 1, 5); g.fillRect(hx - 2, L.trackBot - 5, 5, 1);
                // 파울 라인 (빨강)
                g.fillStyle = '#e03030'; g.fillRect(lx - 1, L.trackTop, 3, L.trackBot - L.trackTop);
                // 낙하 구역 (잔디) 와 거리선
                g.fillStyle = '#3c9a3c'; g.fillRect(lx + 2, L.trackTop, W - lx, L.trackBot - L.trackTop);
                g.fillStyle = '#2e7d2e'; g.fillRect(lx + 2, L.trackTop, W - lx, 2);
                for (let m = 10; m <= 110; m += 10) {
                    const x = Math.round((T.LINE + m) * P - st.camX);
                    if (x < -20 || x > W + 10) continue;
                    g.fillStyle = 'rgba(255,255,255,0.85)'; g.fillRect(x, L.trackTop, 1, L.trackBot - L.trackTop);
                    Font.text(g, String(m), x + 3, L.trackTop + 2, { color: '#ffffff' });
                }
                // 기준 기록 깃발
                const qx = Math.round((T.LINE + ev.qualify) * P - st.camX);
                g.fillStyle = '#ffffff'; g.fillRect(qx, L.trackTop - 12, 1, 12);
                g.fillStyle = '#e03030'; g.fillRect(qx + 1, L.trackTop - 12, 6, 4);
                Stadium.drawGrassBelow(g, W, H);
                // 이전에 꽂힌 창들
                st.sticks.forEach((sx, i) => {
                    if (st.phase === 'land' && i === st.sticks.length - 1) return;
                    const x = sx * P - st.camX;
                    if (x > -30 && x < W + 30) Athlete.drawJavelin(g, x - Math.cos(0.95) * 10, L.groundY(1) - Math.sin(0.95) * 10, 0.95, 24);
                });

                // 선수
                const p = st.p, x = p.pos * P - st.camX, gy = L.groundY(1);
                let pose, holding = false;
                if (st.phase === 'ready') { pose = Athlete.POSE.stand; holding = true; }
                else if (st.phase === 'run') { pose = p.v < 0.4 ? Athlete.POSE.stand : Athlete.runPoseJavelin(p.anim, 8 + p.v); holding = true; }
                else if (st.phase === 'hold') { pose = Athlete.POSE.windup; holding = true; }
                else if (st.phase === 'fly' || (st.phase === 'land' && st.result != null)) pose = st.t < 0.6 && st.phase === 'fly' ? Athlete.POSE.throw : Athlete.POSE.stand;
                else pose = Athlete.POSE.fall;
                const joints = Athlete.draw(g, x, gy, pose, Athlete.PAL.player, 1);
                if (holding && pose !== Athlete.POSE.stand) {
                    const ang = st.phase === 'hold' ? st.j.angle * Math.PI / 180 : 0.15;
                    Athlete.drawJavelin(g, joints.hand.x, joints.hand.y, ang, 24);
                } else if (holding) {
                    Athlete.drawJavelin(g, joints.shoulder.x + 2, joints.shoulder.y - 2, 0.15, 24);
                }
                // 날아가는 창 / 꽂힌 창
                if (st.phase === 'fly') {
                    const j = st.j, jx = j.x * P - st.camX;
                    // 실제 높이 그대로: 높이 오르면 화면 위로 사라졌다가 떨어지며 다시 나타남
                    const jy = gy - j.y * P;
                    if (jy < 38) {
                        Draw.rect(g, jx - 1, 40, 3, 2, '#ffffff'); Draw.rect(g, jx - 2, 42, 5, 2, '#ffffff'); Draw.rect(g, jx - 3, 44, 7, 2, '#ffffff');
                        Font.text(g, Math.round(j.y) + 'M', jx, 48, { color: '#ffffff', align: 'center' });
                    } else Athlete.drawJavelin(g, jx, jy, Math.atan(j.slope), 24);
                } else if (st.phase === 'land' && st.result != null) {
                    const jx = st.j.x * P - st.camX;
                    Athlete.drawJavelin(g, jx - Math.cos(0.95) * 10, gy - Math.sin(0.95) * 10, 0.95, 24);
                    if (st.t < 0.4) { g.fillStyle = '#8a6a3a'; for (let i = 0; i < 5; i++) g.fillRect(jx - 6 + i * 3, gy - 3 - Math.round(Math.sin(st.t * 14 + i) * 4), 2, 2); }
                }

                // HUD
                Draw.panel(g, 0, 0, W, 36, 'rgba(0,0,0,0.6)');
                Font.text(g, ev.name, 4, 4, { color: '#ffd95c' });
                const best = Game.best(ev);
                Font.text(g, 'BEST ' + (best == null ? '--.--' : ev.format(best)), W - 4, 4, { color: '#ffffff', align: 'right' });
                Font.text(g, 'QUALIFY ' + ev.format(ev.qualify) + ' M', W - 4, 20, { color: '#9ad0ff', align: 'right' });
                Font.text(g, 'TRY ' + st.attempt + '/' + ev.attempts, W / 2, 2, { scale: 2, color: '#ffffff', align: 'center' });
                const kmh = Math.round(p.v * 3.6);
                Font.text(g, 'SPEED ' + String(kmh).padStart(2, '0') + ' KM/H', 4, 20, { color: '#ffffff' });
                const ratio = Math.min(1, p.v / RunTune.VMAX);
                Draw.rect(g, 4, 29, 60, 4, 'rgba(0,0,0,0.5)');
                Draw.rect(g, 4, 29, Math.round(60 * ratio), 4, ratio > 0.85 ? '#ff5050' : ratio > 0.6 ? '#ffd95c' : '#60e060');
                if (st.marks.length) Font.text(g, st.marks.map(m => (m == null ? 'X' : ev.format(m))).join('  '), W / 2, 20, { color: '#c8d8ff', align: 'center' });
                if (st.phase === 'fly') {
                    const ds = ev.format(Math.max(0, st.j.x - T.LINE)) + ' M', dw = Font.width(ds, 2);
                    Draw.panel(g, W / 2 - dw / 2 - 6, 38, dw + 12, 20, 'rgba(0,0,0,0.6)');
                    Font.text(g, ds, W / 2, 41, { scale: 2, color: '#ffffff', align: 'center' });
                }

                // 각도 화살표 (준비 자세 중)
                if (st.phase === 'hold') {
                    const a = st.j.angle, good = a > 38 && a < 50;
                    const col = good ? '#60ff60' : '#ffd95c';
                    const ox = joints.shoulder.x + 4, oy = joints.shoulder.y - 2;
                    const rad = a * Math.PI / 180, len = 30;
                    const ex = ox + Math.cos(rad) * len, ey = oy - Math.sin(rad) * len;
                    Draw.line(g, ox, oy, ox + Math.cos(Math.PI / 4) * len, oy - Math.sin(Math.PI / 4) * len, 'rgba(255,255,255,0.35)', 1);
                    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(Math.round(ox), Math.round(oy), len, 1);
                    Draw.line(g, ox, oy, ex, ey, col, 3);
                    const ah = 6, ang1 = rad + Math.PI * 0.8, ang2 = rad - Math.PI * 0.8;
                    Draw.line(g, ex, ey, ex + Math.cos(ang1) * ah, ey - Math.sin(ang1) * ah, col, 3);
                    Draw.line(g, ex, ey, ex + Math.cos(ang2) * ah, ey - Math.sin(ang2) * ah, col, 3);
                    const label = Math.round(a) + ' DEG', lw = Font.width(label, 1);
                    Draw.panel(g, x - lw / 2 - 3, gy - 46, lw + 6, 11, 'rgba(0,0,0,0.65)');
                    Font.text(g, label, x, gy - 44, { color: col, align: 'center' });
                }
                // 메시지
                const my = 36;
                if (st.msg) {
                    const isFoul = st.msg === 'FOUL', big = st.phase === 'land';
                    const sc = 2, mw = Font.width(st.msg, sc);
                    Draw.panel(g, W / 2 - mw / 2 - 8, my + 4, mw + 16, 22, 'rgba(0,0,0,0.65)', 'rgba(255,255,255,0.4)');
                    Font.text(g, st.msg, W / 2, my + 8, { scale: sc, color: isFoul ? '#ff5050' : (big && st.qualifiedNow) ? '#60ff60' : '#ffd95c', align: 'center' });
                    if (big && !isFoul) Engine.kr(st.qualifiedNow ? (st.newBest ? Lang.t('new_record_pass') : Lang.t('pass')) : Lang.t('fail_q', { q: ev.format(ev.qualify) }), W / 2, my + 30, { size: 8, color: st.qualifiedNow ? '#c0ffc0' : '#ffb0b0' });
                    if (isFoul) Engine.kr(Lang.t('foul_line'), W / 2, my + 30, { size: 8, color: '#ffb0b0' });
                }
            }
        };
        scene.debug = st;
        return scene;
    }
};
