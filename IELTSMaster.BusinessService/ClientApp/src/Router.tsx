import type { FC } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import UserPage from "./features/system/routes/User/UserPage";
import MainLayout from "./components/layout/MainLayout/MainLayout";
import LoginPage from "./features/system/routes/Auth/LoginPage";
import RegisterPage from "./features/system/routes/Auth/RegisterPage";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import UnauthorizedPage from "./pages/common/UnauthorizedPage";
import DanTocPage from "./features/danhmuc/routes/DanToc/DanTocPage";

const Router: FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Unauthenticated Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Authenticated Routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/user" replace />} />
          <Route path="/user" element={<UserPage />} />
          <Route path="/dantoc" element={<DanTocPage />} />
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default Router;
