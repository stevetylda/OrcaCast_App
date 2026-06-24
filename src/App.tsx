import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { SideDrawer } from "./components/SideDrawer";
import { appConfig } from "./config/appConfig";
import { MapPage } from "./pages/MapPage";
// import { PerformancePage } from "./pages/PerformancePage";
import { MenuProvider, useMenu } from "./state/MenuContext";
import { MapStateProvider, useMapState } from "./state/MapStateContext";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/map.css";
import "./styles/components.css";

const AboutPage = lazy(() => import("./pages/AboutPage").then((m) => ({ default: m.AboutPage })));
const DataPage = lazy(() => import("./pages/DataPage").then((m) => ({ default: m.DataPage })));
const ViewabilityPage = lazy(() =>
  import("./pages/ViewabilityPage").then((m) => ({ default: m.ViewabilityPage }))
);
const ExplainabilityPage = lazy(() =>
  import("./pages/ExplainabilityPage").then((m) => ({ default: m.ExplainabilityPage }))
);
const ModelsPage = lazy(() => import("./pages/ModelsPage").then((m) => ({ default: m.ModelsPage })));
const SettingsPage = lazy(() => import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage })));

function AppFrame() {
  const { darkMode } = useMapState();
  const { menuOpen, setMenuOpen } = useMenu();
  const { ENABLE_DATA, ENABLE_EXPLAINABILITY, ENABLE_MODELS, ENABLE_VIEWABILITY } =
    appConfig.featureFlags;

  return (
    <div className={darkMode ? "app app--dark" : "app"} data-theme={darkMode ? "dark" : "light"}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/about" element={<AboutPage />} />
          {ENABLE_VIEWABILITY && <Route path="/effort" element={<Navigate to="/viewability" replace />} />}
          {ENABLE_VIEWABILITY && <Route path="/viewability" element={<ViewabilityPage />} />}
          {ENABLE_MODELS && <Route path="/models" element={<ModelsPage />} />}
          {ENABLE_EXPLAINABILITY && <Route path="/explainability" element={<ExplainabilityPage />} />}
          {/* <Route path="/performance" element={<PerformancePage />} /> */}
          {ENABLE_DATA && <Route path="/data" element={<DataPage />} />}
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
