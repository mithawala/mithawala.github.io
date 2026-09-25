import { useEffect, useRef, useState } from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ArrowUpRight,
  Music2,
  LoaderCircle,
} from 'lucide-react'
import { formatTime } from './content.mjs'
import './music.css'

let apiPromise

function loadWidgetApi() {
  if (window.SC?.Widget) return Promise.resolve(window.SC)
  if (!apiPromise)
    apiPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://w.soundcloud.com/player/api.js'
      script.async = true
      script.onload = () => resolve(window.SC)
      script.onerror = () => {
        apiPromise = null
        script.remove()
        reject(new Error('Music service unavailable'))
      }
      document.head.appendChild(script)
    })
  return apiPromise
}

export function useSoundCloud({ playlistUrl, artist, artwork }) {
  const iframe = useRef(null)
  const widget = useRef(null)
  const trackList = useRef([])
  const currentIndex = useRef(0)
  const savedVolume = useRef(80)
  const [enabled, setEnabled] = useState(false)
  const [tracks, setTracks] = useState([])
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [volume, setVolume] = useState(80)
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    if (!enabled) return
    const frame = iframe.current
    let disposed = false
    let player
    let hydrating = true
    let initializing = false
    const timer = setTimeout(() => {
      if (!disposed)
        setStatus((current) => (current === 'loading' ? 'error' : current))
    }, 20000)
    setStatus('loading')
    loadWidgetApi()
      .then((soundcloud) => {
        if (disposed || !iframe.current) return
        player = soundcloud.Widget(iframe.current)
        widget.current = player
        const selectIndex = (next) => {
          currentIndex.current = next
          setIndex(next)
          setPosition(0)
        }
        player.bind(soundcloud.Widget.Events.READY, () => {
          if (initializing) return
          initializing = true
          clearTimeout(timer)
          player.getSounds(async (sounds) => {
            if (disposed) return
            const toTrack = (sound, trackIndex) => ({
              id: sound.id || `track-${trackIndex}`,
              title: sound.title || `Track ${trackIndex + 1}`,
              artist: sound.user?.username || artist,
              duration: sound.duration || 0,
              artwork:
                sound.artwork_url?.replace('-large', '-t500x500') || artwork,
              url: sound.permalink_url || playlistUrl,
            })
            const entries = (sounds || []).map(toTrack)
            for (
              let trackIndex = 0;
              trackIndex < entries.length;
              trackIndex++
            ) {
              const original = sounds[trackIndex]
              if (original.title && original.duration && original.artwork_url)
                continue
              player.skip(trackIndex)
              player.pause()
              for (let attempt = 0; attempt < 8 && !disposed; attempt++) {
                const sound = await new Promise((resolve) => {
                  const readTimer = setTimeout(() => resolve(null), 1000)
                  player.getCurrentSound((current) => {
                    clearTimeout(readTimer)
                    resolve(current)
                  })
                })
                if (
                  sound?.title &&
                  sound.duration &&
                  (!original.id || String(sound.id) === String(original.id))
                ) {
                  entries[trackIndex] = toTrack(sound, trackIndex)
                  break
                }
                await new Promise((resolve) =>
                  setTimeout(resolve, 100 * (attempt + 1)),
                )
              }
              if (disposed) return
            }
            if (disposed) return
            trackList.current = entries
            setTracks(entries)
            setStatus(entries.length ? 'ready' : 'error')
            selectIndex(0)
            player.skip(0)
            player.setVolume(80)
            player.pause()
            hydrating = false
          })
        })
        player.bind(soundcloud.Widget.Events.PLAY, () => {
          if (disposed) return
          if (hydrating) {
            player.pause()
            return
          }
          setPlaying(true)
          player.getCurrentSoundIndex((next) => {
            if (!disposed && next !== currentIndex.current) selectIndex(next)
          })
        })
        player.bind(soundcloud.Widget.Events.PAUSE, () => {
          if (!disposed) setPlaying(false)
        })
        player.bind(soundcloud.Widget.Events.PLAY_PROGRESS, (event) => {
          if (!disposed) setPosition(event.currentPosition)
        })
        player.bind(soundcloud.Widget.Events.FINISH, () => {
          if (disposed || hydrating) return
          const next = currentIndex.current + 1
          if (next < trackList.current.length) {
            selectIndex(next)
            player.skip(next)
            player.play()
          } else {
            setPlaying(false)
            setPosition(0)
          }
        })
        player.bind(soundcloud.Widget.Events.ERROR, () => {
          if (!disposed) setStatus('error')
        })
      })
      .catch(() => {
        if (!disposed) setStatus('error')
      })
    return () => {
      disposed = true
      clearTimeout(timer)
      if (player && window.SC && frame?.isConnected && frame.contentWindow) {
        player.pause()
        Object.values(window.SC.Widget.Events).forEach((event) =>
          player.unbind(event),
        )
      }
      widget.current = null
    }
  }, [enabled, playlistUrl, artist, artwork])

  const select = (next) => {
    if (!tracks.length) return
    const normalized = (next + tracks.length) % tracks.length
    if (normalized === currentIndex.current) widget.current?.toggle()
    else {
      currentIndex.current = normalized
      setIndex(normalized)
      setPosition(0)
      widget.current?.skip(normalized)
      widget.current?.play()
    }
  }
  const seek = (value) => {
    setPosition(value)
    widget.current?.seekTo(value)
  }
  const changeVolume = (value) => {
    setVolume(value)
    widget.current?.setVolume(value)
    if (value) savedVolume.current = value
  }
  return {
    iframe,
    enabled,
    load: () => setEnabled(true),
    tracks,
    index,
    playing,
    position,
    volume,
    status,
    track: tracks[index],
    select,
    seek,
    changeVolume,
    toggle: () => widget.current?.toggle(),
    mute: () => changeVolume(volume ? 0 : savedVolume.current),
    previous: () => select(currentIndex.current - 1),
    next: () => select(currentIndex.current + 1),
  }
}

