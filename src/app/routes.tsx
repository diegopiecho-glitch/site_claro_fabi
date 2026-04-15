import { createBrowserRouter } from "react-router";
import { RootLayout } from "./RootLayout";
import { HomePage } from "./pages/HomePage";
import { PropertyDetail } from "./pages/PropertyDetail";
import { AboutPage } from "./pages/AboutPage";
import { ContactPage } from "./pages/Contato";
import { ImageViewer } from "./pages/ImageViewer";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
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
      {
        path: "/visualizar-imagem",
        Component: ImageViewer,
      },
    ],
  },
]);
