import React from 'react'

export function formatFileSize(size) {
  const numberSize = Number(size || 0)
  if (numberSize < 1024) return `${numberSize} B`
  if (numberSize < 1024 * 1024) return `${(numberSize / 1024).toFixed(1)} KB`
  return `${(numberSize / 1024 / 1024).toFixed(1)} MB`
}

export default function MessageAttachments({ attachments = [], isMine }) {
  if (!attachments.length) return null

  return (
    <div className='mt-2 d-flex flex-column gap-2'>
      {attachments.map((item, index) => {
        const isImage =
          item.type === 'image' ||
          String(item.mime_type || '').startsWith('image/')

        if (isImage) {
          return (
            <a
              key={`${item.url}-${index}`}
              href={item.url}
              target='_blank'
              rel='noreferrer'
              className='d-block overflow-hidden !rounded-3 border bg-white'
              style={{
                width: 190,
                maxWidth: '100%',
              }}
            >
              <img
                src={item.url}
                alt={item.original_name || 'Ảnh chat'}
                className='w-100 object-fit-cover'
                style={{
                  maxHeight: 190,
                }}
                onError={(event) => {
                  event.currentTarget.style.display = 'none'
                }}
              />
            </a>
          )
        }

        return (
          <a
            key={`${item.url}-${index}`}
            href={item.url}
            target='_blank'
            rel='noreferrer'
            className={`d-flex align-items-center gap-2 !rounded-3 border px-3 py-2 text-decoration-none ${
              isMine
                ? 'border-white bg-white text-slate-700'
                : 'border-slate-200 bg-slate-50 text-slate-700'
            }`}
          >
            <i className='bi bi-paperclip' />
            <span className='text-sm'>
              {item.original_name || 'File đính kèm'}
              <small className='ms-2 opacity-75'>
                {formatFileSize(item.size)}
              </small>
            </span>
          </a>
        )
      })}
    </div>
  )
}
