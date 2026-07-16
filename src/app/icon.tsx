import { ImageResponse } from 'next/og'

export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000000',
          borderRadius: '50%',
          color: '#ffffff',
          padding: '6px',
        }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            width: '100%',
            height: '100%',
          }}
        >
          <path d="M21 12a9 9 0 1 1-6.21-8.58" />
          <path d="M12 7h9v5" />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
