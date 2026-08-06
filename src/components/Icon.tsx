import type { CSSProperties } from 'react';
import { TRIPASIST_ICONS, type IconName } from '../icons/tripasist-icons';

export type { IconName };

interface IconProps {
  name: IconName;
  size?: number;
  className?: string;
  style?: CSSProperties;
  spin?: boolean;
  title?: string;
}

export function Icon({ name, size = 20, className, style, spin, title }: IconProps) {
  const paths = TRIPASIST_ICONS[name];
  const classes = ['ta-icon', spin ? 'ta-spin' : '', className].filter(Boolean).join(' ');

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={classes}
      style={style}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      {paths.map((p, i) =>
        p.fill ? (
          <path key={i} fill="currentColor" stroke="none" d={p.d} />
        ) : (
          <path key={i} d={p.d} />
        )
      )}
    </svg>
  );
}
