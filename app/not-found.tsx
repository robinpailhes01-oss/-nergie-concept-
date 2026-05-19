import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <div
          className="font-display text-7xl font-bold mb-2"
          style={{ color: '#F5821F' }}
        >
          404
        </div>
        <h1 className="font-display text-2xl font-bold mb-2">
          Page introuvable
        </h1>
        <p className="text-text-muted mb-6 max-w-md">
          La ressource demandée n'existe pas ou a été déplacée.
        </p>
        <Link href="/" className="btn btn-primary">
          Retour au dashboard
        </Link>
      </div>
    </main>
  );
}
