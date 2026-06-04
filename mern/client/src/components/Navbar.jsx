import { NavLink } from "react-router-dom";

const linkClass = ({ isActive }) =>
  `block px-4 py-2 rounded text-sm font-medium transition-colors ${
    isActive
      ? "bg-orange-100 text-orange-700 font-semibold"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export default function Navbar() {
  return (
    <aside className="w-56 min-h-screen bg-white border-r border-slate-200 flex flex-col p-4 gap-1">
      <NavLink to="/txndefs" className="text-base font-bold mb-6 block" style={{ color: '#3c4a60', textDecoration: 'none' }}>
        Dynamic Transaction Builder
      </NavLink>

      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-4 mb-1">Forms</p>
      <NavLink to="/txndefs" className={linkClass} end>
        Transaction Definitions
      </NavLink>
      <NavLink to="/txndefs/create" className={linkClass}>
        New Definition
      </NavLink>

      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-4 mt-4 mb-1">Data</p>
      <NavLink to="/transactions" className={linkClass} end>
        Transactions
      </NavLink>
    </aside>
  );
}