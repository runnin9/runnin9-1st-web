// hurdles110.js - 110m 허들
// 조작: RUN 연타로 가속, 허들 직전에 JUMP. 타이밍이 어긋나면 허들을 넘어뜨리고 속도가 크게 줄어듦.
'use strict';

const Hurdles110 = {
    id: 'hurdles', name: '110M HURDLES',
    qualify: 14.00, wr: 12.80, lowerIsBetter: true,
    format: v => v.toFixed(2), unit: 'SEC',
    actionLabel: 'JUMP',

    TUNE: {
        PPM: 12,
        LENGTH: 110,
        JUMP_T: 0.45,         // 공중에 떠 있는 시간 (초)
        SAME_BTN: 0.85,       // 허들에서만: 같은 패드 연타 효율 (오른손이 JUMP 를 오가는 동안 왼손만 두드려도 덜 느려짐)
        JUMP_H: 0.6,          // 점프 높이 (m)
        CLEAR_MIN: 0.12,      // 이 구간(점프 진행률) 안에서 허들을 지나야 성공
        CLEAR_MAX: 0.92,
        HIT_SLOW: 0.45,       // 걸렸을 때 남는 속도 비율
        STUMBLE_T: 0.45       // 비틀거리는 시간 (초)
    },

    create() {
        const ev = this, T = this.TUNE, L = Stadium.L, S = Engine.S;
        const HURDLES = []; for (let i = 0; i < 10; i++) HURDLES.push(13.72 + i * 9.14);
        const st = {};

        function newRunner(cpu) {
            return { pos: 0, v: 0, anim: 0, lastBtn: null, taps: 0, done: false, time: 0,
                     air: 0, y: 0, stumble: 0, next: 0, hits: 0, cpu, hurdles: HURDLES.map(() => false),
                     react: 0.12 + Math.random() * 0.12, vss: 0 };
        }
        function resetRunners() {
            st.player = newRunner(false);
            st.cpu = newRunner(true);
            st.cpu.vss = 110 / (ev.qualify + (Math.random() * 1.0 - 0.5) - 1.6);
        }
        function toReady() { st.phase = 'ready'; st.t = 0; st.timer = 0; st.msg = ''; resetRunners(); }

        function tap(R, name) {
            const gain = name !== R.lastBtn ? RunTune.GAIN : RunTune.GAIN * T.SAME_BTN;
            R.v = Math.min(RunTune.VMAX, R.v + gain);
            R.lastBtn = name; R.taps = (R.taps || 0) + 1;
        }
        function jump(R) {
            if (R.air > 0 || R.stumble > 0 || R.done) return false;
            R.air = 0.0001;
            return true;
        }
        function advance(R, dt) {
            const prev = R.pos;
            if (R.stumble > 0) {
                R.stumble = Math.max(0, R.stumble - dt);
                RunTune.step(R, dt);
            } else {
                RunTune.step(R, dt);
            }
            if (R.air > 0) {
                R.air += dt;
                const s = Math.min(1, R.air / T.JUMP_T);
                R.y = T.JUMP_H * 4 * s * (1 - s);
                if (s >= 1) { R.air = 0; R.y = 0; }
            }
            // 허들 통과 판정
            while (R.next < HURDLES.length && R.pos >= HURDLES[R.next]) {
                const h = HURDLES[R.next];
                const s = R.air > 0 ? R.air / T.JUMP_T : -1;
                const clear = s >= T.CLEAR_MIN && s <= T.CLEAR_MAX;
                if (!clear) {
                    R.hurdles[R.next] = true;
                    R.v *= T.HIT_SLOW; R.hits++;
                    R.stumble = T.STUMBLE_T; R.air = 0; R.y = 0;
                    if (!R.cpu) { Sound.tone(160, 60, 0.25, 'sawtooth', 0.1); Native.vibrate(120); }
                    else Sound.tone(160, 80, 0.12, 'sawtooth', 0.04);
                }
                R.next++;
            }
        }

        const scene = {
            pads: true,
            enter() { Engine.setActionLabel('JUMP'); st.camX = 0; toReady(); },
            update(dt) {
                st.t += dt;
                const P = st.player, C = st.cpu;
                if (st.phase === 'ready') {
                    if (st.t > 0.5 && st.msg !== 'READY') { st.msg = 'READY'; Sound.beep(); }
                    if (st.t > 1.7) { st.phase = 'set'; st.t = 0; st.setDur = 1.0 + Math.random() * 1.3; st.msg = 'SET'; Sound.beep(); }
                } else if (st.phase === 'set') {
                    if (st.t >= st.setDur) { st.phase = 'run'; st.t = 0; st.timer = 0; st.msg = 'GO!'; Sound.gun(); Native.haptic('HEAVY'); }
                } else if (st.phase === 'false') {
                    if (st.t > 1.8) toReady();
                }
                if (st.phase === 'run' || st.phase === 'finish') {
                    if (st.phase === 'run') st.timer += dt;
                    if (st.msg === 'GO!' && st.t > 0.8) st.msg = '';
                    advance(P, dt);
                    if (!P.done && P.pos >= T.LENGTH) {
                        P.done = true;
                        P.time = st.timer - (P.pos - T.LENGTH) / Math.max(P.v, 0.1);
                        st.phase = 'finish'; st.t = 0;
                        st.qualified = P.time <= ev.qualify;
                        st.newBest = Game.isBetter(ev, P.time);
                        Game.recordResult(ev, P.time);
                        if (st.qualified) { st.newBest ? Sound.record() : Sound.jingle(); Native.haptic('MEDIUM'); }
                        else { Sound.fail(); Native.vibrate(250); }
                    }
                    // CPU: 가속하고, 허들 1.8m 앞에서 점프 (가끔 실수)
                    if (st.timer > C.react && !C.done) {
                        if (C.stumble <= 0) C.v = Math.min(C.vss, C.v + 9 * dt);
                        const nh = HURDLES[C.next];
                        if (nh != null && C.air === 0 && C.stumble <= 0 && C.pos > nh - 1.9 + (Math.random() < 0.06 ? 1.2 : 0)) jump(C);
                        advance(C, dt);
                        if (C.pos >= T.LENGTH) { C.done = true; C.time = st.timer; }
                    } else if (C.done) { C.v = Math.max(0, C.v - C.v * 1.5 * dt); C.pos += C.v * dt; C.anim += C.v * dt * 1.5; }
                    if (st.phase === 'finish' && st.t > 3.2) {
                        Game.eventFinished(ev, { value: P.time, qualified: st.qualified, newBest: st.newBest });
                        st.phase = 'done';
                    }
                }
                const target = P.pos * T.PPM - S.W * 0.35;
                st.camX = Math.max(-12 * T.PPM, Math.min((T.LENGTH + 18) * T.PPM - S.W, target));
            },
            onPress(name) {
                const P = st.player;
                if (st.phase === 'set') {
                    if (name === 'runL' || name === 'runR' || name === 'action') {
                        st.phase = 'false'; st.t = 0; st.msg = 'FALSE START!';
                        Sound.fail(); Native.vibrate(120);
                    }
                    return;
                }
                if (st.phase !== 'run' || P.done) return;
                if (name === 'runL' || name === 'runR') {
                    if (P.stumble <= 0) { tap(P, name); Sound.step(); }
                } else if (name === 'action') {
                    // JUMP 도 한 걸음으로 침 (오른손 엄지가 RUN 과 JUMP 를 오가도 리듬이 끊기지 않음)
                    if (P.stumble <= 0) tap(P, 'runR');
                    if (jump(P)) Sound.tone(300, 600, 0.1, 'square', 0.05);
                }
            },
            draw(g) {
                const W = S.W, H = S.H, P = T.PPM;
                Stadium.draw(g, st.camX, W, H, { ppm: P, length: T.LENGTH });
                // 허들 (먼 레인 = CPU, 가까운 레인 = 플레이어)
                HURDLES.forEach((h, i) => {
                    const x = Math.round(h * P - st.camX);
                    if (x < -20 || x > W + 20) return;
                    Athlete.drawHurdle(g, x, L.groundY(0), 13, st.cpu.hurdles[i]);
                });
                drawRunner(g, st.cpu, L.groundY(0), Athlete.PAL.cpu);
                HURDLES.forEach((h, i) => {
                    const x = Math.round(h * P - st.camX);
                    if (x < -20 || x > W + 20) return;
                    Athlete.drawHurdle(g, x, L.groundY(1), 13, st.player.hurdles[i]);
                });
                drawRunner(g, st.player, L.groundY(1), Athlete.PAL.player);
                // HUD
                Draw.panel(g, 0, 0, W, 36, 'rgba(0,0,0,0.6)');
                Font.text(g, ev.name, 4, 4, { color: '#ffd95c' });
                const best = Game.best(ev);
                Font.text(g, 'BEST ' + (best == null ? '--.--' : ev.format(best)), W - 4, 4, { color: '#ffffff', align: 'right' });
                Font.text(g, 'QUALIFY ' + ev.format(ev.qualify), W - 4, 20, { color: '#9ad0ff', align: 'right' });
                Font.text(g, st.timer.toFixed(2), W / 2, 2, { scale: 2, color: '#ffffff', align: 'center' });
                const kmh = Math.round(st.player.v * 3.6);
                Font.text(g, 'SPEED ' + String(kmh).padStart(2, '0') + ' KM/H', 4, 20, { color: '#ffffff' });
                const barW = 60, ratio = Math.min(1, st.player.v / RunTune.VMAX);
                Draw.rect(g, 4, 29, barW, 4, 'rgba(0,0,0,0.5)');
                Draw.rect(g, 4, 29, Math.round(barW * ratio), 4, ratio > 0.85 ? '#ff5050' : ratio > 0.6 ? '#ffd95c' : '#60e060');
                if (st.phase === 'run' || st.phase === 'finish') {
                    const rank = st.player.pos >= st.cpu.pos ? '1ST' : '2ND';
                    Font.text(g, rank + '   HURDLE ' + Math.min(10, st.player.next) + '/10' + (st.player.hits ? '  HIT ' + st.player.hits : ''), W / 2, 20, { color: rank === '1ST' ? '#ffd95c' : '#ffffff', align: 'center' });
                }
                // 메시지
                const my = 36;
                if (st.msg) {
                    const col = st.msg === 'GO!' ? '#60ff60' : st.msg.startsWith('FALSE') ? '#ff5050' : '#ffd95c';
                    const mw = Font.width(st.msg, 3);
                    Draw.panel(g, W / 2 - mw / 2 - 8, my + 4, mw + 16, 29, 'rgba(0,0,0,0.65)', 'rgba(255,255,255,0.4)');
                    Font.text(g, st.msg, W / 2, my + 8, { scale: 3, color: col, align: 'center' });
                }
                if (st.phase === 'finish' || st.phase === 'done') {
                    Draw.panel(g, W / 2 - 80, my, 160, 52, 'rgba(0,0,0,0.75)', '#ffffff');
                    Font.text(g, 'TIME ' + ev.format(st.player.time), W / 2, my + 5, { scale: 2, color: '#ffffff', align: 'center' });
                    const line = st.qualified ? (st.newBest ? 'NEW RECORD!' : 'QUALIFIED!') : 'FAILED';
                    Font.text(g, line, W / 2, my + 24, { scale: 2, color: st.qualified ? '#60ff60' : '#ff5050', align: 'center' });
                    Engine.kr(st.qualified ? (st.newBest ? Lang.t('new_record') : Lang.t('pass')) : Lang.t('fail'), W / 2, my + 41, { size: 8 });
                }
                if (st.phase === 'false') Engine.kr(Lang.t('false_start'), W / 2, my + 36, { size: 9, color: '#ffb0b0' });
            }
        };

        function drawRunner(g, R, groundY, pal) {
            const x = R.pos * T.PPM - st.camX;
            let pose;
            if (st.phase === 'ready' || st.phase === 'false') pose = Athlete.POSE.crouch;
            else if (st.phase === 'set') pose = Athlete.POSE.set;
            else if (R.air > 0) pose = Athlete.POSE.hurdle;
            else if (R.stumble > 0) pose = Athlete.POSE.stumble;
            else if (R.done && R.v < 2.5) pose = Athlete.POSE.win;
            else if (R.v < 0.4) pose = Athlete.POSE.stand;
            else pose = Athlete.runPose(R.anim, 8 + R.v);
            Athlete.draw(g, x, groundY - R.y * T.PPM, pose, pal, 1);
        }

        scene.debug = st;
        return scene;
    }
};
