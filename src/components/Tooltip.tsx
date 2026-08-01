'use client'

import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

export function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <span className="relative group/tooltip inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-zinc-800 px-3 py-2 text-[11px] leading-relaxed text-zinc-100 opacity-0 shadow-lg transition-opacity duration-150 group-hover/tooltip:opacity-100 z-50">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-zinc-800" />
      </span>
    </span>
  )
}

export function InfoTip({ text, className = '' }: { text: string; className?: string }) {
  return (
    <Tooltip text={text}>
      <HelpCircle size={13} className={`text-zinc-500 hover:text-zinc-400 cursor-help shrink-0 ${className}`} />
    </Tooltip>
  )
}