export default function MusicPlayer({ music, artist }) {
  const player = useSoundCloud({
    playlistUrl: music.playlistUrl,
    artist,
    artwork: music.image,
  })
  const container = useRef(null)
  const expandButton = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const ready = player.status === 'ready'
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          player.load()
          observer.disconnect()
        }
      },
      { rootMargin: '250px' },
    )
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!expanded) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    expandButton.current?.focus()
    const keydown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setExpanded(false)
      }
      if (event.key === 'Tab') {
        const controls = [
          ...container.current.querySelectorAll(
            'button:not(:disabled), a[href], input:not(:disabled)',
          ),
        ]
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    window.addEventListener('keydown', keydown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', keydown)
      expandButton.current?.focus()
    }
  }, [expanded])
  return (
    <div
      ref={container}
      className={`music-player ${expanded ? 'is-expanded' : ''}`}
      role={expanded ? 'dialog' : 'region'}
      aria-modal={expanded || undefined}
      aria-label="Music player"
      data-player-status={player.status}
    >
      {player.enabled && (
        <iframe
          ref={player.iframe}
          className="soundcloud-engine"
          title="SoundCloud playback engine"
          tabIndex="-1"
          aria-hidden="true"
          allow="autoplay; encrypted-media"
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(music.playlistUrl)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false`}
        />
      )}
      <div className="music-player-top">
        <span>
          <Music2 size={17} /> {artist}
        </span>
        <button
          ref={expandButton}
          className="icon-button"
          aria-label={expanded ? 'Exit expanded player' : 'Expand music player'}
          title={expanded ? 'Exit expanded player' : 'Expand music player'}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
        </button>
      </div>
      <div className="music-player-content">
        <div className="music-now-playing">
          <img
            src={player.track?.artwork || music.image}
            alt={
              player.track ? `${player.track.title} artwork` : 'Music artwork'
            }
            loading="lazy"
          />
          <div>
            <span className="eyebrow">
              {player.playing ? 'Now playing' : 'Original compositions'}
            </span>
            <h3>{player.track?.title || artist}</h3>
            <p>{player.track?.artist || artist}</p>
            {player.track && (
              <a href={player.track.url} target="_blank" rel="noreferrer">
                SoundCloud <ArrowUpRight size={14} />
              </a>
            )}
          </div>
        </div>
        <div className="music-track-list">
          {ready ? (
            <ol>
              {player.tracks.map((track, trackIndex) => (
                <li key={`${track.id}-${trackIndex}`}>
                  <button
                    aria-label={`${trackIndex === player.index && player.playing ? 'Pause' : 'Play'} ${track.title}`}
                    aria-current={
                      trackIndex === player.index ? 'true' : undefined
                    }
                    onClick={() => player.select(trackIndex)}
                  >
                    <span className="track-number">
                      {trackIndex === player.index && player.playing ? (
                        <Pause size={13} />
                      ) : (
                        String(trackIndex + 1).padStart(2, '0')
                      )}
                    </span>
                    <img src={track.artwork} alt="" loading="lazy" />
                    <span className="track-name">
                      {track.title}
                      <small>{track.artist}</small>
                    </span>
                    <span className="track-duration">
                      {formatTime(track.duration)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="music-state" role="status">
              {player.status === 'loading' ? (
                <>
                  <LoaderCircle className="loading-spinner" size={25} />
                  <span>Loading music...</span>
                </>
              ) : player.status === 'error' ? (
                <>
                  <Music2 size={26} />
                  <p>The music service is currently unavailable.</p>
                  <a href={music.playlistUrl} target="_blank" rel="noreferrer">
                    Listen on SoundCloud <ArrowUpRight size={16} />
                  </a>
                </>
              ) : (
                <button onClick={player.load}>
                  <Play size={25} />
                  <span>Load music</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="music-player-controls">
        <div className="transport">
          <button
            className="icon-button"
            aria-label="Previous track"
            title="Previous track"
            disabled={!ready}
            onClick={player.previous}
          >
            <SkipBack size={19} />
          </button>
          <button
            className="music-play"
            aria-label={player.playing ? 'Pause music' : 'Play music'}
            title={player.playing ? 'Pause music' : 'Play music'}
            disabled={!ready}
            onClick={player.toggle}
          >
            {player.playing ? (
              <Pause size={21} fill="currentColor" />
            ) : (
              <Play size={21} fill="currentColor" />
            )}
          </button>
          <button
            className="icon-button"
            aria-label="Next track"
            title="Next track"
            disabled={!ready}
            onClick={player.next}
          >
            <SkipForward size={19} />
          </button>
        </div>
        <div className="music-progress">
          <span>{formatTime(player.position)}</span>
          <input
            aria-label="Seek"
            type="range"
            min="0"
            max={player.track?.duration || 1}
            value={Math.min(player.position, player.track?.duration || 1)}
            disabled={!ready}
            onChange={(event) => player.seek(Number(event.target.value))}
          />
          <span>{formatTime(player.track?.duration)}</span>
        </div>
        <div className="music-volume">
          <button
            className="icon-button"
            aria-label={player.volume ? 'Mute' : 'Unmute'}
            title={player.volume ? 'Mute' : 'Unmute'}
            disabled={!ready}
            onClick={player.mute}
          >
            {player.volume ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="100"
            value={player.volume}
            disabled={!ready}
            onChange={(event) =>
              player.changeVolume(Number(event.target.value))
            }
          />
        </div>
      </div>
    </div>
  )
}
