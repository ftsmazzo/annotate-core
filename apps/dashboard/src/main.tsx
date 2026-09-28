import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProjectAnnotations from "./pages/ProjectAnnotations.js";
import AnnotationDetail from "./pages/AnnotationDetail.js";
import AdminProjects from "./pages/AdminProjects.js";
import AdminProjectAnnotations from "./pages/AdminProjectAnnotations.js";
import AdminAnnotationDetail from "./pages/AdminAnnotationDetail.js";
import Install from "./pages/Install.js";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminProjects />} />
        <Route path="/admin/p/:slug" element={<AdminProjectAnnotations />} />
        <Route path="/admin/p/:slug/annotations/:id" element={<AdminAnnotationDetail />} />
        <Route path="/install" element={<Install />} />
        <Route path="/p/:slug" element={<ProjectAnnotations />} />
        <Route path="/p/:slug/annotations/:id" element={<AnnotationDetail />} />
        <Route
          path="*"
          element={
            <div className="empty-state">
              Nenhum projeto aberto. <a href="/admin">Ir para Administração</a>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
