import NextAuth, { CredentialsSignin } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { headers } from 'next/headers';
import { getSupabaseAdmin } from '@/lib/supabase/server';
import {
  checkLoginRateLimit,
  isAdminPasswordLockedOut,
  recordAdminPasswordFailure,
  clearAdminPasswordFailures,
} from '@/lib/rateLimit';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        remember: { label: 'Remember me', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).trim().toLowerCase();
        const password = String(credentials.password);
        const rememberRaw = credentials.remember;
        const rememberMe =
          rememberRaw === true ||
          rememberRaw === 'true' ||
          rememberRaw === 'on' ||
          rememberRaw === '1';

        if (isAdminPasswordLockedOut(email)) {
          const err = new CredentialsSignin();
          err.code = 'locked_out';
          throw err;
        }

        const headersList = await headers();
        const ip =
          headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
          headersList.get('x-real-ip') ??
          'unknown';
        const { allowed } = checkLoginRateLimit(ip);
        if (!allowed) return null;

        const supabase = getSupabaseAdmin();
        if (!supabase) return null;

        const { data: admin, error } = await supabase
          .from('admin_users')
          .select('id, email, name, password_hash, role')
          .eq('email', email)
          .eq('is_active', true)
          .single();

        if (error || !admin?.password_hash) return null;

        const bcrypt = await import('bcryptjs').then((m) => m.default);
        const valid = await bcrypt.compare(password, admin.password_hash);
        if (!valid) {
          recordAdminPasswordFailure(email);
          return null;
        }

        clearAdminPasswordFailures(email);

        return {
          id: admin.id,
          email: admin.email,
          name: admin.name ?? admin.email,
          role: admin.role,
          rememberMe,
        };
      },
    }),
  ],
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.email = user.email;
        token.role = (user as { role?: string }).role;
        const rememberMe = Boolean((user as { rememberMe?: boolean }).rememberMe);
        const maxAgeSec = rememberMe ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
        token.exp = Math.floor(Date.now() / 1000) + maxAgeSec;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.email = token.email ?? session.user.email;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  session: {
    strategy: 'jwt',
    // Upper bound for session cookie; JWT `exp` is set per sign-in in the jwt callback (1d vs 30d).
    maxAge: 60 * 60 * 24 * 30,
  },
  secret: process.env.AUTH_SECRET,
});
