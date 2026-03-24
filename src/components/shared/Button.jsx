export function Button({ variant = 'primary', size, disabled = false, onClick, children, ...rest }) {
  const cls = `btn btn--${variant}${size === 'large' ? ' btn--large' : ''}`;
  return (
    <button
      className={cls}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
