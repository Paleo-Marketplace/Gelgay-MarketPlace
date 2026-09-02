import Script from 'next/script';
import Providers from './providers';
import './globals.css';
import 'leaflet/dist/leaflet.css';

export const metadata = {
  title: 'ገልጋይ (Gelgay) | Good things deserve second life',
  description: 'Ethiopian curated multi-vendor marketplace with escrow buyer protection, CBE/Telebirr verification, and live courier tracking. Good things deserve second life.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var theme = localStorage.getItem('paleo_theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark', 'dark-theme');
                } else if (theme === 'light') {
                  document.documentElement.classList.remove('dark', 'dark-theme');
                }
              } catch (e) {}
            })();`
          }}
        />
      </head>
      <body>
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
