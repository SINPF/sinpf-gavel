export default function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-foreground/50 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-6xl h-[90vh] flex items-center justify-center animate-in fade-in zoom-in-95 duration-300">
        {children}
      </div>
    </div>
  );
}
