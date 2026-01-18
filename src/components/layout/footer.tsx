'use client';

export function Footer() {
  return (
    <footer className="border-t border-stroke py-6 mt-auto mb-16 md:mb-0">
      <div className="container mx-auto px-4 text-center">
        <p className="font-accent text-lg text-ink-secondary mb-1">Made with love</p>
        <p className="text-caption text-ink-tertiary">&copy; {new Date().getFullYear()} Love on the Plate</p>
      </div>
    </footer>
  );
}
