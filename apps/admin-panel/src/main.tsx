import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router";
import { ThemeProvider } from "@repo/shared";
import "antd/dist/reset.css";
import "./index.css";
import { store } from "./store";
import App from "./App";
import "antd/dist/reset.css";
import "./index.css";
// BASE_URL can be a full URL in production → the router only needs its path (e.g. "/admin-portal/")
const basename = new URL(import.meta.env.BASE_URL, window.location.origin).pathname;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <BrowserRouter basename={basename}>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
