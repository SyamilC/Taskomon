import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardPage from "./pages/DashboardPage";
import HabitWorkspacePage from "./pages/HabitWorkspacePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/habit" element={<HabitWorkspacePage />} />
        <Route path="/habit/:habitId" element={<HabitWorkspacePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
