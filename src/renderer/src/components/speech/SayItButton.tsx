import { useState } from 'react'
import { Mic, Volume2 } from 'lucide-react'
import { Button, Popover, PopoverContent, PopoverTrigger } from '@/components/ui'
import { playAudioUrl } from '@/lib/audio'
import * as practice from '@/practice'
import { speechUrl } from '../../../../shared/speech'
import { ListenHint, MicButton } from './MicButton'
import { SayItResult } from './SayItResult'
import { useListen } from './useListen'

/** Word card: say the word and see whether the Mac heard it as that word (on-device speech recognition). */
export function SayItButton({ dictId, term, phonetic }: { dictId: number; term: string; phonetic?: string }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [check, setCheck] = useState<practice.WordCheck | null>(null)
  const voice = useListen({ maxMs: 6000, silenceMs: 900 })

  const tryIt = async (): Promise<void> => {
    setCheck(null)
    const heard = await voice.listen()
    if (heard) setCheck(await practice.checkSpokenWord({ dictId, term }, heard))
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) void tryIt()
        else voice.cancel()
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Say it"
          onClick={(e) => e.stopPropagation()}
          className="btn-squish inline-flex items-center gap-1 rounded-full border border-border-300 bg-surface-1 px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary"
        >
          <Mic className="size-3.5" />
          Say it
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <MicButton state={voice.state} label={`Say ${term}`} onStart={() => void tryIt()} onStop={voice.stop} />
          <div className="min-w-0">
            <p className="font-serif text-lg font-bold leading-tight text-text-primary">{term}</p>
            {phonetic && <p className="text-xs text-text-muted">/{phonetic}/</p>}
          </div>
          <Button
            variant="ghost"
            size="iconSm"
            className="ml-auto text-text-muted"
            aria-label={`Listen to ${term}`}
            onClick={() => void playAudioUrl(speechUrl(term, 'us'))}
          >
            <Volume2 className="size-4" />
          </Button>
        </div>
        {check && voice.state.kind === 'idle' ? (
          <SayItResult term={term} check={check} />
        ) : (
          <ListenHint state={voice.state} idle="Tap the microphone and say the word." onOpenSettings={(p) => void practice.openPrivacySettings(p)} />
        )}
      </PopoverContent>
    </Popover>
  )
}
