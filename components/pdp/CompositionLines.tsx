import { getCompositionLines } from '@/lib/compositionDisplay';

type CompositionLinesProps = {
  text: string;
  className?: string;
  lineClassName?: string;
};

export function CompositionLines({ text, className, lineClassName }: CompositionLinesProps) {
  const lines = getCompositionLines(text);
  if (lines.length === 0) return null;

  if (lines.length === 1) {
    return <p className={className}>{lines[0]}</p>;
  }

  return (
    <ul className={className}>
      {lines.map((line, index) => (
        <li key={index} className={lineClassName}>
          {line}
        </li>
      ))}
    </ul>
  );
}
