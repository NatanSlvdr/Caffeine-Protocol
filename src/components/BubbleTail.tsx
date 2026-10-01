/**
 * The curved comic tail under a scene bubble. Its paper covers the bubble's bottom outline where
 * they meet, and its open ink stroke carries that outline down to the tip.
 */
export function BubbleTail() {
  return (
    <svg className="bubble-tail" viewBox="0 0 20 15" aria-hidden="true">
      <path d="M1.5 0 C5 3.5 7.5 8 6.5 13.5 C10.5 10.5 14.5 5.5 18.5 0" />
    </svg>
  );
}
