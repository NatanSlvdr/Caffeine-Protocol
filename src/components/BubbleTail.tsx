/**
 * The small curved tail under a scene bubble. Its paper covers the bubble's bottom outline where
 * they meet, and its open stroke carries that outline down to the tip.
 */
export function BubbleTail() {
  return (
    <svg className="bubble-tail" viewBox="0 0 14 10" aria-hidden="true">
      <path d="M1 0 C3.5 2.5 5 5.5 4.5 9.5 C7.5 7 10 4 13 0" />
    </svg>
  );
}
