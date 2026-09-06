# '88 Athletics 출시 체크리스트

이 저장소에서 미리 준비된 것과, PC·계정이 있어야 하는 단계를 순서대로 정리했습니다.

## 준비된 것

| 항목 | 위치 |
|---|---|
| 개인정보처리방침 (5개 언어) | `privacy.html` → GitHub Pages 켜면 `https://runnin9.github.io/runnin9-1st-web/privacy.html` |
| 스토어 문구 (제목·설명·키워드, 5개 언어) | `store/listing.md` |
| 스크린샷 (App Store 6.7", Google Play, 한/영) | `store/screenshots/` |
| Google Play 그래픽 이미지 (1024×500) | `store/feature-graphic.png` |
| 앱 아이콘·스플래시 | `app/resources/`, 네이티브 프로젝트에 적용 완료 |
| Android 서명 설정 | `app/android/app/build.gradle` (keystore.properties 가 있으면 자동 서명) |
| iOS 암호화 면제 표기 | `Info.plist` 의 `ITSAppUsesNonExemptEncryption = false` |

## 0. 공통: GitHub Pages 켜기 (개인정보처리방침 URL)

1. 이 브랜치를 `main` 에 합칩니다 (PR 또는 직접 머지).
2. GitHub 저장소 → Settings → Pages → Source: `Deploy from a branch`, Branch: `main` / `(root)` → Save.
3. 몇 분 뒤 `https://runnin9.github.io/runnin9-1st-web/privacy.html` 이 열리는지 확인합니다.
   같은 주소의 `game.html` 로 웹 버전도 공개됩니다.

## 1. Google Play

### 1-1. 서명 키 만들기 (한 번만, 절대 분실 금지)
```bash
cd app/android
keytool -genkeypair -v -keystore release.jks -alias athletics88 -keyalg RSA -keysize 2048 -validity 10000
cp keystore.properties.example keystore.properties   # 값 채우기
```
`release.jks` 와 `keystore.properties` 는 git 에 올라가지 않습니다. 안전한 곳에 백업하세요. 잃어버리면 앱을 업데이트할 수 없습니다.

### 1-2. 번들(.aab) 만들기
```bash
cd app
npm run sync
cd android
./gradlew bundleRelease        # Windows: gradlew.bat bundleRelease
```
결과: `app/android/app/build/outputs/bundle/release/app-release.aab`
(또는 Android Studio → Build → Generate Signed Bundle / APK)

### 1-3. Play Console
1. https://play.google.com/console 에서 개발자 계정 등록 (1회 25달러).
2. 앱 만들기: 이름 `'88 Athletics`, 게임, 무료.
3. **대시보드의 설정 항목** 을 채웁니다.
   - 개인정보처리방침: 위 URL
   - 앱 액세스: 모든 기능이 제한 없이 사용 가능
   - 광고: 광고 없음
   - 콘텐츠 등급: 설문 → 게임, 폭력·성적 내용·욕설·도박·약물 모두 "아니오", 사용자 상호작용 없음 → 전체 이용가
   - 타겟층: 13세 이상 (아동 대상으로 하면 추가 심사가 붙으므로 13+ 권장)
   - 데이터 보안: "데이터를 수집하거나 공유하지 않음" 선택
   - 뉴스 앱 / 코로나 앱: 아니오
4. **스토어 등록정보**: `store/listing.md` 의 문구, 아이콘 512×512 (`app/resources/icon-only.png` 를 512 로 축소), 그래픽 이미지 `store/feature-graphic.png`, 스크린샷 `store/screenshots/play-*.png`. 언어별 번역 추가 (en, ja, zh-CN, es).
5. **프로덕션 → 새 버전 만들기** → `.aab` 업로드 → 출시 노트 작성 → 검토 후 출시.
   처음이면 "비공개 테스트" 트랙에 먼저 올려 12명 이상 14일 테스트 요건이 있을 수 있습니다 (2023년 이후 개인 계정 정책). 콘솔 안내를 따르세요.

## 2. App Store (iOS)

Mac 과 Xcode 가 필요합니다.

### 2-1. 준비
1. https://developer.apple.com/programs/ 가입 (연 99달러).
2. `cd app && npm run sync && cd ios/App && pod install`
3. `App.xcworkspace` 를 Xcode 로 열기 → 프로젝트 App → Signing & Capabilities → Team 선택 (Bundle ID `com.runnin9.athletics88` 은 자동 등록됨).
4. General 탭: Version `1.0.0`, Build `1`.

### 2-2. 업로드
1. 상단 기기 선택을 **Any iOS Device (arm64)** 로.
2. Product → Archive → 창이 뜨면 **Distribute App → App Store Connect → Upload**.

### 2-3. App Store Connect
1. https://appstoreconnect.apple.com → 나의 앱 → + → 새로운 앱: 이름 `'88 Athletics`, 번들 ID 선택, SKU `athletics88`.
2. **앱 정보**: 카테고리 게임 › 아케이드 (보조: 스포츠), 콘텐츠 권한, 연령 등급 설문 (모두 "없음" → 4+).
3. **개인정보 보호**: 정책 URL 입력, "데이터를 수집하지 않음" 선택.
4. **버전 정보**: `store/listing.md` 의 부제·프로모션·설명·키워드, 지원 URL (GitHub 저장소 주소로 충분), 스크린샷 `store/screenshots/ios-67-*.png` (6.7" 필수; 6.5"/5.5" 는 선택). 언어별 현지화 추가.
5. 빌드 선택 → 심사 제출. 보통 1~3일.

## 3. 심사에서 자주 걸리는 것

- 스크린샷이 실제 화면과 다르면 거절됩니다. `store/screenshots/` 는 실제 게임 화면입니다.
- iOS 는 "앱이 웹뷰만 감싼 것" 을 싫어하지만, 이 앱은 오프라인 완전 동작 게임이라 보통 문제없습니다. 심사 메모에 "오프라인 아케이드 게임, 네트워크 미사용" 을 적어 두면 좋습니다.
- "올림픽" 같은 상표는 제목·설명에 쓰지 않았습니다. 추가할 문구에도 쓰지 마세요.

## 4. 스크린샷 다시 만들기 (선택)

`store/screenshots.js` 는 Playwright 로 실제 게임 화면을 찍는 스크립트입니다.
```bash
npm i -g playwright && npx playwright install chromium
node store/screenshots.js
```
