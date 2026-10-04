# AgriNexa Agent Instructions

## UI & Styling Guidelines
- **Component Standard**: Use React Native Reusables components (`@/components/reusables/...`) and Tailwind CSS (`className="..."` via NativeWind) for all application UI.
- **Authentication**:
  - Follow the official [React Native Reusables Authentication Blocks](https://reactnativereusables.com/docs/blocks/authentication) UI specification (Card, CardHeader, CardTitle, CardDescription, CardContent, Label, Input, Button, Separator, Text).
  - **No Clerk Components**: Do NOT use Clerk UI components (`@clerk/clerk-expo`, `<SignIn />`, etc.). All auth forms must use the internal UI components and project API routes.
  - **No Tabs for Sign In / Sign Up**: Do not use tabs at the top of authentication cards; switch between Sign In and Sign Up via bottom toggle links ("Don't have an account? Sign up" / "Already have an account? Sign in") following the official RNR block specification.

