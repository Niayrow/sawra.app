import { Providers } from '../providers';
import App from '../../App';

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div id="boot-splash" role="status" aria-live="polite" aria-label="Chargement Sawra">
        <div>
          <img src="/icons/sansfond.webp" alt="" width={128} height={128} />
          <h1>SAWRA</h1>
          <p>Lecteur coranique gratuit</p>
        </div>
      </div>
      <Providers>
        <App />
        {children}
      </Providers>
    </>
  );
}
