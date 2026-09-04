# '88 Athletics 앱 (iOS / Android)

루트의 `game.html`(웹 게임)을 [Capacitor](https://capacitorjs.com)로 감싸서
앱 스토어에 올릴 수 있는 네이티브 앱으로 만든 프로젝트입니다.

- 앱 ID: `com.runnin9.athletics88`
- 앱 이름: `'88 Athletics`
- 게임 코드는 **루트의 `game.html` 한 곳**에서만 수정합니다. `npm run sync`가 `www/index.html`로 복사해 줍니다.

## 폴더 구조

```
app/
├── capacitor.config.json   앱 ID, 이름, 플러그인 설정
├── package.json            빌드 스크립트
├── scripts/copy-web.js     ../game.html → www/index.html 복사
├── resources/              아이콘·스플래시 원본 PNG (1024px, 2732px)
├── www/                    (자동 생성, git 제외) 앱에 들어가는 웹 파일
├── android/                Android Studio 프로젝트
└── ios/                    Xcode 프로젝트
```

## 준비물

| 대상 | 필요한 것 |
|---|---|
| 공통 | Node.js 18 이상 |
| Android | [Android Studio](https://developer.android.com/studio) (SDK 포함), JDK 17 |
| iOS | macOS + [Xcode](https://apps.apple.com/app/xcode/id497799835), CocoaPods (`sudo gem install cocoapods`) |

## 처음 한 번

```bash
cd app
npm install
npm run sync          # 웹 파일 복사 + 네이티브 플러그인 동기화
```

iOS는 Mac에서 추가로 한 번:

```bash
cd ios/App && pod install && cd ../..
```

## 실행해 보기

```bash
npm run open:android  # Android Studio 열기 → 에뮬레이터/실기기에서 ▶ 실행
npm run open:ios      # Xcode 열기 → 시뮬레이터/실기기에서 ▶ 실행
```

또는 기기를 연결한 상태에서 `npm run run:android` / `npm run run:ios`.

게임을 수정한 뒤에는 항상 `npm run sync`를 다시 실행해야 앱에 반영됩니다.

## 아이콘 / 스플래시 바꾸기

`resources/` 안의 PNG를 교체한 뒤:

```bash
npm run assets
```

| 파일 | 크기 | 용도 |
|---|---|---|
| `icon-only.png` | 1024×1024 | iOS 아이콘, Android 일반 아이콘 |
| `icon-foreground.png` | 1024×1024 | Android 적응형 아이콘 앞면 (투명 배경) |
| `icon-background.png` | 1024×1024 | Android 적응형 아이콘 배경 |
| `splash.png`, `splash-dark.png` | 2732×2732 | 시작 화면 |

## 스토어 출시

### Google Play (Android)

1. `android/app/build.gradle`에서 `versionCode`(정수, 올릴 때마다 +1)와 `versionName`(예: `1.0.0`)을 수정합니다.
2. Android Studio → **Build → Generate Signed Bundle / APK → Android App Bundle**.
   - 처음이면 키스토어(.jks)를 새로 만듭니다. **키스토어와 비밀번호는 절대 잃어버리면 안 됩니다** (업데이트를 올릴 수 없게 됩니다). git에도 올리지 마세요(.gitignore에 이미 제외됨).
3. 만들어진 `.aab` 파일을 [Google Play Console](https://play.google.com/console)에 업로드합니다.
   - 개발자 계정 등록(1회 25달러), 앱 정보·스크린샷·개인정보처리방침 URL 입력 필요.

### App Store (iOS)

1. [Apple Developer Program](https://developer.apple.com/programs/) 가입(연 99달러).
2. Xcode에서 `ios/App/App.xcworkspace`를 열고 **Signing & Capabilities → Team**을 본인 계정으로 설정합니다.
3. **General** 탭에서 Version(예: 1.0.0)과 Build(정수) 설정.
4. 상단 기기 선택을 **Any iOS Device**로 바꾸고 **Product → Archive**.
5. Archive 창에서 **Distribute App → App Store Connect**로 업로드.
6. [App Store Connect](https://appstoreconnect.apple.com)에서 앱 정보·스크린샷·심사 제출.

### 스토어 심사 시 필요한 것들

- 앱 스크린샷 (폰 세로/가로 화면 캡처)
- 개인정보처리방침 URL: 이 앱은 개인정보를 수집하지 않지만 양쪽 스토어 모두 URL을 요구합니다.
  GitHub Pages에 간단한 페이지 하나를 올려서 쓰면 됩니다.
- 앱 설명, 카테고리(게임 → 아케이드), 연령 등급 설문

## 앱에서 사용하는 네이티브 기능

| 플러그인 | 용도 |
|---|---|
| `@capacitor/status-bar` | 게임 중 상태바 숨김(전체 화면) |
| `@capacitor/haptics` | 점프 시 가벼운 진동, 충돌 시 강한 진동 |
| `@capacitor/app` | Android 뒤로가기 버튼: 플레이 중 → 일시정지, 그 외 → 타이틀, 타이틀 → 종료 |

브라우저에서 `game.html`을 열면 이 기능들은 자동으로 건너뛰고 웹 방식으로 동작합니다.
