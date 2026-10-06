import Script from 'next/script'

/**
 * Google Analytics 4. Solo se inyecta si `NEXT_PUBLIC_GA_ID` está
 * configurado (ej. `G-XXXXXXXXXX`). Sin ID no renderiza nada.
 */
export default function GoogleAnalytics() {
  const gaId = process.env.NEXT_PUBLIC_GA_ID?.trim()
  if (!gaId) return null
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${gaId}');`}
      </Script>
    </>
  )
}
