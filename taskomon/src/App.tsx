import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AskAdvicePage from "./pages/AskAdvicePage";
import DashboardPage from "./pages/DashboardPage";
import HabitWorkspacePage from "./pages/HabitWorkspacePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SuggestAdvicePage from "./pages/SuggestAdvicePage";
import ViewAllHabitPage from "./pages/ViewAllHabitPage";
import ViewAllWorkflowPage from "./pages/ViewAllWorkflowPage";
import WorkflowWorkspacePage from "./pages/WorkflowWorkspacePage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/advice" element={<AskAdvicePage />} />
        <Route path="/advice/suggest" element={<SuggestAdvicePage />} />
        <Route path="/habits" element={<ViewAllHabitPage />} />
        <Route path="/workflows" element={<ViewAllWorkflowPage />} />
        <Route path="/habit" element={<HabitWorkspacePage />} />
        <Route path="/habit/:habitId" element={<HabitWorkspacePage />} />
        <Route path="/workflow" element={<WorkflowWorkspacePage />} />
        <Route path="/workflow/:workflowId" element={<WorkflowWorkspacePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
