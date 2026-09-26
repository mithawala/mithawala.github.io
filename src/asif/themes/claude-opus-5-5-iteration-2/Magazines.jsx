import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAsif } from '../../core.jsx'
import { ResponsiveImage } from '../../features.jsx'
import { detailPath } from '../../content.mjs'
import { plural, readingMinutes } from './airside.mjs'

export function Magazines() {
  const { blog, version } = useAsif()
  return (
    <div className="as-reading">
      <div className="as-pocket">
        <ul className="as-mags">
          {blog.map((post, index) => (
            <li key={post.slug} data-article={post.slug} className="as-mag">
              <Link
                to={detailPath(version, 'blog', post.slug)}
                className="as-mag-link"
              >
                <span className="as-mag-mast">
                  <span>{post.category}</span>
                  <span className="as-mag-issue" aria-hidden="true">
                    No. {String(blog.length - index).padStart(2, '0')}
                  </span>
                </span>
                <h3 className="as-mag-title">{post.title}</h3>
                <span className="as-mag-date">{post.date}</span>
                <span className="as-mag-cover">
                  <ResponsiveImage
                    src={post.image}
                    alt=""
                    sizes="(max-width: 700px) 46vw, 330px"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="as-pocket-front" aria-hidden="true">
          <span>Seat pocket · Please take one</span>
        </div>
      </div>
      <div className="as-issue">
        <h3 className="as-block-title">
          <span>In this issue</span>
          <span className="as-block-meta">
            {plural(blog.length, 'article')}
          </span>
        </h3>
        <ol className="as-issue-list">
          {blog.map((post) => (
            <li key={post.slug}>
              <Link to={detailPath(version, 'blog', post.slug)}>
                <span className="as-issue-meta">
                  {post.category} · {post.date}
                </span>
                <span className="as-issue-title">{post.title}</span>
                <span className="as-issue-time">
                  {readingMinutes(post.content)} min read
                  <ArrowRight size={16} aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
