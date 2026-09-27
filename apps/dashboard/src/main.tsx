import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import ProjectAnnotations from "./pages/ProjectAnnotations.js";
import AnnotationDetail from "./pages/AnnotationDetail.js";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/p/:slug" element={<ProjectAnnotations />} />
        <Route path="/p/:slug/annotations/:id" element={<AnnotationDetail />} />
        <Route
          path="*"
          element={<div className="empty-state">Abra pelo link do seu projeto: /p/&lt;slug&gt;?t=&lt;token&gt;</div>}
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
