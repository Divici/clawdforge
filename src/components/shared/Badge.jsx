const VARIANT_CLASSES = {
  default: 'badge--default',
  success: 'badge--success',
  error: 'badge--error',
  warning: 'badge--warning',
};

export function Badge({ variant = 'default', children }) {
  return (
    <span className={`badge ${VARIANT_CLASSES[variant] || VARIANT_CLASSES.default}`}>
      {children}
    </span>
  );
}
