'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, Shield, LogIn } from 'lucide-react';

const roles = [
  {
    key: 'admin' as const,
    title: 'Admin Portal',
    description: 'Oversee all bookings, manage PSW workers and clients, and monitor capacity.',
    highlights: ['See all bookings', 'Manage workers & clients', 'Resolve conflicts fast'],
    accent: 'from-purple-500 to-indigo-500',
  },
  {
    key: 'worker' as const,
    title: 'PSW Worker',
    description: 'View your upcoming schedule, confirm client visits, and manage availability.',
    highlights: ['Daily & weekly agenda', 'Client contact info', 'Shift confirmations'],
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    key: 'client' as const,
    title: 'Client Access',
    description: 'Book trusted PSW workers, view recurring schedules, and stay informed.',
    highlights: ['Request recurring visits', 'Track care history', 'Transparent pricing'],
    accent: 'from-emerald-500 to-green-500',
  },
];

export default function LandingPage() {
  const router = useRouter();

  const heroStats = useMemo(
    () => [
      { label: 'Bookings per week', value: '120+' },
      { label: 'Verified PSW workers', value: '48' },
      { label: 'Active clients', value: '230+' },
    ],
    []
  );

  const goToRole = (role: 'admin' | 'worker' | 'client') => {
    router.push(`/dashboard?role=${role}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-16">
        <header className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/70">
            <Shield className="h-4 w-4" />
            Trusted Booking Experience
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl">
            Care booking made simple for every role
          </h1>
          <p className="mt-4 text-lg text-white/70">
            Choose the experience tailored to you—manage, deliver, or receive care with clarity and confidence.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-left md:grid-cols-3">
            {heroStats.map((stat) => (
              <div key={stat.label} className="rounded-xl bg-white/5 p-4">
                <p className="text-sm text-white/60">{stat.label}</p>
                <p className="text-3xl font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </header>

        <section className="grid gap-8 md:grid-cols-3">
          {roles.map((role) => (
            <article
              key={role.key}
              className="rounded-3xl border border-white/10 bg-gradient-to-br p-6 shadow-2xl"
              style={{ backgroundImage: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
            >
              <div className={`rounded-2xl bg-gradient-to-br ${role.accent} p-5 text-white shadow-lg`}>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs tracking-wide uppercase">
                  {role.key === 'admin' && <Shield className="h-3.5 w-3.5" />}
                  {role.key === 'worker' && <Users className="h-3.5 w-3.5" />}
                  {role.key === 'client' && <Calendar className="h-3.5 w-3.5" />}
                  {role.key === 'admin' ? 'Control Center' : role.key === 'worker' ? 'Your Shifts' : 'Care Portal'}
                </div>
                <h2 className="text-2xl font-semibold">{role.title}</h2>
                <p className="mt-2 text-sm text-white/80">{role.description}</p>
              </div>

              <ul className="mt-6 space-y-2 text-sm text-white/70">
                {role.highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-white/60" />
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => goToRole(role.key)}
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white/90 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-white"
              >
                Continue as {role.title.split(' ')[0]}
                <LogIn className="h-4 w-4" />
              </button>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
