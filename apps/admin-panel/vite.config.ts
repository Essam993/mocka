import { createViteConfig } from "@repo/shared/vite";

export default createViteConfig({
  port: 400,
  productionBase: "https://mocka.tangerine-digital.com/admin-portal/",
});
