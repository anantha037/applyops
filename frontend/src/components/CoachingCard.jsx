import React from 'react'

export default function CoachingCard() {
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Daily coaching</p>
      <p className="mt-2 text-xs leading-relaxed text-foreground-secondary">
        Your next coaching message arrives at 9:00 PM IST via Telegram. Log your activity as it happens so the feedback has a real signal to work with.
      </p>
    </div>
  )
}
