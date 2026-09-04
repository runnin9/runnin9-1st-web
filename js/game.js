// game.js - 게임 흐름: 타이틀, 모드 선택, 종목 소개, 결과, 게임 오버, 기록
'use strict';

// 종목 목록. todo: true 인 종목은 아직 준비 중
const EVENTS = [
    Dash100,
    LongJump,
    Javelin,
    { id: 'hurdles', name: '110M HURDLES', nameKr: '110m 허들', todo: true, format: v => v.toFixed(2), unit: 'SEC', lowerIsBetter: true },
    { id: 'hammer', name: 'HAMMER THROW', nameKr: '해머던지기', todo: true, format: v => v.toFixed(2), unit: 'M' },
    { id: 'highjump', name: 'HIGH JUMP', nameKr: '높이뛰기', todo: true, format: v => v.toFixed(2), unit: 'M' }
];

const Game = {
    data: null, mode: 'olympic', stage: 0,

    init() {
        this.data = Store.load();
        this.data.records = this.data.records || {};
        Native.init(exit => this.onBack(exit));
        Engine.start();
        Engine.setScene(Scenes.title());
    },
    save() { Store.save(this.data); },

    best(ev) { const v = this.data.records[ev.id]; return v == null ? null : v; },
    isBetter(ev, v) { const b = this.best(ev); if (b == null) return true; return ev.lowerIsBetter ? v < b : v > b; },
    recordResult(ev, v) { if (this.isBetter(ev, v)) { this.data.records[ev.id] = v; this.save(); } },
    availableEvents() { return EVENTS.filter(e => !e.todo); },
    // 준비된 종목을 모두 통과하면 자유 모드가 열림
    freeUnlocked() { return !!this.data.cleared; },

    startOlympic() { this.mode = 'olympic'; this.stage = 0; this.showIntro(EVENTS[0]); },
    startFree(ev) { this.mode = 'free'; this.showIntro(ev); },
    showIntro(ev) { Engine.setScene(Scenes.intro(ev)); },
    playEvent(ev) { Engine.setScene(ev.create()); },

    eventFinished(ev, result) { Engine.setScene(Scenes.result(ev, result)); },

    afterResult(ev, result) {
        if (this.mode === 'free') { Engine.setScene(Scenes.title()); return; }
        if (!result.qualified) { Engine.setScene(Scenes.gameOver(ev, result)); return; }
        this.stage++;
        const next = EVENTS[this.stage];
        if (!next) { this.data.cleared = true; this.save(); Engine.setScene(Scenes.clear()); return; }
        if (next.todo) {
            // 아직 준비되지 않은 종목: 여기까지 통과한 것으로 처리
            this.data.cleared = true; this.save();
            Engine.setScene(Scenes.comingSoon(next));
            return;
        }
        this.showIntro(next);
    },

    // 안드로이드 뒤로가기
    onBack(exit) {
        const s = Engine.currentScene();
        if (s && s.isTitle) exit();
        else Engine.setScene(Scenes.title());
    }
};

