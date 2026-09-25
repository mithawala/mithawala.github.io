import { useState, useEffect, useRef } from 'react'
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Play,
  Smartphone,
  Tablet,
  Copy,
  Check,
  Linkedin,
  Facebook,
  Maximize2,
  Send,
  LoaderCircle,
} from 'lucide-react'
import Dialog from './Dialog.jsx'
import { detailPath, formatDate } from './content.mjs'
import { siteOrigin } from '../versions.mjs'

export function RichText({ html, version }) {
  const element = useRef(null)
  useEffect(() => {
    element.current.querySelectorAll('a').forEach((link) => {
      if (link.target === '_blank') link.rel = 'noopener noreferrer'
      const url = new URL(
        link.getAttribute('href') || '',
        'https://mithawala.com',
      )
      if (
        url.hostname === 'mithawala.com' &&
        /^\/(project|blog)\//.test(url.pathname)
      )
        link.href = `${version.path}${url.pathname.slice(1).replace(/\/$/, '')}/`
    })
  }, [html, version.path])
  return (
    <div
      ref={element}
      className="rich-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export function ImageLightbox({ images, title, initialIndex = 0, onClose }) {
  const [index, setIndex] = useState(initialIndex)
  const next = (direction) =>
    setIndex((current) => (current + direction + images.length) % images.length)
  useEffect(() => {
    const keydown = (event) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setIndex((current) => (current + 1) % images.length)
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setIndex((current) => (current - 1 + images.length) % images.length)
      }
    }
    window.addEventListener('keydown', keydown)
    return () => window.removeEventListener('keydown', keydown)
  }, [images.length])
  return (
    <Dialog
      title={`${title} image viewer`}
      onClose={onClose}
      className="image-lightbox"
    >
      <img
        src={images[index]}
        alt={`${title}, image ${index + 1} of ${images.length}`}
      />
      <div className="lightbox-controls">
        <button
          className="icon-button"
          aria-label="Previous image"
          title="Previous image"
          onClick={() => next(-1)}
          disabled={images.length < 2}
        >
          <ArrowLeft size={20} />
        </button>
        <span aria-live="polite">
          {index + 1} / {images.length}
        </span>
        <button
          className="icon-button"
          aria-label="Next image"
          title="Next image"
          onClick={() => next(1)}
          disabled={images.length < 2}
        >
          <ArrowRight size={20} />
        </button>
      </div>
    </Dialog>
  )
}

export function VideoEmbed({ url, title, portrait = false }) {
  const [loaded, setLoaded] = useState(false)
  const parsed = new URL(url)
  const youtubeId = parsed.hostname.includes('youtube.com')
    ? parsed.pathname.split('/').pop()
    : parsed.hostname === 'youtu.be'
      ? parsed.pathname.slice(1)
      : null
  const playerUrl = new URL(url)
  if (loaded) playerUrl.searchParams.set('autoplay', '1')
  return (
    <div className={`video-embed ${portrait ? 'portrait' : ''}`}>
      {loaded || !youtubeId ? (
        <iframe
          src={playerUrl.href}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          className="video-poster"
          aria-label={`Play ${title}`}
          onClick={() => setLoaded(true)}
        >
          <img
            src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
            alt={title}
            loading="lazy"
          />
          <span>
            <Play size={30} fill="currentColor" />
          </span>
        </button>
      )}
    </div>
  )
}

