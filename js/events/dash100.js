// dash100.js - 100m 달리기
// 조작: RUN 패드 두 개를 번갈아 두드려 가속. 출발 총성 전에 누르면 부정 출발.
'use strict';

const Dash100 = {
    id: 'dash100', name: '100M DASH', nameKr: '100m 달리기',
    qualify: 11.50,          // 기준 기록 (초). 넘지 못하면 게임 오버
    wr: 9.90,                // 표시용 세계 기록
    lowerIsBetter: true,
    format: v => v.toFixed(2),
    unit: 'SEC',
    hint: ['RUN 패드 두 개를 양손 엄지로 번갈아 두드리세요', '출발 총성 전에 누르면 부정 출발입니다'],
    actionLabel: '',

    // ----- 조작감 튜닝 상수 -----
    TUNE: {
        GAIN: 1.55,          // 한 번 두드릴 때 늘어나는 속도 (m/s)
        SAME_BTN: 0.7,       // 같은 패드를 연속으로 두드릴 때의 효율
        DRAG: 1.2,           // 초당 속도 감쇠 비율
        VMAX: 11.6,          // 최고 속도 (m/s)
        PPM: 12              // 1m 당 픽셀
    },

    create() {
        const ev = this, T = this.TUNE, L = Stadium.L;
        const S = Engine.S;
        const st = {};

        function resetRunners() {
            st.player = { pos: 0, v: 0, anim: 0, lastBtn: null, done: false, time: 0, taps: 0 };
            st.cpu = { pos: 0, v: 0, anim: 0, done: false, time: 0, react: 0.12 + Math.random() * 0.12,
                       vss: 100 / (ev.qualify + (Math.random() * 1.0 - 0.6) - 0.9) };
        }
        function toReady() { st.phase = 'ready'; st.t = 0; st.timer = 0; st.msg = ''; resetRunners(); }

        const scene = {
            pads: true,
            enter() { Engine.setActionLabel(''); st.falseStarts = 0; st.camX = 0; toReady(); },
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
                    // 플레이어
                    P.v = Math.max(0, P.v - P.v * T.DRAG * dt);
                    P.pos += P.v * dt;
                    P.anim += P.v * dt * 1.5;
                    if (!P.done && P.pos >= 100) {
                        P.done = true;
                        P.time = st.timer - (P.pos - 100) / Math.max(P.v, 0.1);
                        st.phase = 'finish'; st.t = 0;
                        st.qualified = P.time <= ev.qualify;
                        st.newBest = Game.isBetter(ev, P.time);
                        Game.recordResult(ev, P.time);
                        if (st.qualified) { st.newBest ? Sound.record() : Sound.jingle(); Native.haptic('MEDIUM'); }
                        else { Sound.fail(); Native.vibrate(250); }
                    }
                    // CPU 선수
                    if (st.timer > C.react && !C.done) {
                        C.v = Math.min(C.vss, C.v + 9 * dt);
                        C.pos += C.v * dt; C.anim += C.v * dt * 1.5;
                        if (C.pos >= 100) { C.done = true; C.time = st.timer; }
                    } else if (C.done) { C.v = Math.max(0, C.v - C.v * 1.5 * dt); C.pos += C.v * dt; C.anim += C.v * dt * 1.5; }
                    if (st.phase === 'finish' && st.t > 3.2) {
                        Game.eventFinished(ev, { value: P.time, qualified: st.qualified, newBest: st.newBest });
                        st.phase = 'done';
                    }
                }
                // 카메라
                const target = P.pos * T.PPM - S.W * 0.35;
                st.camX = Math.max(-12 * T.PPM, Math.min(118 * T.PPM - S.W, target));
            },
            onPress(name) {
                if (name !== 'runL' && name !== 'runR') return;
                const P = st.player;
                if (st.phase === 'set') {
                    st.phase = 'false'; st.t = 0; st.msg = 'FALSE START!'; st.falseStarts++;
                    Sound.fail(); Native.vibrate(120);
                } else if (st.phase === 'run' && !P.done) {
                    const gain = name !== P.lastBtn ? T.GAIN : T.GAIN * T.SAME_BTN;
                    P.v = Math.min(T.VMAX, P.v + gain);
                    P.lastBtn = name; P.taps++;
                    Sound.step();
                }
            },
            draw(g) {
                const W = S.W, H = S.H;
                Stadium.draw(g, st.camX, W, H, { ppm: T.PPM, length: 100 });
                // 선수 그리기 (먼 레인 = CPU, 가까운 레인 = 플레이어)
                drawRunner(g, st.cpu, L.groundY(0), Athlete.PAL.cpu);
                drawRunner(g, st.player, L.groundY(1), Athlete.PAL.player);
                // HUD
                Draw.panel(g, 0, 0, W, 36, 'rgba(0,0,0,0.6)');
                Font.text(g, ev.name, 4, 4, { color: '#ffd95c' });
                const best = Game.best(ev);
                Font.text(g, 'BEST ' + (best == null ? '--.--' : ev.format(best)), W - 4, 4, { color: '#ffffff', align: 'right' });
                Font.text(g, 'QUALIFY ' + ev.format(ev.qualify), W - 4, 20, { color: '#9ad0ff', align: 'right' });
                Font.text(g, st.timer.toFixed(2), W / 2, 2, { scale: 2, color: '#ffffff', align: 'center' });
                // 속도계
                const kmh = Math.round(st.player.v * 3.6);
                Font.text(g, 'SPEED ' + String(kmh).padStart(2, '0') + ' KM/H', 4, 20, { color: '#ffffff' });
                const barW = 60, ratio = Math.min(1, st.player.v / T.VMAX);
                Draw.rect(g, 4, 29, barW, 4, 'rgba(0,0,0,0.5)');
                Draw.rect(g, 4, 29, Math.round(barW * ratio), 4, ratio > 0.85 ? '#ff5050' : ratio > 0.6 ? '#ffd95c' : '#60e060');
                // 순위 표시
                if (st.phase === 'run' || st.phase === 'finish') {
                    const rank = st.player.pos >= st.cpu.pos ? '1ST' : '2ND';
                    Font.text(g, rank, W / 2, 20, { color: rank === '1ST' ? '#ffd95c' : '#ffffff', align: 'center' });
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
                    Engine.kr(st.qualified ? (st.newBest ? '신기록!' : '기준 통과!') : '기준 기록 미달', W / 2, my + 41, { size: 8 });
                }
                if (st.phase === 'false') Engine.kr('부정 출발! 총성 후에 두드리세요', W / 2, my + 36, { size: 9, color: '#ffb0b0' });
            }
        };

        function drawRunner(g, R, groundY, pal) {
            const x = R.pos * T.PPM - st.camX;
            let pose;
            if (st.phase === 'ready' || st.phase === 'false') pose = Athlete.POSE.crouch;
            else if (st.phase === 'set') pose = Athlete.POSE.set;
            else if (R.done && R.v < 2.5) pose = Athlete.POSE.win;
            else if (R.v < 0.4) pose = Athlete.POSE.stand;
            else pose = Athlete.runPose(R.anim, 8 + R.v);
            Athlete.draw(g, x, groundY, pose, pal, 1);
        }

        scene.debug = st;
        return scene;
    }
};
