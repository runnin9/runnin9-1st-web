// highjump.js - 높이뛰기
// 조작: RUN 연타로 도움닫기 → 바 앞에서 JUMP 누르면 도약 준비, 누르는 동안 각도 상승(60~70도가 최적), 떼면 도약.
// 바 위치에서 몸이 바보다 높으면 성공. 같은 높이에서 3번 실패하면 종료.
'use strict';

const HighJump = {
    id: 'highjump', name: 'HIGH JUMP', nameKr: '높이뛰기',
    qualify: 2.15, wr: 2.45, lowerIsBetter: false,
    format: v => v.toFixed(2), unit: 'M',
    attempts: 3,
    hint: ['RUN 연타로 달려서 바 앞 노란 구간에서 JUMP', '누르고 있으면 각도가 오릅니다. 높이뛰기는 60~70도가 좋습니다', '바보다 높이 넘으면 성공. 3번 안에 넘으면 통과, 넘을 때마다 바가 5cm 올라갑니다'],
    actionLabel: 'JUMP',

    TUNE: {
        PPM: 12,
        BAR_X: 25,            // 바 위치 (m)
        BAR_STEP: 0.05,       // 성공 시 올라가는 높이 (m)
        ANGLE_SPEED: 90,      // 초당 각도 상승 (도)
        POWER: 0.42,          // 도약 높이 배율
        HIP: 0.83,            // 발에서 엉덩이까지 높이 (m). 발 높이 + HIP 가 바보다 높아야 성공 (그림과 일치)
        MARGIN: 0.05,         // 성공에 필요한 여유 (m)
        MAT_H: 0.7,           // 매트 높이 (m)
        MAT_LEN: 3.5,         // 매트 길이 (m)
        ZONE: [1.4, 2.6]      // 권장 도약 구간 (바 앞 거리, m). 정점이 바 위에 오는 거리
    },

    create() {
        const ev = this, T = this.TUNE, L = Stadium.L, S = Engine.S;
        const G = 9.8;
        const st = { attempt: 0, best: 0, marks: [], gotNewBest: false, bar: ev.qualify, misses: 0, cleared: 0 };

        function newAttempt() {
            st.attempt = st.misses + 1;
            st.phase = 'ready'; st.t = 0; st.msg = ''; st.timer = 0;
            st.p = { pos: 0, v: 0, anim: 0, lastBtn: null, taps: 0, y: 0 };
            st.jump = null; st.barFall = 0;
        }
        function fail(reason) {
            st.phase = 'land'; st.t = 0; st.result = false; st.reason = reason;
            st.misses++;
            st.msg = reason === 'run' ? 'FOUL' : 'MISS';
            if (reason === 'hit') st.barFall = 0.001;
            Sound.fail(); Native.vibrate(200);
        }
        function launch(angle) {
            const j = st.jump, p = st.p;
            const v = Math.max(p.v, 1), a = angle * Math.PI / 180;
            j.angle = angle;
            const vx = v * Math.cos(a), vy = v * Math.sin(a);
            j.height = (vy * vy / (2 * G)) * T.POWER;
            j.T = Math.max(0.4, (2 * vy / G) * Math.sqrt(T.POWER));
            j.dist = vx * j.T;
            j.t = 0;
            st.phase = 'fly';
            j.checked = false;
            Sound.tone(300, 800, 0.2, 'square', 0.06);
        }
        // 비행 위치 갱신. 바를 지난 뒤에는 매트 윗면에서 멈추고 매트 밖으로 나가지 않음. 진행률(0~1) 반환
        function advanceFlight(dt) {
            const j = st.jump, p = st.p;
            if (j.landed) return 1;
            j.t += dt;
            const s = Math.min(1, j.t / j.T);
            p.pos = j.from + j.dist * s;
            p.y = j.height * 4 * s * (1 - s);
            const matEnd = T.BAR_X + T.MAT_LEN - 0.4;
            if (p.pos > T.BAR_X + 0.3 && s > 0.5 && p.y <= T.MAT_H) { p.y = T.MAT_H; j.landed = true; j.t = j.T; }
            if (p.pos > matEnd) { p.pos = matEnd; p.y = Math.max(p.y, T.MAT_H); j.landed = true; j.t = j.T; }
            if (s >= 1 && !j.landed) { p.y = 0; j.landed = true; }
            return j.landed ? 1 : s;
        }
        function heightAt(x) {   // 도약 지점 x 에서의 발 높이 (m)
            const j = st.jump;
            const s = (x - j.from) / Math.max(0.01, j.dist);
            if (s < 0 || s > 1) return -1;
            return j.height * 4 * s * (1 - s);
        }
        function cleared() {
            st.phase = 'land'; st.t = 0; st.result = true;
            st.cleared++;
            st.msg = 'CLEAR ' + ev.format(st.bar) + ' M';
            const nb = Game.isBetter(ev, st.bar);
            st.best = st.bar;
            Game.recordResult(ev, st.bar);
            st.newBest = nb; if (nb) st.gotNewBest = true;
            st.qualifiedNow = st.bar >= ev.qualify;
            nb ? Sound.record() : Sound.jingle(); Native.haptic('MEDIUM');
        }
        function finishEvent() {
            st.phase = 'done';
            Game.eventFinished(ev, { value: st.best, qualified: st.best >= ev.qualify, newBest: !!st.gotNewBest });
        }

        const scene = {
            pads: true,
            enter() { Engine.setActionLabel('JUMP'); st.camX = 0; newAttempt(); },
            update(dt) {
                st.t += dt;
                const p = st.p;
                if (st.barFall > 0 && st.barFall < 1) st.barFall = Math.min(1, st.barFall + dt * 2.5);
                if (st.phase === 'ready') {
                    st.msg = 'BAR ' + ev.format(st.bar) + ' M   TRY ' + st.attempt + '/' + ev.attempts;
                    if (st.t > 1.3) { st.phase = 'run'; st.t = 0; st.msg = ''; Sound.beep(); }
                } else if (st.phase === 'run') {
                    st.timer += dt;
                    RunTune.step(p, dt);
                    if (p.pos > T.BAR_X - 0.3) fail('run');
                    else if (st.timer > 20) fail('run');
                } else if (st.phase === 'hold') {
                    st.jump.angle = Math.min(90, st.jump.angle + T.ANGLE_SPEED * dt);
                    if (st.jump.angle >= 90) launch(90);
                } else if (st.phase === 'fly') {
                    const j = st.jump;
                    const s = advanceFlight(dt);
                    // 바 통과 판정
                    if (!j.checked && p.pos >= T.BAR_X) {
                        j.checked = true;
                        const h = heightAt(T.BAR_X);
                        st.lastCheck = { h, need: st.bar + T.MARGIN - T.HIP };
                        if (h + T.HIP >= st.bar + T.MARGIN) cleared(); else fail('hit');
                    }
                    if (s >= 1 && st.phase === 'fly') fail('short');   // 바 앞에 착지
                } else if (st.phase === 'land') {
                    // 성공/실패 후 남은 비행(매트 착지까지)을 마저 그림
                    if (st.jump) advanceFlight(dt);
                    if (st.t > 2.6) {
                        if (st.result) {
                            if (Game.mode === 'olympic' && st.qualifiedNow) { finishEvent(); return; }
                            st.bar = Math.round((st.bar + T.BAR_STEP) * 100) / 100;
                            st.misses = 0;
                            newAttempt();
                        } else if (st.misses >= ev.attempts) finishEvent();
                        else newAttempt();
                    }
                }
                const target = p.pos * T.PPM - S.W * 0.4;
                st.camX = Math.max(-12 * T.PPM, Math.min(34 * T.PPM - S.W, target));
            },
            onPress(name) {
                const p = st.p;
                if (st.phase !== 'run') return;
                if (name === 'runL' || name === 'runR') {
                    RunTune.tap(p, name);
                    Sound.step();
                } else if (name === 'action') {
                    if (p.v < 1) return;
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
                const bx = Math.round(T.BAR_X * P - st.camX), gy = L.groundY(1);
                // 도움닫기 (잔디 위 트랙)
                g.fillStyle = '#3c9a3c'; g.fillRect(0, L.trackTop, W, L.trackBot - L.trackTop);
                g.fillStyle = '#2e7d2e'; g.fillRect(0, L.trackTop, W, 2);
                g.fillStyle = '#c2553e'; g.fillRect(0, L.trackBot - 8, bx, 8);
                g.fillStyle = '#ffffff'; g.fillRect(0, L.trackBot - 8, bx, 1);
                for (let m = 0; m < T.BAR_X; m += 5) {
                    const x = Math.round(m * P - st.camX);
                    if (x < -30 || x > W + 10) continue;
                    g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(x, L.trackBot - 8, 1, 8);
                    if (m % 10 === 0) Font.text(g, String(m), x + 3, L.trackBot - 16, { color: 'rgba(255,255,255,0.8)' });
                }
                // 권장 도약 구간 (노란색)
                const z0 = Math.round((T.BAR_X - T.ZONE[1]) * P - st.camX), z1 = Math.round((T.BAR_X - T.ZONE[0]) * P - st.camX);
                g.fillStyle = 'rgba(255,217,92,0.55)'; g.fillRect(z0, L.trackBot - 8, z1 - z0, 3);
                // 매트
                const mx0 = bx + 2, mw = Math.round(T.MAT_LEN * P), mh = Math.round(T.MAT_H * P);
                Draw.rect(g, mx0, gy - mh, mw, mh, '#2f6fe0');
                Draw.rect(g, mx0, gy - mh, mw, 2, '#5a90f0');
                Draw.rect(g, mx0, gy - 1, mw, 2, '#1e4aa0');
                // 기둥과 바
                const barH = Math.round(st.bar * P), postH = Math.round(2.7 * P);
                Draw.rect(g, bx - 3, gy - postH, 2, postH, '#d0d0d8');
                Draw.rect(g, bx + 3, gy - postH, 2, postH, '#d0d0d8');
                for (let h = 0.5; h <= 2.5; h += 0.5) { const yy = gy - Math.round(h * P); Draw.rect(g, bx - 5, yy, 2, 1, '#909098'); }
                const fall = st.barFall;
                const by = gy - barH + Math.round(fall * (barH - 2));
                Draw.rect(g, bx - 3, by, 8, 2, fall > 0 ? '#ff8080' : '#ffffff');
                Draw.rect(g, bx - 1, by, 2, 2, '#e03030');
                Stadium.drawGrassBelow(g, W, H);

                // 선수
                const p = st.p, x = p.pos * P - st.camX, fy = gy - p.y * P;
                let pose;
                if (st.phase === 'ready') pose = Athlete.POSE.stand;
                else if (st.phase === 'run') pose = p.v < 0.4 ? Athlete.POSE.stand : Athlete.runPose(p.anim, 8 + p.v);
                else if (st.phase === 'hold') pose = Athlete.POSE.takeoff;
                else if (st.phase === 'fly' || (st.phase === 'land' && st.jump && !st.jump.landed)) pose = st.jump.t / st.jump.T < 0.2 ? Athlete.POSE.takeoff : Athlete.POSE.clear;
                else if (st.jump && st.jump.landed && p.y >= T.MAT_H - 0.01) pose = Athlete.POSE.matland;
                else pose = st.result ? Athlete.POSE.stand : Athlete.POSE.fall;
                Athlete.draw(g, x, fy, pose, Athlete.PAL.player, 1);

                // HUD
                Draw.panel(g, 0, 0, W, 36, 'rgba(0,0,0,0.6)');
                Font.text(g, ev.name, 4, 4, { color: '#ffd95c' });
                const best = Game.best(ev);
                Font.text(g, 'BEST ' + (best == null ? '-.--' : ev.format(best)), W - 4, 4, { color: '#ffffff', align: 'right' });
                Font.text(g, 'QUALIFY ' + ev.format(ev.qualify) + ' M', W - 4, 20, { color: '#9ad0ff', align: 'right' });
                Font.text(g, 'BAR ' + ev.format(st.bar), W / 2, 2, { scale: 2, color: '#ffffff', align: 'center' });
                Font.text(g, 'TRY ' + st.attempt + '/' + ev.attempts + (st.cleared ? '   CLEARED ' + st.cleared : ''), W / 2, 20, { color: '#c8d8ff', align: 'center' });
                const kmh = Math.round(p.v * 3.6);
                Font.text(g, 'SPEED ' + String(kmh).padStart(2, '0') + ' KM/H', 4, 20, { color: '#ffffff' });
                const ratio = Math.min(1, p.v / RunTune.VMAX);
                Draw.rect(g, 4, 29, 60, 4, 'rgba(0,0,0,0.5)');
                Draw.rect(g, 4, 29, Math.round(60 * ratio), 4, ratio > 0.85 ? '#ff5050' : ratio > 0.6 ? '#ffd95c' : '#60e060');

                // 각도 화살표
                if (st.phase === 'hold') {
                    const a = st.jump.angle, good = a > 58 && a < 72;
                    const col = good ? '#60ff60' : '#ffd95c';
                    const ox = x + 10, oy = gy - 3;
                    const rad = a * Math.PI / 180, len = 30;
                    const ex = ox + Math.cos(rad) * len, ey = oy - Math.sin(rad) * len;
                    const gr = 65 * Math.PI / 180;
                    Draw.line(g, ox, oy, ox + Math.cos(gr) * len, oy - Math.sin(gr) * len, 'rgba(255,255,255,0.35)', 1);
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
                    const bad = st.msg === 'MISS' || st.msg === 'FOUL', big = st.phase === 'land';
                    const sc = big ? 2 : 1, mw = Font.width(st.msg, sc);
                    Draw.panel(g, W / 2 - mw / 2 - 8, my + 4, mw + 16, sc * 7 + 8, 'rgba(0,0,0,0.65)', 'rgba(255,255,255,0.4)');
                    Font.text(g, st.msg, W / 2, my + 8, { scale: sc, color: bad ? '#ff5050' : big ? '#60ff60' : '#ffd95c', align: 'center' });
                    if (big && st.result) Engine.kr(st.newBest ? '신기록! 바가 5cm 올라갑니다' : (Game.mode === 'olympic' && st.qualifiedNow ? '기준 통과!' : '성공! 바가 5cm 올라갑니다'), W / 2, my + 30, { size: 8, color: '#c0ffc0' });
                    if (big && !st.result) Engine.kr(st.reason === 'run' ? '도약하지 않고 바를 지났습니다' : st.reason === 'short' ? '바 앞에 떨어졌습니다' : '바를 떨어뜨렸습니다 (' + (ev.attempts - st.misses) + '번 남음)', W / 2, my + 30, { size: 8, color: '#ffb0b0' });
                }
            }
        };
        scene.debug = st;
        return scene;
    }
};
