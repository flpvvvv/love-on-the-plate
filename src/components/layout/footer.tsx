'use client';

export function Footer() {
  return (
    <footer className="border-t border-border py-6 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-muted">
        <p className="font-script text-base mb-1">Made with love</p>
        <p>&copy; {new Date().getFullYear()} Love on the Plate</p>
      </div>
    </footer>
  );
}
