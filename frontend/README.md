# AgriNexa Mobile Client Documentation

This directory contains the universal mobile client for AgriNexa, engineered using React Native and Expo SDK 57. The application supports cross-platform execution on Android, iOS, and Web, with native APK build automation via GitHub Actions and Expo Application Services (EAS).

---

## Technical Stack

- **Core Framework**: React Native 0.86 / Expo SDK 57
- **Routing**: Expo Router (file-based navigation with route groups)
- **Design System & Styling**: NativeWind (Tailwind CSS v3) and React Native Reusables (`@rn-primitives`)
- **Icons**: Lucide Icons (`lucide-react-native`) and `@expo/vector-icons`
- **Animations & Gestures**: `react-native-reanimated` (v4), `react-native-gesture-handler`, `react-native-worklets`
- **Hardware Integrations**:
  - `expo-camera` / `expo-image-picker`: Leaf disease visual scanning
  - `expo-location`: Hyper-local weather and regional mandi geocoding
  - `expo-audio`: Voice input and transcription streaming
  - `expo-notifications`: Push alert delivery for extreme weather and schedule updates
- **Internationalization**: `i18next` and `react-i18next` supporting regional languages (English, Hindi, Tamil)
- **State and Networking**: Asynchronous storage persistence and Axios HTTP client

---

## Directory and Route Layout

The application utilizes Expo Router file-based routing structured into protected and public access scopes:

```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx            # Auth stack navigator
│   │   ├── auth.tsx               # Phone / Email OTP login and signup
│   │   └── onboarding.tsx         # Farmer profiling (state, district, soil NPK, pH)
│   ├── (private)/
│   │   ├── _layout.tsx            # Protected layout guard
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx        # Bottom tab bar configuration
│   │   │   ├── index.tsx          # Farmer home dashboard & weather widget
│   │   │   ├── agriflow.tsx       # Dynamic crop calendar & daily tasks
│   │   │   ├── prices.tsx         # Mandi market prices and storage advisory
│   │   │   ├── tools.tsx          # Utility hub & diagnostics shortcuts
│   │   │   └── profile.tsx        # Farmer profile, soil data & settings
│   │   └── (non-tabs)/
│   │       ├── scan.tsx           # Leaf disease camera scanner & photo analyzer
│   │       ├── assistant/         # AI Agronomist multilingual chat & voice
│   │       ├── daily-check.tsx    # Crop growth observation logging
│   │       ├── growth-stage.tsx   # Machine learning stage evaluation
│   │       ├── ml-test-lab.tsx    # Model diagnostics & sandbox
│   │       ├── reports.tsx        # Farm yield and advisory report generator
│   │       └── weather-hourly.tsx # Detailed 24h & 7-day meteorological forecast
│   └── _layout.tsx                # Root layout with theme provider & fonts
├── components/
│   ├── reusables/                 # React Native Reusables primitives (Card, Button, Dialog)
│   └── ui/                        # Domain-specific UI cards and charts
├── services/                      # API client endpoints (auth, weather, market, scan)
├── context/                       # Auth and localization context providers
├── tailwind.config.js             # NativeWind theme configuration
└── package.json                   # Dependencies and build scripts
```

---

## UI and Styling Standards

In accordance with project guidelines:
- All interfaces adhere to [React Native Reusables](https://reactnativereusables.com) blocks and primitives (`Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `Input`, `Button`, `Separator`, `Text`).
- No external vendor authentication UI packages (such as Clerk) are permitted. All authentication flows use custom internal components connected to the AgriNexa backend API.
- NativeWind utility classes (`className="..."`) manage responsive spacing, typography, and dark-mode styling.

---

## Environment Setup

Configure the environment variables in `frontend/.env`:

```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

For physical device testing using Expo Go, replace `localhost` with your local network IP (for example, `http://192.168.1.100:8000/api/v1`).

---

## Development Commands

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Expo Development Server**:
   ```bash
   npx expo start
   ```

3. **Platform Shortcuts**:
   - `a`: Launch Android emulator or connected device
   - `i`: Launch iOS simulator
   - `w`: Open Web preview
   - `r`: Reload bundler cache

4. **Lint and Typecheck**:
   ```bash
   npm run lint
   npx tsc --noEmit
   ```

---

## Production Builds and CI/CD

Automated APK generation is managed via GitHub Actions:
- Workflow definition: `.github/workflows/release-apk.yml`
- Targets standalone Android APK releases with optimized bundle size and ProGuard rules.
- Local EAS build execution:
  ```bash
  npx eas-cli build --platform android --profile preview
  ```
