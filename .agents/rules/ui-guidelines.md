# UI & Authentication Guidelines

## 1. UI Components & Tailwind CSS Standard
- **React Native Reusables Components**: Always use the React Native Reusables components from `@/components/reusables/...` (e.g., `Button`, `Card`, `Input`, `Label`, `Separator`, `Text`, `Tabs`, `Dialog`, etc.) for building user interfaces.
- **Tailwind CSS / NativeWind**: Use Tailwind utility classes via `className="..."` for layout, spacing, sizing, colors, and responsive design.
- **No Ad-Hoc StyleSheets for Standard UI**: Avoid creating custom `StyleSheet.create` blocks for components that can be composed using React Native Reusables and Tailwind classes.
- **Theme Tokens**: Reference semantic Tailwind colors (`bg-background`, `text-foreground`, `border-border`, `bg-primary`, `text-primary-foreground`, `text-muted-foreground`, etc.) defined in `global.css` and `lib/theme.ts` to guarantee seamless light and dark mode compatibility.

## 2. Authentication UI Pattern
- **Reference**: All authentication interfaces (Sign In, Sign Up, Social Logins, Forgot Password, Verification) must follow the UI patterns established by [React Native Reusables Authentication Blocks](https://reactnativereusables.com/docs/blocks/authentication).
- **Structure**:
  - Encapsulate auth forms in `Card` with `CardHeader` (`CardTitle`, `CardDescription`) and `CardContent`.
  - Use `Label` paired with `Input` for all form fields.
  - Use `Separator` with an `"or continue with"` text badge for social divider sections.
  - Use `Button` with variant `outline` for third-party OAuth providers (e.g., Google, Apple, GitHub).
  - Use `Button` with variant `default` (`bg-primary`) for primary form submission.
  - **No Tabs for Sign In / Sign Up**: Do not use tabs at the top of the auth card. Mode switching is handled strictly via footer links (`"Don't have an account? Sign up"` / `"Already have an account? Sign in"`), matching the official React Native Reusables block.

## 3. Strict Rule on Third-Party Auth Widgets
- **DO NOT USE CLERK COMPONENTS**: Do not install or use `@clerk/clerk-expo` or Clerk's pre-packaged UI widgets (`<SignIn />`, `<SignUp />`, `<UserButton />`, etc.).
- **Pure Custom UI**: Build all authentication screens with React Native Reusables UI components wired directly to the project's internal backend endpoints (`/api/v1/auth/...`), native session storage (`@/lib/auth-storage`), and `expo-auth-session`.
