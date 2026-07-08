/**
 * Game icon SVG components.
 * Ported from wizard-masters-master (ui/svg.cljs) — provides scalable,
 * colorable SVG icons for use across UI panels.
 */

interface IconProps {
  size?: number
  color?: string
  className?: string
}

/** Renown coin icon — gold circle with cross */
export const IconCoin = ({ size = 20, color = '#ffd700', className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className}>
    <g transform="translate(0,0)">
      <path d="M256 68.8c-65.9 0-125.2 18.6-167.65 47.9-42.5 29.3-67.7 68.9-67.7 111.9s25.2 82.5 67.7 111.9C130.7 369.8 190.1 388.4 256 388.4c65.8 0 125.3-18.6 167.8-47.9 42.3-29.4 67.6-68.9 67.6-111.9s-25.3-82.6-67.6-111.9C381.3 87.39 321.9 68.8 256 68.8z" fill={color} opacity="0.9"/>
    </g>
  </svg>
)

/** Gauntlet icon — for armor/defense items */
export const IconGauntlet = ({ size = 20, color = '#88aacc', className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className}>
    <g transform="translate(0,0)">
      <path d="M123.153 24.602c-11.349.764-48.792 83.005-63.545 132.174-8.046 26.818 2.983 74.734 41.723 106.45 8.813-1.502 16.946-3.047 24.434-4.626-22.473-24.22-39.048-50.488-47.772-82.059l-1.021-3.699 1.963-3.299c26.135-43.925 37.681-68.548 50.85-112.24l3.849-12.773 10.402 8.351c14.624 11.743 23.72 18.084 32.098 21.809-14.428-22.99-31.841-41.36-52.46-50.06a2.164 2.164 0 0 0-.52-.028z" fill={color} opacity="0.8"/>
    </g>
  </svg>
)

/** Hat icon — for head items */
export const IconHat = ({ size = 20, color = '#cc8844', className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className}>
    <g transform="translate(0,0)">
      <path d="M256 63.43c-17.6 0-33.4 1.83-44.3 4.54-3.3.83-6 1.76-8.1 2.65 2.1.9 4.8 1.82 8.1 2.65 10.9 2.69 26.7 4.54 44.3 4.54 17.5 0 33.3-1.85 44.2-4.54 3.3-.83 6-1.75 8.1-2.65-2.1-.89-4.8-1.82-8.1-2.65-10.9-2.71-26.7-4.54-44.2-4.54z" fill={color} opacity="0.8"/>
    </g>
  </svg>
)

/** Cape icon — for back items */
export const IconCape = ({ size = 20, color = '#44aaff', className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className}>
    <g transform="translate(0,0)">
      <path d="M256 23.316c-27.177 0-58.578 5.75-79.525 17.967-20.688 13.774-43.22 60.756-43.22 60.756-3.112 5.22-6.173 10.658-9.16 16.376-36.372 69.627-61.496 175.763-62.4 317.686 46.593 26.853 97.436 44.53 142.05 52.582-21.736-14.917-40.667-38.325-55.18-67.618 36.913-4.56 78.545-9.817 107.314-9.818 29.802 0 73.456 5.63 111.32 10.29-14.484 29.072-33.326 52.308-54.946 67.144 44.615-8.052 91.458-25.727 138.05-52.58-.903-141.923-26.027-248.06-62.4-317.686-2.986-5.718-6.047-11.156-9.16-16.375v-.003s-22.53-46.98-43.22-60.754c-23.52-11.95-52.347-17.967-79.524-17.967z" fill={color} opacity="0.8"/>
    </g>
  </svg>
)

/** Upgrade icon — top-left pointing arrow */
export const IconUpgrade = ({ size = 20, color = '#44ffaa', className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className}>
    <g transform="translate(0,0)">
      <path d="M256 21.95l-5.4 4.03C187.5 73.41 125.4 104.5 30.58 120.3l-7.5 1.2v7.6c0 19 8.4 48.7 22.1 85.1 13.6 36.5 32.8 78.8 55.02 119.2 22.3 40.4 47.4 78.9 73.8 107.7 26.1 28.9 53.5 48.9 82 48.9s55.9-20 82.2-48.9c26.2-28.8 51.3-67.3 73.7-107.7 22.2-40.4 41.3-82.7 55-119.2 13.6-36.4 22-66.1 22-85.1v-7.6l-7.4-1.2c-94.6-15.8-156.9-46.89-220.1-94.32z" fill={color} opacity="0.8"/>
    </g>
  </svg>
)

/** Attachment icon — for trinket/accessory items */
export const IconAttachment = ({ size = 20, color = '#ff88cc', className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className}>
    <g transform="translate(0,0)">
      <path d="M273.9 28.1c-20.7.1-41 3.02-60.1 9.42C144.3 60.96 107.5 136.6 88.83 198.9c-3.22 10.8-6.18 22.5-8.36 34.5 1.97-.1 3.92-.1 5.83 0 4.29.3 8.3 1.4 11.95 3 2.05-11.2 4.85-22.1 7.85-32.3 17.8-59.9 53.4-129.28 113.5-149.52 16.8-5.68 35.3-8.23 54.4-8.12 23.5.12 47.8 4.28 71 11.55z" fill={color} opacity="0.8"/>
    </g>
  </svg>
)

/** Time/Hourglass icon */
export const IconTime = ({ size = 20, color = '#44ccff', className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className}>
    <g transform="translate(0,0)">
      <path d="M256 23.316c-27.177 0-58.578 5.75-79.525 17.967-20.688 13.774-43.22 60.756-43.22 60.756-3.112 5.22-6.173 10.658-9.16 16.376-36.372 69.627-61.496 175.763-62.4 317.686 46.593 26.853 97.436 44.53 142.05 52.582" fill={color} opacity="0.7"/>
    </g>
  </svg>
)

/** Renown star icon */
export const IconRenown = ({ size = 20, color = '#ffd700', className }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width={size} height={size} className={className}>
    <path d="M128 24l26.8 54.3 59.9 8.7-43.4 42.3 10.3 59.8L128 169.5 74.4 189.1l10.3-59.8L41.3 87l59.9-8.7z" fill={color} opacity="0.9"/>
  </svg>
)
