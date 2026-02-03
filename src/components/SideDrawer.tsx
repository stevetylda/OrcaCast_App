// import { useLocation, useNavigate } from "react-router-dom";

// type Props = {
//   open: boolean;
//   onClose: () => void;
// };

// export function SideDrawer({ open, onClose }: Props) {
//   const { pathname } = useLocation();
//   const navigate = useNavigate();
//   const items = [
//     { label: "Map", path: "/" },
//     { label: "About", path: "/about" },
//     { label: "Models", path: "/models" },
//     { label: "Performance", path: "/performance" },
//     { label: "Data", path: "/data" },
//   ];

//   if (!open) return null;

//   return (
//     <div className="overlay" onClick={onClose} role="presentation">
//       <aside
//         className="sideDrawer"
//         onClick={(e) => e.stopPropagation()}
//         aria-label="Main menu"
//       >
//         <div className="sideDrawer__header">
//           <div className="sideDrawer__title">Menu</div>
//           <button className="iconBtn iconBtn--ghost" onClick={onClose} aria-label="Close">
//             <span className="material-symbols-rounded">close</span>
//           </button>
//         </div>

//         <nav className="sideDrawer__nav">
//           {items.map((item) => {
//             const isActive = item.path === "/" ? pathname === "/" : pathname === item.path;
//             return (
//               <button
//                 key={item.path}
//                 className={`sideDrawer__item${isActive ? " sideDrawer__item--active" : ""}`}
//                 type="button"
//                 aria-current={isActive ? "page" : undefined}
//                 onClick={() => {
//                   navigate(item.path);
//                   onClose();
//                 }}
//               >
//                 {item.label}
//               </button>
//             );
//           })}
//         </nav>
//       </aside>
//     </div>
//   );
// }

import { useLocation, useNavigate } from "react-router-dom";

type NavItem = {
  label: string;
  path: string;
  icon: string; // material symbol name
};

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SideDrawer({ open, onClose }: Props) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const items: NavItem[] = [
    { label: "Map", path: "/", icon: "map_search" },
    { label: "Models", path: "/models", icon: "map_search" }, // replace if you pick another
    { label: "Insights / Analysis", path: "/insights", icon: "insights" },
    // { label: "Performance", path: "/performance", icon: "analytics" },
    { label: "Data", path: "/data", icon: "data_table" },
    { label: "About", path: "/about", icon: "info" },
  ];

  if (!open) return null;

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <aside
        className="sideDrawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Main menu"
      >
        <div className="sideDrawer__header">
          <div className="sideDrawer__title">Menu</div>
          <button
            className="iconBtn iconBtn--ghost"
            onClick={onClose}
            aria-label="Close menu"
            type="button"
          >
            <span className="material-symbols-rounded" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        <nav className="sideDrawer__nav" aria-label="Primary navigation">
          {items.map((item) => {
            const isActive = item.path === "/" ? pathname === "/" : pathname === item.path;

            return (
              <button
                key={item.path}
                className={`sideDrawer__item${isActive ? " sideDrawer__item--active" : ""}`}
                type="button"
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  navigate(item.path);
                  onClose();
                }}
              >
                <span
                  className="material-symbols-rounded sideDrawer__itemIcon"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="sideDrawer__itemLabel">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}
