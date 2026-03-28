import { supabaseClient } from "../../core/supabase-client";

export function useLogin() {
  const login = async (email: string, password: string) => {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  };
  return { login };
}

export function useRegister() {
  const register = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(error.message);
    return data;
  };
  return { register };
}

export function useLogout() {
  const logout = async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw new Error(error.message);
  };
  return { logout };
}

export function useResetPassword() {
  const sendReset = async (email: string) => {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    });
    if (error) throw new Error(error.message);
  };
  return { sendReset };
}
