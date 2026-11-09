import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router";
import { App as AntdApp } from "antd";
import { ThemeProvider, ToastProvider } from "@repo/shared";
import "antd/dist/reset.css";
import "./index.css";
import App from "./App";
import { store } from "./store";

const basename = new URL(import.meta.env.BASE_URL, window.location.origin).pathname;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <AntdApp>
          <BrowserRouter basename={basename}>
            <ToastProvider>
              <App />
            </ToastProvider>
          </BrowserRouter>
        </AntdApp>
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);