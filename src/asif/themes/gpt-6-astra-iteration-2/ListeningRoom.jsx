import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  AudioLines,
  LoaderCircle,
  Maximize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useAsif } from '../../core.jsx'
import { useSoundCloud } from '../../MusicPlayer.jsx'
import { formatTime } from '../../content.mjs'
import { ImageLightbox } from '../../features.jsx'
import Dialog from '../../Dialog.jsx'

function Deck({
  player,
  music,
  artist,
  expanded,
  onExpand,
  expandButton,
  onArtwork,
}) {
  const ready = player.status === 'ready'
  return (
    <div className="ca-deck">
      <div className="ca-deck-header">
        <span className="ca-kicker">
          <span className="ca-status-dot" aria-hidden="true" />
          Original compositions / Live playlist
        </span>
        {!expanded && (
          <button
            ref={expandButton}
            className="ca-icon-button"
            onClick={onExpand}
            aria-label="Expand music player"
            title="Expand music player"
          >
            <Maximize2 size={18} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="ca-deck-body">
        <div className="ca-turntable">
          <div className="ca-record-stage">
            <button
              className="ca-vinyl"
              data-playing={player.playing}
              onClick={onArtwork}
              aria-label="Enlarge music artwork"
              title="Enlarge music artwork"
            >
              <img
                src={player.track?.artwork || music.image}
                alt=""
                loading="lazy"
              />
              <span className="ca-record-pin" />
            </button>
            <svg
              className="ca-tonearm"
              width="94"
              height="220"
              viewBox="0 0 94 220"
              aria-hidden="true"
            >
              <circle cx="70" cy="24" r="17" />
              <path d="M70 24v117l-39 48" />
              <path d="m20 180 23 19-14 16-23-19Z" />
            </svg>
          </div>
          <div className="music-now-playing ca-record-info">
            <p className="ca-kicker">
              {player.playing ? 'On the turntable' : 'A different side of me'}
            </p>
            <h3>{player.track?.title || artist}</h3>
            <p>{player.track?.artist || artist}</p>
            {player.track && (
              <a href={player.track.url} target="_blank" rel="noreferrer">
                Open track on SoundCloud{' '}
                <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
        <div className="ca-track-panel">
          <div className="ca-track-panel-title">
            <span className="ca-kicker">The collection</span>
            <span className="ca-kicker">
              {ready ? `${player.tracks.length} tracks` : 'SoundCloud'}
            </span>
          </div>
          {ready ? (
            <ol className="ca-tracks">
              {player.tracks.map((track, index) => (
                <li key={`${track.id}-${index}`}>
                  <button
                    aria-label={`${index === player.index && player.playing ? 'Pause' : 'Play'} ${track.title}`}
                    aria-current={index === player.index ? 'true' : undefined}
                    onClick={() => player.select(index)}
                  >
                    <span className="ca-track-number">
                      {index === player.index && player.playing ? (
                        <AudioLines size={16} aria-hidden="true" />
                      ) : (
                        String(index + 1).padStart(2, '0')
                      )}
                    </span>
                    <img src={track.artwork} alt="" loading="lazy" />
                    <span className="ca-track-name">
                      {track.title}
                      <small>{track.artist}</small>
                    </span>
                    <span className="ca-track-duration">
                      {formatTime(track.duration)}
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <div className="ca-music-state" role="status">
              {player.status === 'loading' ? (
                <>
                  <LoaderCircle
                    className="loading-spinner"
                    size={28}
                    aria-hidden="true"
                  />
                  <p>Loading music...</p>
                </>
              ) : player.status === 'error' ? (
                <>
                  <AudioLines size={36} aria-hidden="true" />
                  <p>The music service is currently unavailable.</p>
                  <a href={music.playlistUrl} target="_blank" rel="noreferrer">
                    Listen on SoundCloud{' '}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </>
              ) : (
                <button onClick={player.load}>
                  <Play size={24} aria-hidden="true" />
                  Load music
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="ca-transport-panel">
        <div className="ca-transport">
          <button
            className="ca-icon-button"
            aria-label="Previous track"
            disabled={!ready}
            onClick={player.previous}
          >
            <SkipBack size={19} aria-hidden="true" />
          </button>
          <button
            className="ca-play-button"
            aria-label={player.playing ? 'Pause music' : 'Play music'}
            disabled={!ready}
            onClick={player.toggle}
          >
            {player.playing ? (
              <Pause size={23} fill="currentColor" aria-hidden="true" />
            ) : (
              <Play size={23} fill="currentColor" aria-hidden="true" />
            )}
          </button>
          <button
            className="ca-icon-button"
            aria-label="Next track"
            disabled={!ready}
            onClick={player.next}
          >
            <SkipForward size={19} aria-hidden="true" />
          </button>
        </div>
        <div className="ca-seek">
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
        <div className="ca-volume">
          <button
            className="ca-icon-button"
            aria-label={player.volume ? 'Mute' : 'Unmute'}
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
            onChange={(event) =>
              player.changeVolume(Number(event.target.value))
            }
          />
        </div>
      </div>
    </div>
  )
}

export default function ListeningRoom() {
  const { profile } = useAsif()
  const music = profile.music
  const player = useSoundCloud({
    playlistUrl: music.playlistUrl,
    artist: profile.name,
    artwork: music.image,
  })
  const container = useRef(null)
  const expandButton = useRef(null)
  const wasExpanded = useRef(false)
  const [expanded, setExpanded] = useState(false)
  const [artwork, setArtwork] = useState(null)
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
    if (wasExpanded.current && !expanded) expandButton.current?.focus()
    wasExpanded.current = expanded
  }, [expanded])
  const deck = (
    <Deck
      player={player}
      music={music}
      artist={profile.name}
      expanded={expanded}
      onExpand={() => setExpanded(true)}
      expandButton={expandButton}
      onArtwork={() => setArtwork(player.track?.artwork || music.image)}
    />
  )
  return (
    <>
      <div className="ca-music-intro">
        <p>{music.intro}</p>
        <a
          className="ca-text-link"
          href={music.spotifyUrl}
          target="_blank"
          rel="noreferrer"
        >
          Also on Spotify <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </div>
      <div
        className="ca-player"
        ref={container}
        role="region"
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
        {expanded ? (
          <Dialog
            title="Music player"
            onClose={() => setExpanded(false)}
            className="ca-studio-dialog"
          >
            {deck}
          </Dialog>
        ) : (
          deck
        )}
        {artwork && (
          <ImageLightbox
            title="Music"
            images={[artwork]}
            onClose={() => setArtwork(null)}
          />
        )}
      </div>
    </>
  )
}
