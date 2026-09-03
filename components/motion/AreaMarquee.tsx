import { MANILA_AREAS } from "@/lib/areas";

/**
 * Infinite area strip — technique inspired by Magic UI / UI Layouts marquees.
 * Original CSS-driven implementation for BeautyBook discovery context.
 */
export function AreaMarquee() {
  const areas = [...MANILA_AREAS, ...MANILA_AREAS];

  return (
    <div className="bb-marquee" aria-label="Manila areas on BeautyBook">
      <div className="bb-marquee-track">
        {areas.map((area, i) => (
          <span key={`${area}-${i}`} className="bb-marquee-item">
            {area}
          </span>
        ))}
      </div>
    </div>
  );
}
