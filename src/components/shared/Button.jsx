export function Button({ variant = 'primary', disabled = false, onClick, children, ...rest }) {
  return (
    <button
      className={`btn btn--${variant}`}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      {...rest}
    >
      {children}
    </button>
  );
}
