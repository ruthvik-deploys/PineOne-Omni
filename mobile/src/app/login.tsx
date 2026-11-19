import { LoginFlow } from '@/components/login/login-flow';

/** /login — outside the tab shell (no header, no navigation bar). `?expired=1` shows the session-expired toast. */
export default function LoginScreen() {
  return <LoginFlow />;
}
