import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SideDrawer } from "./components/SideDrawer";
import { AboutPage } from "./pages/AboutPage";
import { DataPage } from "./pages/DataPage";
import { MapPage } from "./pages/MapPage";
import { ModelsPage } from "./pages/ModelsPage";
// import { PerformancePage } from "./pages/PerformancePage";
import { SettingsPage } from "./pages/SettingsPage";
import { MenuProvider, useMenu } from "./state/MenuContext";
import { MapStateProvider, useMapState } from "./state/MapStateContext";
import "./styles.css";

function AppFrame() {
  const { darkMode } = useMapState();
  const { menuOpen, setMenuOpen } = useMenu();

  return (
    <div className={darkMode ? "app app--dark" : "app"} data-theme={darkMode ? "dark" : "light"}>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/models" element={<ModelsPage />} />
        {/* <Route path="/performance" element={<PerformancePage />} /> */}
        <Route path="/data" element={<DataPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>

      <SideDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <MapStateProvider>
      <MenuProvider>
        <BrowserRouter>
          <AppFrame />
        </BrowserRouter>
      </MenuProvider>
    </MapStateProvider>
  );
}
