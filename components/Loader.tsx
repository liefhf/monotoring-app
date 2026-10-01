/*
 * Ladebalken in den App-Farben: ein lila-pinker Streifen laeuft durch
 * eine runde Spur. Ersetzt die frueheren "Lade …"-Texte.
 */
export default function Loader({ className = "" }: { className?: string }) {
  return (
    <span role="status" aria-label="Wird geladen" className={`block w-full max-w-xs ${className}`}>
      <span className="relative block h-1.5 overflow-hidden rounded-full bg-app-elevated">
        <span
          className="absolute inset-y-0 left-0 w-2/5 rounded-full animate-[app-loader_1.2s_ease-in-out_infinite]"
          style={{ background: "linear-gradient(90deg, var(--app-accent-2), var(--app-accent))" }}
        />
      </span>
    </span>
  );
}
