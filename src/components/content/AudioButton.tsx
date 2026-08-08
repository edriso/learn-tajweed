import { useEffect, useRef, useState } from 'react'
import { Loader2, Pause, Play } from 'lucide-react'
import type { QuranAyah } from '@/lib/quran'
import { getReciter, RECITERS } from '@/lib/settings'
import { cn } from '@/lib/utils'

/**
 * Verse-by-verse recitation, streamed straight from everyayah.com.
 *
 * Which reciter plays comes from the settings menu; the default is الشيخ محمود
 * خليل الحصري murattal, the reference recording for teaching because every rule
 * is audible without the pace being unnatural.
 *
 * Files are named by surah and ayah, both padded to three digits:
 *   https://everyayah.com/data/Husary_128kbps/002019.mp3  ->  al-Baqarah 2:19
 */
function audioUrl(ayah: QuranAyah, reciter: string): string {
  const pad = (value: number) => String(value).padStart(3, '0')
  return `https://everyayah.com/data/${reciter}/${pad(ayah.surah)}${pad(ayah.ayah)}.mp3`
}

export function AudioButton({ ayah, className }: { ayah: QuranAyah; className?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** Which reciter the cached audio element was built for. */
  const loadedFor = useRef<string | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle')

  // Stop and release the audio when the card leaves the page.
  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, [])

  function toggle() {
    if (state === 'error') return
    if (state === 'playing') {
      audioRef.current?.pause()
      setState('idle')
      return
    }

    // Rebuild the audio element if the reader picked a different reciter since
    // the last time this button was pressed.
    const reciter = getReciter()
    if (!audioRef.current || loadedFor.current !== reciter) {
      audioRef.current?.pause()
      const audio = new Audio(audioUrl(ayah, reciter))
      audio.preload = 'none'
      audio.addEventListener('playing', () => setState('playing'))
      audio.addEventListener('waiting', () => setState('loading'))
      audio.addEventListener('ended', () => setState('idle'))
      audio.addEventListener('pause', () => setState('idle'))
      audio.addEventListener('error', () => setState('error'))
      audioRef.current = audio
      loadedFor.current = reciter
    }

    setState('loading')
    audioRef.current.play().catch(() => setState('error'))
  }

  const reciterName = RECITERS.find((option) => option.id === getReciter())?.name ?? ''
  const label =
    state === 'error'
      ? 'تعذَّر تشغيل التلاوة'
      : state === 'loading'
        ? 'جارٍ تحميل التلاوة'
        : state === 'playing'
          ? 'إيقاف التلاوة'
          : `استمِع إلى الآية بصوت ${reciterName}`

  /**
   * Changing `aria-label` on a button that already has focus is not reliably
   * re-announced, so the state is reported separately. Without this a reader who
   * presses play and hits a network failure gets silence and no explanation —
   * the spinner and the greyed-out button are both purely visual.
   */
  const status =
    state === 'error'
      ? 'تعذَّر تشغيل التلاوة'
      : state === 'loading'
        ? 'جارٍ التحميل'
        : state === 'playing'
          ? 'يُتلى الآن'
          : ''

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-disabled={state === 'error' || undefined}
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex size-10 shrink-0 items-center justify-center rounded-full border transition',
          state === 'error'
            ? 'cursor-not-allowed border-ink-200 text-ink-400 dark:border-ink-700 dark:text-ink-600'
            : 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900',
          className,
        )}
      >
        {state === 'loading' ? (
          <Loader2 size={16} className="animate-spin" />
        ) : state === 'playing' ? (
          <Pause size={16} />
        ) : (
          <Play size={16} />
        )}
      </button>
      <span role="status" className="sr-only">
        {status}
      </span>
    </>
  )
}
