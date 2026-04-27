/**
 * src/components/LandingPage.jsx
 *
 * Full-page introductory / onboarding screen shown to unauthenticated users.
 * Replaces the bare "sign in" card in ProtectedRoute with a proper landing
 * experience: hero → features → privacy promise → CTA.
 *
 * Tone: warm, intimate, editorial — like a leather-bound journal, not a SaaS pitch.
 * Typography: Playfair Display (display) + existing Tailwind stack.
 * Motion: CSS keyframe entrance animations, staggered reveals.
 *
 * Props:
 *   onSignIn  — () => void   called when user clicks "Open your journal"
 *   isSetup   — bool         true if vault already exists (changes CTA copy)
 */

import { useEffect, useRef, useState } from 'react'
import {
  BookOpen, ShieldCheck, Cpu, Sparkles,
  TrendingUp, Users, LockKeyhole, ChevronDown,
} from 'lucide-react'

// ── Atmospheric background blob ──────────────────────────────────────────────
// Large blurred circles that give the parchment background visible depth,
// matching the soft vignette effect in the design reference screenshot.
function Blob({ style }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{ filter: 'blur(80px)', ...style }}
    />
  )
}

// ── Animated underline for the hero tagline ───────────────────────────────────
function AnimatedUnderline() {
  return (
    <svg
      viewBox="0 0 220 12" fill="none"
      className="w-full max-w-[220px]"
      style={{ marginTop: '-4px' }}
    >
      <path
        d="M4 8 Q55 2 110 7 Q165 12 216 5"
        stroke="#c27a2a"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        style={{
          strokeDasharray: 230,
          strokeDashoffset: 230,
          animation: 'drawLine 1.2s ease forwards 0.8s',
        }}
      />
    </svg>
  )
}

// ── Feature card ──────────────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, body, delay, color = '#c27a2a' }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-3"
      style={{
        background: '#fff',
        border: '1px solid #e8d5b7',
        opacity: 0,
        animation: `fadeUp 0.6s ease forwards ${delay}`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: '#fdf0e0', border: '1px solid #e8d5b7' }}
      >
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p
          className="text-sm font-semibold mb-1"
          style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}
        >
          {title}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: '#9a7550' }}>
          {body}
        </p>
      </div>
    </div>
  )
}

// ── Step badge for the "How it works" section ─────────────────────────────────
function Step({ number, title, body, delay }) {
  return (
    <div
      className="flex gap-4 items-start"
      style={{
        opacity: 0,
        animation: `fadeUp 0.5s ease forwards ${delay}`,
      }}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{
          background: '#3b2a1a',
          color: '#fdf8f2',
          fontSize: '11px',
          fontWeight: 600,
          fontFamily: '"Playfair Display", Georgia, serif',
        }}
      >
        {number}
      </div>
      <div>
        <p className="text-sm font-semibold mb-0.5" style={{ color: '#3b2a1a' }}>
          {title}
        </p>
        <p className="text-xs leading-relaxed" style={{ color: '#9a7550' }}>
          {body}
        </p>
      </div>
    </div>
  )
}

