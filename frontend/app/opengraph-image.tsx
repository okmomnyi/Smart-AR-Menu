import { ImageResponse } from 'next/og'

// Generated at build time rather than shipped as a binary, so it stays in sync
// with the brand palette and needs no design tooling to change.
export const alt = 'AR Menu: see each dish at its real size before you order'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#0E0C0A',
          backgroundImage:
            'radial-gradient(ellipse at 25% 20%, rgba(212,130,10,0.18) 0%, transparent 55%), radial-gradient(ellipse at 80% 85%, rgba(61,43,31,0.35) 0%, transparent 55%)',
        }}
      >
        {/* The product mark: a dish resting on a plate, which is what the
            viewer actually places on your table. */}
        <svg width="84" height="84" viewBox="0 0 32 32" style={{ marginBottom: 40 }}>
          <rect width="32" height="32" rx="7" fill="#16130F" />
          <ellipse cx="16" cy="19.5" rx="10" ry="4.5" fill="none" stroke="#D4820A" strokeWidth="2" />
          <circle cx="16" cy="13" r="5" fill="#D4820A" />
        </svg>

        <div
          style={{
            display: 'flex',
            fontSize: 76,
            fontWeight: 700,
            color: '#F5F0E8',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          See the dish before you order
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 28,
            fontSize: 34,
            color: '#A79A8D',
            lineHeight: 1.35,
            maxWidth: 900,
          }}
        >
          Scan the code on your table to view every dish at its real size, in augmented
          reality.
        </div>

        <div
          style={{
            display: 'flex',
            marginTop: 'auto',
            fontSize: 26,
            color: '#D4820A',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          AR Menu
        </div>
      </div>
    ),
    size
  )
}