export function DevicePreview({ config, title }) {
  const [device, setDevice] = useState(config.device || 'iphone')
  const [loaded, setLoaded] = useState(false)
  return (
    <section className="device-preview" aria-label={`${title} live demo`}>
      <div className="device-toolbar">
        <div role="group" aria-label="Preview device">
          <button
            aria-label="iPhone preview"
            title="iPhone preview"
            aria-pressed={device === 'iphone'}
            onClick={() => setDevice('iphone')}
          >
            <Smartphone size={19} />
          </button>
          <button
            aria-label="iPad preview"
            title="iPad preview"
            aria-pressed={device === 'ipad'}
            onClick={() => setDevice('ipad')}
          >
            <Tablet size={19} />
          </button>
        </div>
        <a href={config.url} target="_blank" rel="noreferrer">
          Open live demo <ArrowUpRight size={16} />
        </a>
      </div>
      <div className={`device-frame ${device}`}>
        {loaded ? (
          <iframe
            src={config.url}
            title={`${title} live preview`}
            allow="fullscreen"
          />
        ) : (
          <button className="device-load" onClick={() => setLoaded(true)}>
            <Play size={26} />
            <span>Load live preview</span>
          </button>
        )}
      </div>
    </section>
  )
}

export function ShareLinks({ url }) {
  const [copied, setCopied] = useState(false)
  const [failed, setFailed] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setFailed(false)
    } catch {
      setFailed(true)
    }
  }
  return (
    <div className="share-links">
      <span>Share</span>
      <a
        className="icon-button"
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on LinkedIn"
        title="Share on LinkedIn"
      >
        <Linkedin size={17} />
      </a>
      <a
        className="icon-button"
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Share on Facebook"
        title="Share on Facebook"
      >
        <Facebook size={17} />
      </a>
      <button
        className="icon-button"
        aria-label={copied ? 'Link copied' : 'Copy link'}
        title={copied ? 'Link copied' : 'Copy link'}
        onClick={copy}
      >
        {copied ? <Check size={17} /> : <Copy size={17} />}
      </button>
      <span role="status">
        {copied ? 'Copied' : failed ? 'Copy unavailable' : ''}
      </span>
      {failed && (
        <input
          aria-label="Share URL"
          readOnly
          value={url}
          onFocus={(event) => event.target.select()}
        />
      )}
    </div>
  )
}