// ── Main landing page ─────────────────────────────────────────────────────────
export default function LandingPage({ onSignIn, isSetup = false }) {
  const ctaRef = useRef(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const el = document.getElementById('igd-landing-scroll')
    if (!el) return
    const onScroll = () => setScrolled(el.scrollTop > 60)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToCTA = () =>
    ctaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  return (
    <>
      {/* Global keyframe styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
        @keyframes floatDot {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes bobChevron {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%       { transform: translateY(5px); opacity: 1; }
        }

        #igd-landing-scroll {
          scrollbar-width: thin;
          scrollbar-color: #d4b896 transparent;
        }
        #igd-landing-scroll::-webkit-scrollbar { width: 5px; }
        #igd-landing-scroll::-webkit-scrollbar-thumb {
          background: #d4b896; border-radius: 10px;
        }

        .igd-cta-btn {
          transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
        }
        .igd-cta-btn:hover {
          background: #5a3d26 !important;
          box-shadow: 0 8px 32px #3b2a1a30;
          transform: translateY(-1px);
        }
        .igd-cta-btn:active {
          transform: scale(0.98);
        }

        .igd-outline-btn {
          transition: background 0.15s, border-color 0.15s;
        }
        .igd-outline-btn:hover {
          background: #f5ede0 !important;
        }
      `}</style>

      {/* Outer scroll container */}
      <div
        id="igd-landing-scroll"
        className="fixed inset-0 overflow-y-auto"
        style={{ background: '#fdf8f2' }}
      >

        {/* Atmospheric background blobs — large, blurred, visible depth */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {/* Top-left warm amber blob — dominant, like the screenshot */}
          <Blob style={{
            width: 700, height: 700,
            top: -180, left: -180,
            background: '#d4a96a',
            opacity: 0.45,
            animation: 'floatDot 10s ease-in-out infinite',
          }} />
          {/* Bottom-right rose-amber blob */}
          <Blob style={{
            width: 580, height: 580,
            bottom: -160, right: -160,
            background: '#c27a2a',
            opacity: 0.30,
            animation: 'floatDot 13s ease-in-out infinite 2s',
          }} />
          {/* Center-right soft accent */}
          <Blob style={{
            width: 420, height: 420,
            top: '35%', right: '5%',
            background: '#e8c49a',
            opacity: 0.28,
            animation: 'floatDot 16s ease-in-out infinite 5s',
          }} />
          {/* Mid-left subtle warm */}
          <Blob style={{
            width: 320, height: 320,
            top: '55%', left: '8%',
            background: '#d4956a',
            opacity: 0.22,
            animation: 'floatDot 12s ease-in-out infinite 3s',
          }} />
        </div>

        {/* Sticky top nav strip */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 transition-all duration-300"
          style={{
            background: scrolled ? 'rgba(253,248,242,0.92)' : 'transparent',
            backdropFilter: scrolled ? 'blur(8px)' : 'none',
            borderBottom: scrolled ? '1px solid #e8d5b7' : '1px solid transparent',
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: '#e8d5b7', border: '1px solid #d4b896' }}
            >
              <BookOpen size={13} style={{ color: '#7a4f2a' }} />
            </div>
            <span
              className="text-sm font-semibold"
              style={{ color: '#3b2a1a', fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              Inner Growth Diary
            </span>
          </div>
          <button
            onClick={onSignIn}
            className="igd-outline-btn text-xs font-medium px-4 py-1.5 rounded-full"
            style={{
              color: '#3b2a1a',
              border: '1px solid #d4b896',
              background: 'transparent',
            }}
          >
            {isSetup ? 'Unlock vault' : 'Get started'}
          </button>
        </div>

        <div className="relative max-w-2xl mx-auto px-6 pb-24">

          {/* ── HERO ─────────────────────────────────────────────────────── */}
          <section className="pt-16 pb-20 text-center space-y-6">

            {/* Badge */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium"
              style={{
                background: '#f5ede0',
                border: '1px solid #e8d5b7',
                color: '#9a7550',
                opacity: 0,
                animation: 'fadeIn 0.5s ease forwards 0.1s',
              }}
            >
              <ShieldCheck size={10} style={{ color: '#c27a2a' }} />
              100% private · runs on your device
            </div>

            {/* Headline */}
            <div style={{ opacity: 0, animation: 'fadeUp 0.6s ease forwards 0.25s' }}>
              <h1
                className="text-4xl sm:text-5xl font-semibold leading-tight"
                style={{
                  color: '#3b2a1a',
                  fontFamily: '"Playfair Display", Georgia, serif',
                }}
              >
                Your thoughts,
                <br />
                <span style={{ fontStyle: 'italic', color: '#7a4f2a' }}>finally understood.</span>
              </h1>
              <div className="flex justify-center mt-1">
                <AnimatedUnderline />
              </div>
            </div>

            {/* Sub-headline */}
            <p
              className="text-base leading-relaxed max-w-md mx-auto"
              style={{
                color: '#9a7550',
                opacity: 0,
                animation: 'fadeUp 0.6s ease forwards 0.4s',
              }}
            >
              Inner Growth Diary is a personal journal with a built-in AI that
              reads your patterns, surfaces emotional insights, and connects
              memories — all without sending a single byte to the cloud.
            </p>

            {/* Hero CTA */}
            <div
              style={{ opacity: 0, animation: 'fadeUp 0.6s ease forwards 0.55s' }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <button
                onClick={onSignIn}
                className="igd-cta-btn flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-sm font-semibold"
                style={{ background: '#3b2a1a', color: '#fdf8f2' }}
              >
                <LockKeyhole size={15} />
                {isSetup ? 'Unlock your journal' : 'Start your journal'}
              </button>
              <button
                onClick={scrollToCTA}
                className="igd-outline-btn text-sm font-medium px-6 py-3.5 rounded-xl"
                style={{
                  color: '#7a4f2a',
                  border: '1px solid #d4b896',
                  background: 'transparent',
                }}
              >
                Learn more
              </button>
            </div>

            {/* Scroll hint */}
            <div
              style={{
                opacity: 0,
                animation: 'fadeIn 0.5s ease forwards 1.2s',
                paddingTop: '16px',
              }}
            >
              <ChevronDown
                size={18}
                style={{
                  color: '#c9b99a',
                  margin: '0 auto',
                  animation: 'bobChevron 1.8s ease-in-out infinite',
                }}
              />
            </div>
          </section>

          {/* ── MOCK JOURNAL PREVIEW ─────────────────────────────────────── */}
          <section
            className="mb-20"
            style={{ opacity: 0, animation: 'fadeUp 0.7s ease forwards 0.7s' }}
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                border: '1px solid #e8d5b7',
                boxShadow: '0 16px 64px #d4b89625',
              }}
            >
              {/* Fake window bar */}
              <div
                className="flex items-center gap-1.5 px-4 py-3"
                style={{ background: '#f5ede0', borderBottom: '1px solid #e8d5b7' }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f0b97d' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#e8d5b7' }} />
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#e8d5b7' }} />
                <span className="text-[11px] ml-2" style={{ color: '#c9b99a' }}>
                  Inner Growth Diary — Journal
                </span>
              </div>
              {/* Fake journal content */}
              <div
                className="p-6 space-y-4"
                style={{ background: '#fff' }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 w-48 rounded-md mb-1.5" style={{ background: '#f5ede0' }} />
                    <div className="h-2.5 w-24 rounded-md" style={{ background: '#faf4ee' }} />
                  </div>
                  <div
                    className="text-[11px] px-2.5 py-1 rounded-full"
                    style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}
                  >
                    calm · 84%
                  </div>
                </div>
                <div className="space-y-2">
                  {[80, 100, 65, 90, 50].map((w, i) => (
                    <div
                      key={i}
                      className="h-2.5 rounded-full"
                      style={{ width: `${w}%`, background: i % 2 === 0 ? '#f5ede0' : '#faf4ee' }}
                    />
                  ))}
                </div>
                {/* AI insight chip */}
                <div
                  className="flex items-start gap-2.5 p-3 rounded-xl mt-2"
                  style={{ background: '#fdf0e0', border: '1px solid #e8d5b7' }}
                >
                  <Sparkles size={13} style={{ color: '#c27a2a', marginTop: '1px', flexShrink: 0 }} />
                  <p className="text-[11px] leading-relaxed" style={{ color: '#9a7550' }}>
                    <strong style={{ color: '#7a4f2a' }}>Memory connection found —</strong>{' '}
                    a similar entry from 3 months ago echoes this feeling of quiet resolution.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ── FEATURES ─────────────────────────────────────────────────── */}
          <section className="mb-20">
            <div
              className="text-center mb-8"
              style={{ opacity: 0, animation: 'fadeUp 0.5s ease forwards 0.2s' }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: '#c27a2a' }}
              >
                What's inside
              </p>
              <h2
                className="text-2xl font-semibold"
                style={{
                  color: '#3b2a1a',
                  fontFamily: '"Playfair Display", Georgia, serif',
                }}
              >
                Everything your journal has been missing
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FeatureCard
                icon={BookOpen}
                title="Thoughtful journaling"
                body="Write freely with mood tagging, rich text, and auto-saved drafts. Your entries are always safe — even offline."
                delay="0.3s"
              />
              <FeatureCard
                icon={TrendingUp}
                title="Emotional landscape"
                body="An AI-powered radar maps your emotional patterns over time — joy, calm, tension, growth — visualised beautifully."
                delay="0.4s"
              />
              <FeatureCard
                icon={Sparkles}
                title="Memory connections"
                body="The Echo Chamber finds entries from weeks or months ago that echo your current mood, surfacing forgotten insights."
                delay="0.5s"
                color="#6366f1"
              />
              <FeatureCard
                icon={Cpu}
                title="On-device AI, no subscriptions"
                body="The AI model runs entirely in your browser via WebAssembly. No API keys, no monthly fees, no data leaving your device."
                delay="0.6s"
                color="#0891b2"
              />
            </div>
          </section>

          {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
          <section className="mb-20">
            <div
              className="rounded-2xl p-8 space-y-7"
              style={{
                background: '#fff',
                border: '1px solid #e8d5b7',
                opacity: 0,
                animation: 'fadeUp 0.6s ease forwards 0.2s',
              }}
            >
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: '#c27a2a' }}
                >
                  Getting started
                </p>
                <h2
                  className="text-xl font-semibold"
                  style={{
                    color: '#3b2a1a',
                    fontFamily: '"Playfair Display", Georgia, serif',
                  }}
                >
                  Three steps, then it's yours
                </h2>
              </div>

              <Step
                number="1"
                title="Create your vault"
                body="Choose a PIN. It encrypts your journal locally — no account, no email, no cloud. Only you can open it."
                delay="0.3s"
              />
              <div style={{ height: '1px', background: '#f0e8da' }} />
              <Step
                number="2"
                title="Write your first entry"
                body="Start typing. Tag your mood, add a title, or just let the words flow. The AI processes it quietly in the background."
                delay="0.4s"
              />
              <div style={{ height: '1px', background: '#f0e8da' }} />
              <Step
                number="3"
                title="Watch patterns emerge"
                body="After a few entries, your emotional landscape, memory connections, and behavioural insights begin to take shape."
                delay="0.5s"
              />
            </div>
          </section>

          {/* ── PRIVACY PROMISE ──────────────────────────────────────────── */}
          <section className="mb-20">
            <div
              className="rounded-2xl p-8 text-center space-y-5"
              style={{
                background: '#3b2a1a',
                opacity: 0,
                animation: 'fadeUp 0.6s ease forwards 0.2s',
              }}
            >
              <ShieldCheck size={28} style={{ color: '#d4b896', margin: '0 auto' }} />
              <div>
                <h2
                  className="text-xl font-semibold mb-2"
                  style={{
                    color: '#fdf8f2',
                    fontFamily: '"Playfair Display", Georgia, serif',
                  }}
                >
                  Your diary is yours — completely
                </h2>
                <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: '#c9b99a' }}>
                  No servers store your words. No analytics track your moods.
                  No company reads your memories. Everything lives in your browser's
                  local storage, encrypted behind your PIN.
                </p>
              </div>
              <div
                className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-2"
                style={{ borderTop: '1px solid #5a3d26' }}
              >
                {[
                  'No account required',
                  'No internet needed',
                  'No ads, ever',
                  'Open source',
                ].map((item) => (
                  <span key={item} className="flex items-center gap-1.5 text-xs" style={{ color: '#b09070' }}>
                    <span style={{ color: '#c27a2a', fontSize: '10px' }}>✓</span>
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* ── FINAL CTA ────────────────────────────────────────────────── */}
          <section
            ref={ctaRef}
            className="text-center space-y-5 pb-8"
            style={{ opacity: 0, animation: 'fadeUp 0.6s ease forwards 0.2s' }}
          >
            <div>
              <h2
                className="text-2xl font-semibold mb-2"
                style={{
                  color: '#3b2a1a',
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontStyle: 'italic',
                }}
              >
                Ready to know yourself better?
              </h2>
              <p className="text-sm" style={{ color: '#9a7550' }}>
                {isSetup
                  ? 'Your vault is waiting. Enter your PIN to continue.'
                  : 'No sign-up. No credit card. Just open the page and begin.'}
              </p>
            </div>

            <button
              onClick={onSignIn}
              className="igd-cta-btn inline-flex items-center gap-2.5 px-10 py-4 rounded-xl text-base font-semibold"
              style={{ background: '#3b2a1a', color: '#fdf8f2' }}
            >
              <LockKeyhole size={16} />
              {isSetup ? 'Unlock your journal' : 'Open your journal'}
            </button>

            <p className="text-[11px]" style={{ color: '#c9b99a' }}>
              {isSetup
                ? 'Forgot your PIN? Your data is safe — reset via the profile page after unlocking.'
                : "First time here? You'll create a PIN — takes about 10 seconds."}
            </p>
          </section>

        </div>
      </div>
    </>
  )
}
