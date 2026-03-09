import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [Google],
  session: {
    strategy: 'jwt',
    // 30 days
    maxAge: 30 * 24 * 60 * 60,
    // refresh JWT age every 24 hours when active
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: '/',
  },
});
