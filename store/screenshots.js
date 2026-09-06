// 스토어용 스크린샷과 Google Play 그래픽 이미지를 실제 게임 화면으로 찍습니다.
// 사용: node store/screenshots.js   (Playwright + Chromium 필요)
const path = require('path');
const fs = require('fs');
let pw;
try { pw = require('playwright'); } catch (e) { pw = require(path.join(require('child_process').execSync('npm root -g').toString().trim(), 'playwright')); }
const { chromium } = pw;
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'screenshots');
fs.mkdirSync(OUT, { recursive: true });

// 각 장면을 만드는 설정 (게임의 디버그 훅 사용)
const SHOTS = [
  { name: 'title', setup: `A.Engine.setScene(A.Scenes.title())`, wait: 900 },
  { name: 'dash100', setup: `A.Game.mode='free'; A.Game.playEvent(A.EVENTS[0]); const d=A.Engine.currentScene().debug; d.phase='run'; d.timer=4.21; d.player.pos=36; d.player.v=10.2; d.player.anim=3; d.cpu.pos=34.5; d.cpu.v=9.6; d.cpu.anim=1;`, wait: 60 },
  { name: 'longjump', setup: `A.Game.mode='free'; A.Game.playEvent(A.EVENTS[1]); const s=A.Engine.currentScene(); const d=s.debug; d.phase='run'; d.p.pos=39.3; d.p.v=10; s.onPress('action'); d.jump.angle=44;`, wait: 60 },
  { name: 'javelin', setup: `A.Game.mode='free'; A.Game.playEvent(A.EVENTS[2]); const s=A.Engine.currentScene(); const d=s.debug; d.phase='run'; d.p.pos=32.8; d.p.v=10.3; s.onPress('action'); d.j.angle=45;`, wait: 60 },
  { name: 'hurdles', setup: `A.Game.mode='free'; A.Game.playEvent(A.EVENTS[3]); const d=A.Engine.currentScene().debug; d.phase='run'; d.timer=3.9; d.player.pos=30.6; d.player.v=10; d.player.air=0.2; d.player.y=0.55; d.player.next=2; d.cpu.pos=29; d.cpu.v=9.5; d.cpu.next=2;`, wait: 60 },
  { name: 'hammer', setup: `A.Game.mode='free'; A.Game.playEvent(A.EVENTS[4]); const d=A.Engine.currentScene().debug; d.phase='spin'; d.p.w=9.4; d.p.theta=5.6;`, wait: 60 },
  { name: 'highjump', setup: `A.Game.mode='free'; A.Game.playEvent(A.EVENTS[5]); const s=A.Engine.currentScene(); const d=s.debug; d.phase='run'; d.p.pos=23.2; d.p.v=9.8; s.onPress('action'); d.jump.angle=66; s.onRelease('action'); d.jump.t=d.jump.T*0.45; d.p.pos=d.jump.from+d.jump.dist*0.45; d.p.y=d.jump.height*4*0.45*0.55;`, wait: 60 },
  { name: 'menu', setup: `A.Game.data.cleared=true; A.Engine.setScene(A.Scenes.menu())`, wait: 100 }
];
const SIZES = [
  { tag: 'ios-67', width: 932, height: 430, dpr: 3 },    // 2796x1290 (iPhone 6.7")
  { tag: 'play', width: 960, height: 540, dpr: 2 }       // 1920x1080
];
const LANGS = ['ko', 'en'];

(async () => {
  const browser = await chromium.launch();
  for (const size of SIZES) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: size.dpr, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await page.goto('file://' + path.join(ROOT, 'game.html'));
    await page.waitForTimeout(300);
    for (const lang of LANGS) {
      await page.evaluate(l => Lang.set(l), lang);
      for (const shot of SHOTS) {
        await page.evaluate(code => { const A = window.__athletics; new Function('A', code)(A); }, shot.setup);
        await page.waitForTimeout(shot.wait);
        const file = path.join(OUT, `${size.tag}-${lang}-${shot.name}.png`);
        await page.screenshot({ path: file });
        console.log('saved', path.relative(ROOT, file));
      }
    }
    await context.close();
  }
  // Google Play 그래픽 이미지 1024x500: 아이콘 로고 + 문구
  const icon = fs.readFileSync(path.join(ROOT, 'icon.svg'), 'utf8').replace('<svg ', '<svg width="300" height="300" shape-rendering="crispEdges" ');
  const html = `<div style="width:1024px;height:500px;background:#10122a;display:flex;align-items:center;justify-content:center;gap:56px;font-family:system-ui,sans-serif">
    ${icon}
    <div style="color:#fff"><div style="font-size:64px;font-weight:800;color:#ffd95c;letter-spacing:2px">'88 ATHLETICS</div>
    <div style="font-size:30px;margin-top:10px;opacity:.9">Retro arcade track &amp; field</div>
    <div style="font-size:26px;margin-top:22px;opacity:.75">6 events · Pixel art · No ads</div></div></div>`;
  const page = await (await browser.newContext({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 })).newPage();
  await page.setContent(`<html><body style="margin:0">${html}</body></html>`);
  await page.screenshot({ path: path.join(__dirname, 'feature-graphic.png') });
  console.log('saved store/feature-graphic.png');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
