// src/router/Router.tsx
import { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import Top from "@/pages/Top";
import Category from "@/pages/Category";
import PostDetail from "@/pages/PostDetail";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import SignUp from "@/pages/SignUp";
import PasswordResetRequest from "@/pages/PasswordResetRequest";
import PasswordResetConfirm from "@/pages/PasswordResetConfirm";
import { useAuth } from "@/hooks/useAuth";

function AdminErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-4">
            管理画面でエラーが発生しました
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {error.message}
          </p>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("myblog-posts");
              resetErrorBoundary();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            やり直す
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminPageWrapper() {
  const [resetKey, setResetKey] = useState(0);

  return (
    <ErrorBoundary
      key={resetKey}
      fallbackRender={AdminErrorFallback}
      onError={(error, errorInfo) => {
        console.error("🚨 Admin page error:", error, errorInfo);
      }}
      onReset={() => {
        setResetKey((prev) => prev + 1);
        console.log("🔄 Admin page reset");
      }}
    >
      <Admin />
    </ErrorBoundary>
  );
}

const Router = () => {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  return (
    <Routes>
      <Route path="/" element={<Top />} />
      <Route path="/category/:category" element={<Category />} />
      <Route path="/posts/:id" element={<PostDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/password/reset" element={<PasswordResetRequest />} />
      <Route path="/password/edit" element={<PasswordResetConfirm />} />
      <Route
        path="/admin"
        element={
          isLoggedIn ? (
            <AdminPageWrapper />
          ) : (
            <Navigate replace to="/login" state={{ from: location }} />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default Router;