export function ProjectDetails({ item, version }) {
  const [lightbox, setLightbox] = useState(null)
  const images = item.images?.length
    ? item.images
    : [item.fullImage || item.image]
  const hasVideo = item.videoUrl || item.embedVideo || item.embedVideos?.length
  const showImages = item.images?.length || (!hasVideo && !item.deviceMockup)
  return (
    <article className="project-detail" data-detail={item.slug}>
      <p className="eyebrow">
        {item.category} /{' '}
        {formatDate(item.date, {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
      <h1>{item.title}</h1>
      <div className="project-media">
        {item.deviceMockup && (
          <DevicePreview config={item.deviceMockup} title={item.title} />
        )}
        {item.videoUrl && (
          <VideoEmbed
            url={item.videoUrl}
            title={item.title}
            portrait={item.portrait}
          />
        )}
        {item.embedVideo && (
          <VideoEmbed
            url={item.embedVideo}
            title={item.title}
            portrait={item.portrait}
          />
        )}
        {(item.embedVideos || []).map((video, index) => (
          <VideoEmbed
            key={`${video.url}-${index}`}
            url={video.url}
            title={video.title || item.title}
            portrait={video.portrait}
          />
        ))}
        {showImages && (
          <div
            className={`project-images ${item.galleryMasonry ? 'masonry' : ''}`}
          >
            {images.map((image, index) => (
              <button
                key={`${image}-${index}`}
                onClick={() => setLightbox(index)}
                aria-label={`Enlarge ${item.title} image ${index + 1}`}
              >
                <img
                  src={image}
                  alt={`${item.title}, image ${index + 1}`}
                  loading="lazy"
                />
                <span>
                  <Maximize2 size={19} />
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      {item.links?.length > 0 && (
        <div className="project-links">
          {item.links.map((link, index) => (
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              key={`${link.url}-${index}`}
            >
              {link.label}
              <ArrowUpRight size={17} />
            </a>
          ))}
        </div>
      )}
      {item.descriptionHtml ? (
        <RichText html={item.descriptionHtml} version={version} />
      ) : item.description ? (
        <div className="rich-content">
          {item.description.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      ) : null}
      {item.technologies?.length > 0 && (
        <div className="technology-list">
          <h2>Technology</h2>
          <ul>
            {item.technologies.map((technology) => (
              <li key={technology}>{technology}</li>
            ))}
          </ul>
        </div>
      )}
      <ShareLinks
        url={`${siteOrigin}${detailPath(version, 'project', item.slug)}`}
      />
      {lightbox !== null && (
        <ImageLightbox
          images={images}
          title={item.title}
          initialIndex={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </article>
  )
}

export function BlogDetails({ post, version }) {
  return (
    <article className="blog-detail" data-detail={post.slug}>
      <p className="eyebrow">
        {post.category} / {post.date}
      </p>
      <h1>{post.title}</h1>
      <img className="detail-cover" src={post.image} alt={post.title} />
      <RichText html={post.content} version={version} />
      <ShareLinks
        url={`${siteOrigin}${detailPath(version, 'blog', post.slug)}`}
      />
    </article>
  )
}

export function useContactForm(endpoint) {
  const [status, setStatus] = useState({ type: 'idle', message: '' })
  const controller = useRef(null)
  useEffect(() => () => controller.current?.abort(), [])
  async function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    if (!form.reportValidity() || status.type === 'sending') return
    const data = new FormData(form)
    if (data.get('_honey')) return
    data.append(
      '_subject',
      `New contact from ${data.get('name')}: ${data.get('subject')}`,
    )
    data.append('_captcha', 'false')
    data.append('_template', 'table')
    controller.current?.abort()
    controller.current = new AbortController()
    const timer = setTimeout(() => controller.current?.abort('timeout'), 20000)
    setStatus({ type: 'sending', message: 'Sending your message...' })
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
        signal: controller.current.signal,
      })
      const result = await response.json()
      if (
        !response.ok ||
        !(result.success === true || result.success === 'true')
      )
        throw new Error(result.message || 'Please try again in a moment.')
      form.reset()
      setStatus({
        type: 'success',
        message: "Message sent. I'll get back to you soon.",
      })
    } catch (error) {
      if (
        controller.current.signal.aborted &&
        controller.current.signal.reason !== 'timeout'
      )
        return
      setStatus({
        type: 'error',
        message:
          'Your message could not be sent. Please try again or use the email link.',
      })
    } finally {
      clearTimeout(timer)
    }
  }
  return { status, submit }
}

export function ContactForm({ endpoint }) {
  const { status, submit } = useContactForm(endpoint)
  const sending = status.type === 'sending'
  return (
    <form className="contact-form" onSubmit={submit} aria-label="Contact form">
      <h3>How can I help you?</h3>
      <div className="contact-form-pair">
        <label>
          Your name
          <input
            name="name"
            autoComplete="name"
            required
            disabled={sending}
            placeholder="Full name"
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            disabled={sending}
            placeholder="you@example.com"
          />
        </label>
      </div>
      <label>
        Subject
        <input
          name="subject"
          required
          disabled={sending}
          placeholder="What's on your mind?"
        />
      </label>
      <label>
        Message
        <textarea
          name="message"
          required
          rows="5"
          disabled={sending}
          placeholder="Let's make something happen."
        />
      </label>
      <input
        type="text"
        name="_honey"
        tabIndex="-1"
        autoComplete="off"
        className="sr-only"
        aria-hidden="true"
      />
      <button className="contact-submit" type="submit" disabled={sending}>
        {sending ? 'Sending...' : 'Send message'}
        {sending ? (
          <LoaderCircle className="loading-spinner" size={18} />
        ) : (
          <Send size={18} />
        )}
      </button>
      <p
        className={`contact-status ${status.type}`}
        role={status.type === 'error' ? 'alert' : 'status'}
        aria-live="polite"
      >
        {status.message}
      </p>
    </form>
  )
}
