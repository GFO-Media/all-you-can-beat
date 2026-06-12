import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Home } from "./pages/Home";
import { RoomPage } from "./pages/RoomPage";
import { PartyProvider } from "./party/PartyContext";

export function App() {
  return (
    <PartyProvider>
      <AppShell>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/host/:code" element={<RoomPage isHostView />} />
            <Route path="/play/:code" element={<RoomPage isHostView={false} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppShell>
    </PartyProvider>
  );
}
