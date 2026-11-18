import { Link } from 'react-router-dom';

export const EDUSCHOLE_LOGO_SRC = '/manus-storage/eduschole-logo_a546dae3.png';
export const EDUSCHOLE_ICON_SRC = '/eduschole-icon.png';

type BrandProps = {
  light?: boolean;
  compact?: boolean;
  to?: string;
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
};

export function Brand({ light = false, compact = false, to = '/', className = '', ariaLabel, onClick }: BrandProps) {
  const classes = ['brand', light && 'brand-light', compact && 'brand-compact', className].filter(Boolean).join(' ');

  return (
    <Link className={classes} to={to} aria-label={ariaLabel ?? 'eduschole — accueil'} onClick={onClick}>
      <img
        className="brand-logo"
        src={compact ? EDUSCHOLE_ICON_SRC : EDUSCHOLE_LOGO_SRC}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </Link>
  );
}
