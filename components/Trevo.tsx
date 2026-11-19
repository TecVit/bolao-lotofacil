/** Trevo de quatro folhas (desenho próprio, decorativo). Usa `currentColor`. */
export function Trevo({ className, style }: { className?: string; style?: React.CSSProperties }) {
  // folha em forma de coração apontando para o centro; repetida a cada 90°
  const folha = "M50 50 C38 41 27 31 33 20 C38 11 48 13 50 22 C52 13 62 11 67 20 C73 31 62 41 50 50 Z";
  return (
    <svg viewBox="0 0 100 100" className={className} style={style} aria-hidden fill="currentColor">
      <path d="M52 54 Q58 74 70 92" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      {[0, 90, 180, 270].map((a) => (
        <path key={a} d={folha} transform={`rotate(${a} 50 50)`} />
      ))}
      <circle cx="50" cy="50" r="3.5" />
    </svg>
  );
}
