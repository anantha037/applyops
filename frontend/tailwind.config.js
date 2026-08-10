/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* ── Surfaces ────────────────────────────────────────── */
        background: 'var(--background)',
        surface: 'var(--surface)',
        'surface-secondary': 'var(--surface-secondary)',
        'surface-tertiary': 'var(--surface-tertiary)',
        card: 'var(--card)',

        /* ── Borders ─────────────────────────────────────────── */
        border: 'var(--border)',
        'border-secondary': 'var(--border-secondary)',

        /* ── Typography ──────────────────────────────────────── */
        foreground: 'var(--foreground)',
        'foreground-secondary': 'var(--foreground-secondary)',
        muted: 'var(--muted)',

        /* ── Brand / Action ──────────────────────────────────── */
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-foreground': 'var(--primary-foreground)',

        /* ── Semantic ────────────────────────────────────────── */
        success: 'var(--success)',
        'success-light': 'var(--success-light)',
        warning: 'var(--warning)',
        'warning-light': 'var(--warning-light)',
        danger: 'var(--danger)',
        'danger-light': 'var(--danger-light)',
        info: 'var(--info)',
        'info-light': 'var(--info-light)',

        /* ── Sidebar (always dark) ───────────────────────────── */
        'sidebar-bg': 'var(--sidebar-bg)',
        'sidebar-surface': 'var(--sidebar-surface)',
        'sidebar-border': 'var(--sidebar-border)',
        'sidebar-text': 'var(--sidebar-text)',
        'sidebar-text-muted': 'var(--sidebar-text-muted)',
        'sidebar-active-bg': 'var(--sidebar-active-bg)',
        'sidebar-active-text': 'var(--sidebar-active-text)',
        'sidebar-hover': 'var(--sidebar-hover)',
      },
      ringColor: {
        DEFAULT: 'var(--ring)',
      },
      boxShadow: {
        'card': '0 1px 3px var(--shadow-color)',
        'card-hover': '0 4px 12px var(--shadow-color)',
      },
    },
  },
  plugins: [],
}
