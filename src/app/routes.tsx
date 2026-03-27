import { createBrowserRouter } from "react-router";
import { HomePage } from "./pages/HomePage";
import { PropertyDetail } from "./pages/PropertyDetail";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/Contato";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: HomePage,
  },
  {
    path: "/imovel/:id",
    Component: PropertyDetail,
  },
  {
    path: "/sobre",
    Component: AboutPage,
  },
  {
    path: "/contato",
    Component: ContactPage,
  },
]);