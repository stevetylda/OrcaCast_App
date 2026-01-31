type Props = {
  open: boolean;
  onClose: () => void;
};

export function SideDrawer({ open, onClose }: Props) {
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
          <button className="iconBtn iconBtn--ghost" onClick={onClose} aria-label="Close">
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <nav className="sideDrawer__nav">
          <button className="sideDrawer__item" type="button">
            About
          </button>
          <button className="sideDrawer__item" type="button">
            Settings
          </button>
          <button className="sideDrawer__item" type="button">
            Data Sources (coming soon)
          </button>
        </nav>
      </aside>
    </div>
  );
}
