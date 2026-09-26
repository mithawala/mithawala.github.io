import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Headphones,
  LoaderCircle,
  Maximize2,
  Minimize2,
  Music2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ZoomIn,
} from 'lucide-react'
import { useAsif } from '../../core.jsx'
import { ImageLightbox } from '../../features.jsx'
import { useSoundCloud } from '../../MusicPlayer.jsx'
import { formatTime } from '../../content.mjs'
import { previewPath, previewSources } from '../../images.mjs'

const cover = (source, width) =>
  previewSources.includes(source) ? previewPath(source, width) : source

function IfePlayer({ music, artist }) {
  const player = useSoundCloud({
    playlistUrl: music.playlistUrl,
    artist,
    artwork: music.image,
  })
  const container = useRef(null)
  const expandButton = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const ready = player.status === 'ready'
  const load = player.load

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          load()
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

  const duration = player.track?.duration || 1
  const position = Math.min(player.position, duration)
  return (
    <div
      ref={container}
      className={`as-ife ${expanded ? 'is-expanded' : ''}`}
      role={expanded ? 'dialog' : 'region'}
      aria-modal={expanded || undefined}
      aria-label="Music player"
      data-player-status={player.status}
      data-playing={player.playing ? 'true' : undefined}
    >
      {player.enabled && (
        <iframe
          ref={player.iframe}
          className="as-ife-engine"
          title="SoundCloud playback engine"
          tabIndex="-1"
          aria-hidden="true"
          allow="autoplay; encrypted-media"
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(music.playlistUrl)}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false`}
        />
      )}
      <div className="as-ife-top">
        <span className="as-ife-brand">
          <Headphones size={16} aria-hidden="true" />
          Entertainment · Audio
        </span>
        <span className="as-ife-channel" aria-hidden="true">
          CH {String(player.index + 1).padStart(2, '0')}
        </span>
        <button
          ref={expandButton}
          type="button"
          className="as-ife-btn"
          aria-label={expanded ? 'Exit expanded player' : 'Expand music player'}
          title={expanded ? 'Exit expanded player' : 'Expand music player'}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? (
            <Minimize2 size={18} aria-hidden="true" />
          ) : (
            <Maximize2 size={18} aria-hidden="true" />
          )}
        </button>
      </div>
      <div className="as-ife-screen">
        <div className="music-now-playing as-ife-now">
          <div className="as-ife-art">
            <img
              src={player.track?.artwork || music.image}
              alt={
                player.track ? `${player.track.title} artwork` : 'Music artwork'
              }
              loading="lazy"
            />
          </div>
          <div className="as-ife-meta">
            <span className="as-ife-state">
              {player.playing
                ? 'Now playing'
                : ready
                  ? 'Ready for departure'
                  : 'Original compositions'}
            </span>
            <h3>{player.track?.title || artist}</h3>
            <p>{player.track?.artist || artist}</p>
            {player.track && (
              <a href={player.track.url} target="_blank" rel="noreferrer">
                SoundCloud <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
          </div>
          <span className="as-ife-eq" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <div className="as-ife-list">
          {ready ? (
            <ol>
              {player.tracks.map((track, trackIndex) => {
                const current = trackIndex === player.index
                return (
                  <li key={`${track.id}-${trackIndex}`}>
                    <button
                      type="button"
                      aria-label={`${current && player.playing ? 'Pause' : 'Play'} ${track.title}`}
                      aria-current={current ? 'true' : undefined}
                      onClick={() => player.select(trackIndex)}
                    >
                      <span className="as-ife-no">
                        {current && player.playing ? (
                          <Pause size={13} aria-hidden="true" />
                        ) : (
                          String(trackIndex + 1).padStart(2, '0')
                        )}
                      </span>
                      <img src={track.artwork} alt="" loading="lazy" />
                      <span className="as-ife-name">
                        {track.title}
                        <small>{track.artist}</small>
                      </span>
                      <span className="as-ife-dur">
                        {formatTime(track.duration)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          ) : (
            <div className="as-ife-message" role="status">
              {player.status === 'loading' ? (
                <>
                  <LoaderCircle
                    className="loading-spinner"
                    size={26}
                    aria-hidden="true"
                  />
                  <span>Loading music...</span>
                </>
              ) : player.status === 'error' ? (
                <>
                  <Music2 size={26} aria-hidden="true" />
                  <p>The music service is currently unavailable.</p>
                  <a href={music.playlistUrl} target="_blank" rel="noreferrer">
                    Listen on SoundCloud{' '}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </>
              ) : (
                <button type="button" onClick={load}>
                  <Play size={24} aria-hidden="true" />
                  <span>Load music</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="as-ife-controls">
        <div className="as-ife-transport">
          <button
            type="button"
            aria-label="Previous track"
            title="Previous track"
            disabled={!ready}
            onClick={player.previous}
          >
            <SkipBack size={19} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="as-ife-play"
            aria-label={player.playing ? 'Pause music' : 'Play music'}
            title={player.playing ? 'Pause music' : 'Play music'}
            disabled={!ready}
            onClick={player.toggle}
          >
            {player.playing ? (
              <Pause size={22} fill="currentColor" aria-hidden="true" />
            ) : (
              <Play size={22} fill="currentColor" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            aria-label="Next track"
            title="Next track"
            disabled={!ready}
            onClick={player.next}
          >
            <SkipForward size={19} aria-hidden="true" />
          </button>
        </div>
        <div className="as-ife-progress">
          <span>{formatTime(player.position)}</span>
          <input
            aria-label="Seek"
            type="range"
            min="0"
            max={duration}
            value={position}
            disabled={!ready}
            style={{ '--fill': `${(position / duration) * 100}%` }}
            onChange={(event) => player.seek(Number(event.target.value))}
          />
          <span>{formatTime(player.track?.duration)}</span>
        </div>
        <div className="as-ife-volume">
          <button
            type="button"
            aria-label={player.volume ? 'Mute' : 'Unmute'}
            title={player.volume ? 'Mute' : 'Unmute'}
            disabled={!ready}
            onClick={player.mute}
          >
            {player.volume ? (
              <Volume2 size={18} aria-hidden="true" />
            ) : (
              <VolumeX size={18} aria-hidden="true" />
            )}
          </button>
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="100"
            value={player.volume}
            disabled={!ready}
            style={{ '--fill': `${player.volume}%` }}
            onChange={(event) =>
              player.changeVolume(Number(event.target.value))
            }
          />
        </div>
      </div>
    </div>
  )
}

export function Entertainment() {
  const { profile } = useAsif()
  const music = profile.music
  const [lightbox, setLightbox] = useState(false)
  return (
    <div className="as-music">
      <div className="as-cabin">
        <button
          type="button"
          className="as-windows"
          aria-label="Enlarge music artwork"
          title="Enlarge music artwork"
          onClick={() => setLightbox(true)}
        >
          <span
            className="as-window-row"
            style={{ '--art': `url("${cover(music.image, 1200)}")` }}
          >
            {[0, 1, 2].map((pane) => (
              <span className="as-window" key={pane} style={{ '--i': pane }} />
            ))}
          </span>
          <span className="as-windows-hint" aria-hidden="true">
            <ZoomIn size={16} /> Window view
          </span>
        </button>
        <p className="as-music-intro">{music.intro}</p>
        <div className="as-music-links">
          <a
            className="as-sign as-sign--ahead as-spotify"
            href={music.spotifyUrl}
            target="_blank"
            rel="noreferrer"
          >
            Listen on Spotify
            <ArrowUpRight size={17} strokeWidth={2.6} aria-hidden="true" />
          </a>
          <a
            className="as-text-link"
            href={music.playlistUrl}
            target="_blank"
            rel="noreferrer"
          >
            SoundCloud playlist
            <ArrowUpRight size={15} aria-hidden="true" />
          </a>
        </div>
      </div>
      <IfePlayer music={music} artist={profile.name} />
      {lightbox && (
        <ImageLightbox
          images={[music.image]}
          title="Music"
          onClose={() => setLightbox(false)}
        />
      )}
    </div>
  )
}
