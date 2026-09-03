// 저장소 루트의 game.html 을 앱의 www/index.html 로 복사합니다.
// 게임 코드는 루트의 game.html 한 곳에서만 수정하세요.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..', '..');
const www = path.resolve(__dirname, '..', 'www');
fs.mkdirSync(www, { recursive: true });
const files = [
  ['game.html', 'index.html'],
  ['icon.svg', 'icon.svg'],
  ['manifest.json', 'manifest.json']
];
for (const [src, dst] of files) {
  fs.copyFileSync(path.join(root, src), path.join(www, dst));
  console.log(`copied ${src} -> www/${dst}`);
}