// ---------- 화면들 ----------
const Scenes = (() => {
    const S = Engine.S;

    function bg(g, t) {
        Stadium.draw(g, t * 20, S.W, S.H, { ppm: 12, length: 100 });
        Draw.panel(g, 0, 0, S.W, S.H, 'rgba(10,12,40,0.7)');
    }
    function blink(t) { return Math.floor(t * 2) % 2 === 0; }

    // 타이틀
    function title() {
        let t = 0;
        return {
            isTitle: true,
            enter() { t = 0; },
            update(dt) { t += dt; },
            onPress() { Sound.select(); Engine.setScene(menu()); },
            draw(g) {
                bg(g, t);
                const cx = S.W / 2, cy = S.H / 2;
                // 달리는 선수 데모
                const p = (t * 6) % (Math.PI * 2);
                Athlete.draw(g, ((t * 45) % (S.W + 60)) - 30, Stadium.L.groundY(1), Athlete.runPose(p, 12), Athlete.PAL.player, 1);
                Font.text(g, 'RUNNIN9', cx, cy - 46, { scale: 4, color: '#ffd95c', align: 'center' });
                Font.text(g, 'ATHLETICS', cx, cy - 12, { scale: 2, color: '#ffffff', align: 'center' });
                Engine.kr('레트로 육상 6종 경기', cx, cy + 6, { size: 9, color: '#c8d8ff' });
                if (blink(t)) Font.text(g, 'TAP TO START', cx, cy + 48, { scale: 1, color: '#ffffff', align: 'center' });
                Font.text(g, 'V0.1 PROTOTYPE', S.W - 3, S.H - 9, { color: 'rgba(255,255,255,0.5)', align: 'right' });
            }
        };
    }

    // 모드 선택
    function menu() {
        let t = 0;
        const items = () => [
            { label: 'OLYMPIC MODE', kr: '6종목을 차례로 도전', act: () => Game.startOlympic() },
            { label: 'FREE MODE', kr: Game.freeUnlocked() ? '원하는 종목만 연습' : '올림픽 모드를 먼저 완주하세요', locked: !Game.freeUnlocked(), act: () => Engine.setScene(freeSelect()) },
            { label: 'RECORDS', kr: '종목별 최고 기록', act: () => Engine.setScene(records()) }
        ];
        const rowY = i => S.H / 2 - 34 + i * 30;
        return {
            enter() { t = 0; },
            update(dt) { t += dt; },
            onPress(name, x, y) {
                const list = items();
                for (let i = 0; i < list.length; i++) {
                    if (y >= rowY(i) - 6 && y < rowY(i) + 24) {
                        if (list[i].locked) { Sound.fail(); return; }
                        Sound.select(); list[i].act(); return;
                    }
                }
            },
            draw(g) {
                bg(g, t);
                Font.text(g, 'SELECT MODE', S.W / 2, 14, { scale: 2, color: '#ffd95c', align: 'center' });
                items().forEach((it, i) => {
                    const y = rowY(i);
                    Draw.panel(g, S.W / 2 - 110, y - 6, 220, 26, 'rgba(0,0,0,0.5)', it.locked ? 'rgba(255,255,255,0.25)' : '#ffffff');
                    Font.text(g, (it.locked ? '' : '> ') + it.label + (it.locked ? '  (LOCKED)' : ''), S.W / 2 - 100, y, { color: it.locked ? '#888' : '#ffffff' });
                    Engine.kr(it.kr, S.W / 2 - 100, y + 9, { size: 7, align: 'left', color: it.locked ? '#999' : '#c8d8ff' });
                });
            }
        };
    }

    // 자유 모드 종목 선택
    function freeSelect() {
        const list = Game.availableEvents();
        const rowY = i => 36 + i * 22;
        return {
            onPress(name, x, y) {
                if (y > S.H - 20) { Sound.select(); Engine.setScene(menu()); return; }
                for (let i = 0; i < list.length; i++) if (y >= rowY(i) - 4 && y < rowY(i) + 18) { Sound.select(); Game.startFree(list[i]); return; }
            },
            draw(g) {
                bg(g, 0);
                Font.text(g, 'FREE MODE', S.W / 2, 12, { scale: 2, color: '#ffd95c', align: 'center' });
                list.forEach((ev, i) => {
                    const y = rowY(i), b = Game.best(ev);
                    Draw.panel(g, 20, y - 4, S.W - 40, 20, 'rgba(0,0,0,0.5)', '#ffffff');
                    Font.text(g, '> ' + ev.name, 26, y + 2, { color: '#ffffff' });
                    Font.text(g, 'BEST ' + (b == null ? '---' : ev.format(b) + ' ' + ev.unit), S.W - 26, y + 2, { color: '#ffd95c', align: 'right' });
                });
                Font.text(g, '< BACK', S.W / 2, S.H - 14, { color: '#ffffff', align: 'center' });
            }
        };
    }

    // 종목 소개
    function intro(ev) {
        let t = 0;
        return {
            enter() { t = 0; },
            update(dt) { t += dt; },
            onPress() { if (t > 0.4) { Sound.select(); Game.playEvent(ev); } },
            draw(g) {
                bg(g, t);
                const cx = S.W / 2;
                const idx = EVENTS.indexOf(ev) + 1;
                Font.text(g, 'EVENT ' + idx + ' / ' + EVENTS.length, cx, 10, { color: '#9ad0ff', align: 'center' });
                Font.text(g, ev.name, cx, 24, { scale: 3, color: '#ffd95c', align: 'center' });
                Engine.kr(ev.nameKr, cx, 50, { size: 11 });
                Draw.panel(g, cx - 130, 68, 260, 58, 'rgba(0,0,0,0.55)', '#ffffff');
                Font.text(g, 'QUALIFY  ' + ev.format(ev.qualify) + ' ' + ev.unit, cx, 74, { scale: 1, color: '#60ff60', align: 'center' });
                Engine.kr('기준 기록을 넘지 못하면 탈락합니다', cx, 84, { size: 7, color: '#ffb0b0' });
                (ev.hint || []).forEach((h, i) => Engine.kr(h, cx, 98 + i * 11, { size: 8, color: '#e8f0ff' }));
                if (blink(t)) Font.text(g, 'TAP TO START', cx, S.H - 40, { color: '#ffffff', align: 'center' });
                const b = Game.best(ev);
                if (b != null) Font.text(g, 'YOUR BEST ' + ev.format(b) + ' ' + ev.unit, cx, S.H - 22, { color: '#ffd95c', align: 'center' });
            }
        };
    }

    // 결과
    function result(ev, r) {
        let t = 0;
        return {
            enter() { t = 0; },
            update(dt) { t += dt; },
            onPress() { if (t > 0.6) { Sound.select(); Game.afterResult(ev, r); } },
            draw(g) {
                bg(g, t);
                const cx = S.W / 2;
                Font.text(g, ev.name, cx, 12, { scale: 2, color: '#ffd95c', align: 'center' });
                Font.text(g, ev.format(r.value) + ' ' + ev.unit, cx, 40, { scale: 3, color: '#ffffff', align: 'center' });
                const b = Game.best(ev);
                Font.text(g, 'BEST ' + ev.format(b) + ' ' + ev.unit + '   WR ' + ev.format(ev.wr) + ' ' + ev.unit, cx, 70, { color: '#c8d8ff', align: 'center' });
                if (r.newBest && blink(t)) Font.text(g, 'NEW RECORD!', cx, 86, { scale: 2, color: '#ffd95c', align: 'center' });
                Font.text(g, r.qualified ? 'QUALIFIED!' : 'NOT QUALIFIED', cx, 108, { scale: 2, color: r.qualified ? '#60ff60' : '#ff5050', align: 'center' });
                Engine.kr(r.qualified ? '기준 통과! 다음 종목으로' : '기준 기록 ' + ev.format(ev.qualify) + ' ' + ev.unit + ' 미달', cx, 126, { size: 8 });
                if (t > 0.6 && blink(t)) Font.text(g, 'TAP TO CONTINUE', cx, S.H - 22, { color: '#ffffff', align: 'center' });
            }
        };
    }

    // 게임 오버
    function gameOver(ev, r) {
        let t = 0;
        return {
            enter() { t = 0; Sound.over(); },
            update(dt) { t += dt; },
            onPress() { if (t > 0.8) { Sound.select(); Engine.setScene(title()); } },
            draw(g) {
                bg(g, t);
                const cx = S.W / 2;
                Athlete.draw(g, cx, S.H / 2 + 40, Athlete.POSE.fall, Athlete.PAL.player, 1);
                Font.text(g, 'GAME OVER', cx, 34, { scale: 4, color: '#ff5050', align: 'center' });
                Engine.kr(ev.nameKr + ' 기준 기록 미달', cx, 70, { size: 10 });
                Font.text(g, 'YOUR ' + ev.format(r.value) + '   QUALIFY ' + ev.format(ev.qualify), cx, 90, { color: '#ffffff', align: 'center' });
                if (t > 0.8 && blink(t)) Font.text(g, 'TAP TO TITLE', cx, S.H - 22, { color: '#ffffff', align: 'center' });
            }
        };
    }

    // 준비 중인 종목
    function comingSoon(ev) {
        let t = 0;
        return {
            enter() { t = 0; Sound.jingle(); },
            update(dt) { t += dt; },
            onPress() { if (t > 0.6) { Sound.select(); Engine.setScene(title()); } },
            draw(g) {
                bg(g, t);
                const cx = S.W / 2;
                Font.text(g, 'NEXT EVENT', cx, 24, { scale: 2, color: '#9ad0ff', align: 'center' });
                Font.text(g, ev.name, cx, 48, { scale: 3, color: '#ffd95c', align: 'center' });
                Font.text(g, 'COMING SOON', cx, 80, { scale: 2, color: '#ffffff', align: 'center' });
                Engine.kr(ev.nameKr + ' 종목은 준비 중입니다', cx, 100, { size: 9 });
                Engine.kr('자유 모드가 열렸습니다!', cx, 114, { size: 9, color: '#60ff60' });
                if (t > 0.6 && blink(t)) Font.text(g, 'TAP TO TITLE', cx, S.H - 22, { color: '#ffffff', align: 'center' });
            }
        };
    }

    // 전 종목 클리어
    function clear() {
        let t = 0;
        return {
            enter() { t = 0; Sound.record(); },
            update(dt) { t += dt; },
            onPress() { if (t > 0.8) { Sound.select(); Engine.setScene(title()); } },
            draw(g) {
                bg(g, t);
                const cx = S.W / 2;
                Athlete.draw(g, cx, S.H / 2 + 40, Athlete.POSE.win, Athlete.PAL.player, 1);
                Font.text(g, 'ALL CLEAR!', cx, 30, { scale: 4, color: '#ffd95c', align: 'center' });
                Engine.kr('6종목을 모두 통과했습니다! 자유 모드가 열렸습니다', cx, 66, { size: 9 });
                if (t > 0.8 && blink(t)) Font.text(g, 'TAP TO TITLE', cx, S.H - 22, { color: '#ffffff', align: 'center' });
            }
        };
    }

    // 기록
    function records() {
        return {
            onPress() { Sound.select(); Engine.setScene(menu()); },
            draw(g) {
                bg(g, 0);
                Font.text(g, 'RECORDS', S.W / 2, 10, { scale: 2, color: '#ffd95c', align: 'center' });
                Draw.panel(g, 14, 27, S.W - 28, EVENTS.length * 18 + 8, 'rgba(0,0,0,0.6)', '#ffffff');
                EVENTS.forEach((ev, i) => {
                    const y = 32 + i * 18, b = Game.best(ev);
                    Font.text(g, ev.name, 24, y, { color: ev.todo ? '#888' : '#ffffff' });
                    Font.text(g, b == null ? (ev.todo ? 'SOON' : '---') : ev.format(b) + ' ' + ev.unit, S.W - 24, y, { color: b == null ? '#888' : '#ffd95c', align: 'right' });
                });
                Font.text(g, '< BACK', S.W / 2, S.H - 14, { color: '#ffffff', align: 'center' });
            }
        };
    }

    return { title, menu, freeSelect, intro, result, gameOver, comingSoon, clear, records };
})();

Game.init();
// 테스트/디버그용
window.__athletics = { Game, Engine, EVENTS, Scenes };
