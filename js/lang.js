// lang.js - 다국어 문구 표. Lang.t('key', {vars}) 로 사용.
// 픽셀 폰트(영문 대문자)로 그리는 라벨은 영문 그대로 두고, 시스템 폰트로 그리는 설명·메시지만 번역합니다.
'use strict';

const Lang = (() => {
    const list = [
        { code: 'ko', label: '한국어' },
        { code: 'en', label: 'English' },
        { code: 'ja', label: '日本語' },
        { code: 'zh', label: '中文' },
        { code: 'es', label: 'Español' }
    ];

    const S = {
        ko: {
            rotate: '폰을 가로로 돌려주세요',
            subtitle: '레트로 육상 6종 경기',
            menu_olympic: '6종목을 차례로 도전',
            menu_free: '원하는 종목만 연습',
            menu_free_locked: '올림픽 모드를 먼저 완주하세요',
            menu_records: '종목별 최고 기록',
            menu_settings: '왼손잡이 · 언어',
            intro_qualify: '기준 기록을 넘지 못하면 탈락합니다',
            result_pass: '기준 통과! 다음 종목으로',
            result_fail: '기준 기록 {q} {u} 미달',
            over_reason: '{ev} 기준 기록 미달',
            clear_all: '6종목을 모두 통과했습니다! 자유 모드가 열렸습니다',
            soon: '{ev} 종목은 준비 중입니다',
            soon_free: '자유 모드가 열렸습니다!',
            set_title: '설정',
            set_left: '왼손잡이 모드',
            set_left_desc: '점프/던지기 패드를 왼쪽 RUN 옆에 둡니다',
            set_lang: '언어',
            on: '켬', off: '끔',
            // 종목 공통
            new_record: '신기록!',
            pass: '기준 통과!',
            new_record_pass: '신기록! 기준 통과',
            fail: '기준 기록 미달',
            fail_q: '기준 {q}m 미달',
            false_start: '부정 출발! 총성 후에 두드리세요',
            foul_board: '파울! 발구름판을 넘었습니다',
            foul_line: '파울! 선을 넘았습니다',
            foul_time: '파울! 시간 초과',
            foul_cage: '파울! 해머가 케이지에 맞았습니다',
            hj_record: '신기록! 바가 5cm 올라갑니다',
            hj_clear: '성공! 바가 5cm 올라갑니다',
            hj_run: '도약하지 않고 바를 지났습니다',
            hj_short: '바 앞에 떨어졌습니다',
            hj_hit: '바를 떨어뜨렸습니다 ({n}번 남음)',
            ev: {
                dash100: { name: '100m 달리기', hint: ['RUN 패드 두 개를 양손 엄지로 번갈아 두드리세요', '출발 총성 전에 누르면 부정 출발입니다'] },
                longjump: { name: '멀리뛰기', hint: ['RUN 연타로 달려서 흰 발구름판 위에서 JUMP', 'JUMP 를 누르고 있으면 각도가 올라갑니다. 45도쯤에서 떼세요', '판을 지나서 뛰면 FOUL. 기회는 3번'] },
                javelin: { name: '창던지기', hint: ['RUN 연타로 달리다 빨간 선 2m 앞(노란 표시)에서 THROW', '누르면 선수가 멈춰 서고 누르는 동안 각도가 오릅니다', '선을 넘기 전에 떼야 합니다. 45도쯤이 최적. 기회는 3번'] },
                hurdles: { name: '110m 허들', hint: ['RUN 연타로 달리다 허들 바로 앞에서 JUMP', '너무 빠르거나 늦으면 허들에 걸려 느려집니다', '허들 10개, 출발 총성 전에 누르면 부정 출발'] },
                hammer: { name: '해머던지기', hint: ['RUN 연타로 회전 속도를 올리세요 (게이지가 빨강이면 최고)', 'GO 가 켜지는 순간 THROW 를 누르세요. 해머 방향이 그때 정해집니다', '누르고 있으면 각도가 오릅니다. 45도에서 떼세요. 기회는 3번'] },
                highjump: { name: '높이뛰기', hint: ['RUN 연타로 달려서 바 앞 노란 구간에서 JUMP', '누르고 있으면 각도가 오릅니다. 높이뛰기는 60~70도가 좋습니다', '바보다 높이 넘으면 성공. 3번 안에 넘으면 통과, 넘을 때마다 바가 5cm 올라갑니다'] }
            }
        },
        en: {
            rotate: 'Please rotate your phone to landscape',
            subtitle: 'Retro track & field, 6 events',
            menu_olympic: 'Take on all 6 events in order',
            menu_free: 'Practice any event you like',
            menu_free_locked: 'Finish Olympic mode first',
            menu_records: 'Best record per event',
            menu_settings: 'Left-handed · Language',
            intro_qualify: 'Miss the qualifying mark and you are out',
            result_pass: 'Qualified! On to the next event',
            result_fail: 'Below the qualifying mark of {q} {u}',
            over_reason: 'Failed to qualify in {ev}',
            clear_all: 'All 6 events cleared! Free mode is unlocked',
            soon: '{ev} is coming soon',
            soon_free: 'Free mode is unlocked!',
            set_title: 'Settings',
            set_left: 'Left-handed mode',
            set_left_desc: 'Puts the jump/throw pad next to the left RUN pad',
            set_lang: 'Language',
            on: 'ON', off: 'OFF',
            new_record: 'New record!',
            pass: 'Qualified!',
            new_record_pass: 'New record! Qualified',
            fail: 'Below the qualifying mark',
            fail_q: 'Below the qualifying mark of {q} m',
            false_start: 'False start! Wait for the gun',
            foul_board: 'Foul! You went past the board',
            foul_line: 'Foul! You crossed the line',
            foul_time: 'Foul! Time is up',
            foul_cage: 'Foul! The hammer hit the cage',
            hj_record: 'New record! The bar goes up 5 cm',
            hj_clear: 'Cleared! The bar goes up 5 cm',
            hj_run: 'You ran past the bar without jumping',
            hj_short: 'You landed in front of the bar',
            hj_hit: 'You knocked the bar off ({n} left)',
            ev: {
                dash100: { name: '100m Dash', hint: ['Tap the two RUN pads alternately with both thumbs', 'Pressing before the gun is a false start'] },
                longjump: { name: 'Long Jump', hint: ['Sprint with RUN, then press JUMP on the white board', 'Hold JUMP to raise the angle. Release around 45°', 'Jumping past the board is a FOUL. 3 attempts'] },
                javelin: { name: 'Javelin', hint: ['Sprint with RUN, press THROW 2 m before the red line (yellow mark)', 'Pressing stops the athlete; the angle rises while held', 'Release before crossing the line. About 45° is best. 3 attempts'] },
                hurdles: { name: '110m Hurdles', hint: ['Sprint with RUN and press JUMP right before each hurdle', 'Too early or too late and you clip the hurdle and slow down', '10 hurdles. Pressing before the gun is a false start'] },
                hammer: { name: 'Hammer Throw', hint: ['Tap RUN to spin faster (red gauge = max)', 'Press THROW the moment GO lights up. That sets the direction', 'Hold to raise the angle, release at 45°. 3 attempts'] },
                highjump: { name: 'High Jump', hint: ['Sprint with RUN and press JUMP in the yellow zone before the bar', 'Hold to raise the angle. 60-70° works best for high jump', 'Clear the bar to succeed. 3 attempts per height; the bar rises 5 cm each clear'] }
            }
        },
        ja: {
            rotate: 'スマホを横向きにしてください',
            subtitle: 'レトロ陸上6種目',
            menu_olympic: '6種目に順番に挑戦',
            menu_free: '好きな種目だけ練習',
            menu_free_locked: '先にオリンピックモードを完走してください',
            menu_records: '種目別ベスト記録',
            menu_settings: '左利き · 言語',
            intro_qualify: '基準記録に届かないと失格です',
            result_pass: '基準クリア！次の種目へ',
            result_fail: '基準記録 {q} {u} に届きませんでした',
            over_reason: '{ev} で基準記録に届きませんでした',
            clear_all: '6種目すべてクリア！フリーモードが開放されました',
            soon: '{ev} は準備中です',
            soon_free: 'フリーモードが開放されました！',
            set_title: '設定',
            set_left: '左利きモード',
            set_left_desc: 'ジャンプ/投てきパッドを左のRUNの隣に置きます',
            set_lang: '言語',
            on: 'オン', off: 'オフ',
            new_record: '新記録！',
            pass: '基準クリア！',
            new_record_pass: '新記録！基準クリア',
            fail: '基準記録に届きませんでした',
            fail_q: '基準 {q}m に届きませんでした',
            false_start: 'フライング！号砲の後に叩いてください',
            foul_board: 'ファウル！踏み切り板を越えました',
            foul_line: 'ファウル！ラインを越えました',
            foul_time: 'ファウル！時間切れ',
            foul_cage: 'ファウル！ハンマーがケージに当たりました',
            hj_record: '新記録！バーが5cm上がります',
            hj_clear: '成功！バーが5cm上がります',
            hj_run: '跳ばずにバーを通過しました',
            hj_short: 'バーの手前に落ちました',
            hj_hit: 'バーを落としました（残り{n}回）',
            ev: {
                dash100: { name: '100m走', hint: ['両手の親指で2つのRUNパッドを交互に連打', '号砲の前に押すとフライングです'] },
                longjump: { name: '走幅跳', hint: ['RUN連打で助走し、白い踏み切り板の上でJUMP', 'JUMPを押し続けると角度が上がります。45度あたりで離す', '板を越えて跳ぶとFOUL。3回まで'] },
                javelin: { name: 'やり投', hint: ['RUN連打で走り、赤いラインの2m手前（黄色の印）でTHROW', '押すと選手が止まり、押している間に角度が上がります', 'ラインを越える前に離すこと。45度が最適。3回まで'] },
                hurdles: { name: '110mハードル', hint: ['RUN連打で走り、ハードルの直前でJUMP', '早すぎても遅すぎてもハードルに引っかかり減速します', 'ハードル10台。号砲の前に押すとフライング'] },
                hammer: { name: 'ハンマー投', hint: ['RUN連打で回転を速く（ゲージが赤で最高）', 'GOが点いた瞬間にTHROW。その時に方向が決まります', '押し続けると角度が上がる。45度で離す。3回まで'] },
                highjump: { name: '走高跳', hint: ['RUN連打で走り、バー手前の黄色いゾーンでJUMP', '押し続けると角度が上がる。走高跳は60〜70度が良い', 'バーを越えれば成功。各高さ3回まで、成功ごとにバーが5cm上がる'] }
            }
        },
        zh: {
            rotate: '请将手机横过来',
            subtitle: '复古田径六项',
            menu_olympic: '依次挑战全部6个项目',
            menu_free: '自由练习任意项目',
            menu_free_locked: '请先完成奥运模式',
            menu_records: '各项目最佳纪录',
            menu_settings: '左手模式 · 语言',
            intro_qualify: '未达到及格线即淘汰',
            result_pass: '达标！进入下一项目',
            result_fail: '未达到及格线 {q} {u}',
            over_reason: '{ev} 未达标',
            clear_all: '6个项目全部通过！自由模式已解锁',
            soon: '{ev} 敬请期待',
            soon_free: '自由模式已解锁！',
            set_title: '设置',
            set_left: '左手模式',
            set_left_desc: '把跳跃/投掷键放在左侧RUN键旁',
            set_lang: '语言',
            on: '开', off: '关',
            new_record: '新纪录！',
            pass: '达标！',
            new_record_pass: '新纪录！达标',
            fail: '未达到及格线',
            fail_q: '未达到及格线 {q} 米',
            false_start: '抢跑！请在枪响后再按',
            foul_board: '犯规！越过了起跳板',
            foul_line: '犯规！越过了投掷线',
            foul_time: '犯规！超时',
            foul_cage: '犯规！链球撞到了护笼',
            hj_record: '新纪录！横杆升高5厘米',
            hj_clear: '成功！横杆升高5厘米',
            hj_run: '未起跳就越过了横杆',
            hj_short: '落在了横杆前面',
            hj_hit: '碰落横杆（剩余{n}次）',
            ev: {
                dash100: { name: '100米短跑', hint: ['用两个拇指交替快速点击两个RUN键', '枪响前按下即为抢跑'] },
                longjump: { name: '跳远', hint: ['连点RUN助跑，在白色起跳板上按JUMP', '按住JUMP角度上升，约45度时松开', '越过起跳板起跳为犯规。3次机会'] },
                javelin: { name: '标枪', hint: ['连点RUN助跑，在红线前2米（黄色标记）按THROW', '按下后运动员停下，按住时角度上升', '越线前松开。约45度最佳。3次机会'] },
                hurdles: { name: '110米栏', hint: ['连点RUN奔跑，在栏架前按JUMP', '过早或过晚都会撞栏减速', '10个栏架，枪响前按下即为抢跑'] },
                hammer: { name: '链球', hint: ['连点RUN加快旋转（仪表变红为最快）', 'GO亮起的瞬间按THROW，此时确定方向', '按住时角度上升，45度时松开。3次机会'] },
                highjump: { name: '跳高', hint: ['连点RUN助跑，在横杆前的黄色区域按JUMP', '按住时角度上升。跳高以60~70度为佳', '越过横杆即成功。每个高度3次机会，每次成功横杆升高5厘米'] }
            }
        },
        es: {
            rotate: 'Gira el teléfono en horizontal',
            subtitle: 'Atletismo retro, 6 pruebas',
            menu_olympic: 'Afronta las 6 pruebas en orden',
            menu_free: 'Practica la prueba que quieras',
            menu_free_locked: 'Termina primero el modo olímpico',
            menu_records: 'Mejor marca por prueba',
            menu_settings: 'Zurdo · Idioma',
            intro_qualify: 'Si no alcanzas la marca mínima, quedas eliminado',
            result_pass: '¡Clasificado! A la siguiente prueba',
            result_fail: 'Por debajo de la marca mínima de {q} {u}',
            over_reason: 'No alcanzaste la marca en {ev}',
            clear_all: '¡Las 6 pruebas superadas! Modo libre desbloqueado',
            soon: '{ev} estará disponible pronto',
            soon_free: '¡Modo libre desbloqueado!',
            set_title: 'Ajustes',
            set_left: 'Modo zurdo',
            set_left_desc: 'Coloca el botón de salto/lanzamiento junto al RUN izquierdo',
            set_lang: 'Idioma',
            on: 'SÍ', off: 'NO',
            new_record: '¡Nuevo récord!',
            pass: '¡Clasificado!',
            new_record_pass: '¡Nuevo récord! Clasificado',
            fail: 'Por debajo de la marca mínima',
            fail_q: 'Por debajo de la marca mínima de {q} m',
            false_start: '¡Salida nula! Espera al disparo',
            foul_board: '¡Nulo! Pasaste la tabla de batida',
            foul_line: '¡Nulo! Cruzaste la línea',
            foul_time: '¡Nulo! Se acabó el tiempo',
            foul_cage: '¡Nulo! El martillo golpeó la jaula',
            hj_record: '¡Nuevo récord! El listón sube 5 cm',
            hj_clear: '¡Superado! El listón sube 5 cm',
            hj_run: 'Pasaste el listón sin saltar',
            hj_short: 'Caíste antes del listón',
            hj_hit: 'Derribaste el listón ({n} restantes)',
            ev: {
                dash100: { name: '100 m lisos', hint: ['Pulsa los dos botones RUN alternando ambos pulgares', 'Pulsar antes del disparo es salida nula'] },
                longjump: { name: 'Salto de longitud', hint: ['Corre con RUN y pulsa JUMP sobre la tabla blanca', 'Mantén JUMP para subir el ángulo. Suelta cerca de 45°', 'Saltar pasada la tabla es NULO. 3 intentos'] },
                javelin: { name: 'Jabalina', hint: ['Corre con RUN y pulsa THROW 2 m antes de la línea roja (marca amarilla)', 'Al pulsar, el atleta se detiene y el ángulo sube mientras mantienes', 'Suelta antes de cruzar la línea. Unos 45° es lo ideal. 3 intentos'] },
                hurdles: { name: '110 m vallas', hint: ['Corre con RUN y pulsa JUMP justo antes de cada valla', 'Demasiado pronto o tarde y tropiezas con la valla', '10 vallas. Pulsar antes del disparo es salida nula'] },
                hammer: { name: 'Lanzamiento de martillo', hint: ['Pulsa RUN para girar más rápido (barra roja = máximo)', 'Pulsa THROW en cuanto se encienda GO. Eso fija la dirección', 'Mantén para subir el ángulo y suelta a 45°. 3 intentos'] },
                highjump: { name: 'Salto de altura', hint: ['Corre con RUN y pulsa JUMP en la zona amarilla antes del listón', 'Mantén para subir el ángulo. En altura, 60-70° va mejor', 'Supera el listón para acertar. 3 intentos por altura; sube 5 cm cada acierto'] }
            }
        }
    };

    let current = 'ko';
    function detect() {
        const nav = (navigator.language || 'en').toLowerCase();
        for (const l of list) if (nav.startsWith(l.code)) return l.code;
        return 'en';
    }
    function set(code) { current = S[code] ? code : 'en'; }
    function get() { return current; }
    function lookup(table, key) {
        let v = table;
        for (const part of key.split('.')) { if (v == null) return undefined; v = v[part]; }
        return v;
    }
    function t(key, vars) {
        let v = lookup(S[current], key);
        if (v === undefined) v = lookup(S.en, key);
        if (v === undefined) v = lookup(S.ko, key);
        if (v === undefined) return key;
        if (typeof v === 'string' && vars) v = v.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
        return v;
    }
    function evName(ev) { return t('ev.' + ev.id + '.name'); }
    function evHint(ev) { const h = t('ev.' + ev.id + '.hint'); return Array.isArray(h) ? h : []; }
    function next(dir) {
        const i = list.findIndex(l => l.code === current);
        const n = (i + dir + list.length) % list.length;
        set(list[n].code);
        return current;
    }
    function label() { const l = list.find(x => x.code === current); return l ? l.label : current; }

    return { list, t, set, get, detect, evName, evHint, next, label };
})();
