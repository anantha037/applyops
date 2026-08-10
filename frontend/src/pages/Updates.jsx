import { Sparkles } from 'lucide-react'

export default function Updates() {
  return (
    <section className="h-full flex flex-col gap-6 select-none">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Updates</h2>
        <p className="mt-1 text-xs md:text-sm text-foreground-secondary">
          Stay informed with recent system updates and feature announcements.
        </p>
      </div>

      <div className="rounded-2xl p-8 bg-surface shadow-xs flex flex-col items-center justify-center text-center my-auto min-h-[360px]">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">Updates Coming Soon</h3>
        <p className="text-xs text-foreground-secondary max-w-sm leading-relaxed">
          System updates, change logs, and release notes will be displayed here in an upcoming release.
        </p>
      </div>
    </section>
  )
}
