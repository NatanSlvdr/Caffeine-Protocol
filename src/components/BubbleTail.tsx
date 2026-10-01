/**
 * The small pointer under a scene bubble. Its paper covers the bubble's bottom outline where they
 * meet, and its open stroke carries that outline down to a softly rounded tip.
 */
export function BubbleTail() {
  return (
    <svg className="bubble-tail" viewBox="0 0 12 7" aria-hidden="true">
      <path d="M0 0 L4.7 5.5 Q6 7 7.3 5.5 L12 0" />
    </svg>
  );
}
