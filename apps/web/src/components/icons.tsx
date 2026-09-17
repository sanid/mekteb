/**
 * The Mekteb mark: a two-centred pointed arch — the mihrab niche — with its
 * finial floating above the apex.
 *
 * Both arcs share their centres, (16, 13.8) and (8, 13.8), so the frame keeps a
 * constant wall thickness, and the mark is one filled path with an even-odd
 * hole rather than strokes — which is what keeps it readable at 16px and on an
 * app-icon plate alike. The same geometry is redrawn for React Native in
 * `apps/mobile/app/(auth)/sign-in.tsx` and rasterised by
 * `apps/mobile/scripts/make-icons.py`; change all three together.
 */
export function MosqueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M5 21.5V13.8A11 11 0 0 1 12 3.55A11 11 0 0 1 19 13.8V21.5Z M7.6 21.5V13.8A8.4 8.4 0 0 1 12 6.41A8.4 8.4 0 0 1 16.4 13.8V21.5Z"
      />
      <circle cx="12" cy="1.55" r="1.15" />
    </svg>
  );
}

export function StarBulletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12,4 14.5,9.5 20,12 14.5,14.5 12,20 9.5,14.5 4,12 9.5,9.5" />
    </svg>
  );
}

export function GithubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
