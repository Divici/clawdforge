import './shared.css';

export function ProConList({ pros = [], cons = [] }) {
  return (
    <div className="pro-con-list">
      {pros.map((p, i) => <div key={`pro-${i}`} className="pro-con-list__pro">{'\u2713'} {p}</div>)}
      {cons.map((c, i) => <div key={`con-${i}`} className="pro-con-list__con">{'\u2717'} {c}</div>)}
    </div>
  );
}
