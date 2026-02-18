import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { SideDrawer } from "./components/SideDrawer";
import { MapPage } from "./pages/MapPage";
// import { PerformancePage } from "./pages/PerformancePage";
import { MenuProvider, useMenu } from "./state/MenuContext";
import { MapStateProvider, useMapState } from "./state/MapStateContext";
import "./styles.css";

const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const DataPage = lazy(() => import("./pages/DataPage").then((m) => ({ default: m.DataPage })));
const ExplainabilityPage = lazy(() =>
  import("./pages/ExplainabilityPage").then((m) => ({ default: m.ExplainabilityPage }))
);
const ModelsPage = lazy(() => import("./pages/ModelsPage").then((m) => ({ default: m.ModelsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function AppFrame() {
  const { darkMode } = useMapState();
  const { menuOpen, setMenuOpen } = useMenu();

  return (
    <div className={darkMode ? "app app--dark" : "app"} data-theme={darkMode ? "dark" : "light"}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/explainability" element={<ExplainabilityPage />} />
          {/* <Route path="/performance" element={<PerformancePage />} /> */}
          <Route path="/data" element={<DataPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Suspense>

      <SideDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <MapStateProvider>
      <MenuProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppFrame />
        </BrowserRouter>
      </MenuProvider>
    </MapStateProvider>
  );
}
