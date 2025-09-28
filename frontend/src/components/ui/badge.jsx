// /frontend/src/components/ui/badge.jsx

import { cx } from '../../lib/cx'
import './ui.scss'

export function Badge({ className, variant='default', ...props }) {
  return (
    <span className={cx('fh-badge', `fh-badge--${variant}`, className)} {...props} />
  )
}
export default Badge
