// /frontend/src/components/ui/input.jsx

import { cx } from '../../lib/cx'
import './ui.scss'

export default function Input({ className, ...props }) {
  return <input className={cx('fh-input', className)} {...props} />
}
