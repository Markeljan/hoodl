import { useRef } from 'react'
import { decodeMetadataURI } from '../metadata'

interface MetadataViewerProps {
  name: string
  symbol: string
  tokenURI: string
  contractURI: string
}

export default function MetadataViewer({ name, symbol, tokenURI, contractURI }: MetadataViewerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const sharedDocument = tokenURI === contractURI
  const documents = sharedDocument
    ? [{ source: 'tokenURI() + contractURI()', uri: tokenURI }]
    : [
        { source: 'tokenURI()', uri: tokenURI },
        { source: 'contractURI()', uri: contractURI },
      ].filter(({ uri }) => uri.length > 0)

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="hv-chip metadata-trigger"
      >
        View on-chain metadata
      </button>
      <dialog
        ref={dialogRef}
        className="metadata-dialog"
        aria-labelledby="metadata-dialog-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
      >
        <div className="metadata-dialog__header">
          <div>
            <span className="metadata-dialog__eyebrow">ON-CHAIN JSON</span>
            <h2 id="metadata-dialog-title">{symbol} metadata</h2>
            <p>
              Decoded directly from the contract. {sharedDocument ? 'Both URI methods return this same document.' : 'Each URI method is shown separately.'}
            </p>
          </div>
          <button type="button" onClick={() => dialogRef.current?.close()} className="metadata-dialog__close" aria-label="Close metadata viewer">
            ×
          </button>
        </div>

        <div className="metadata-dialog__content">
          {documents.map(({ source, uri }) => {
            const metadata = decodeMetadataURI(uri)
            return (
              <section key={source} className="metadata-document">
                <div className="metadata-document__source">{source}</div>
                {metadata.ok ? (
                  <>
                    <div className="metadata-document__preview">
                      {metadata.document.image && <img src={metadata.document.image} alt={`${metadata.document.name ?? name} artwork`} />}
                      <div>
                        <div className="metadata-document__identity">
                          <strong>{metadata.document.name ?? name}</strong>
                          <span>{metadata.document.symbol ?? symbol}</span>
                        </div>
                        <p>{metadata.document.description || 'No description provided.'}</p>
                        {metadata.document.image && (
                          <a href={metadata.document.image} target="_blank" rel="noreferrer">
                            Open artwork ↗
                          </a>
                        )}
                      </div>
                    </div>
                    <details className="metadata-document__json">
                      <summary>View exact JSON</summary>
                      <pre>{metadata.document.json}</pre>
                    </details>
                  </>
                ) : (
                  <p className="metadata-document__error">{metadata.message}</p>
                )}
              </section>
            )
          })}
        </div>
      </dialog>
    </>
  )
}
