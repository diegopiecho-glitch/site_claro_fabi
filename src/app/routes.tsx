import { createBrowserRouter } from "react-router";
import { RootLayout }     from "./RootLayout";
import { HomePage }       from "./pages/HomePage";
import { PropertyDetail } from "./pages/PropertyDetail";
import { AboutPage }      from "./pages/AboutPage";
import { ContactPage }    from "./pages/Contato";
import { ImageViewer }    from "./pages/ImageViewer";

// Sistema de gerenciamento
import { LoginPage }          from "./pages/sistema/LoginPage";
import { SistemaLayout }      from "./pages/sistema/SistemaLayout";
import { SistemaHome }        from "./pages/sistema/SistemaHome";
import { ImoveisList }        from "./pages/sistema/imoveis/ImoveisList";
import { ImoveisForm }        from "./pages/sistema/imoveis/ImoveisForm";
import { ConfiguracaoSite }   from "./pages/sistema/configuracoes/ConfiguracaoSite";
import { CaracteristicasPage } from "./pages/sistema/caracteristicas/CaracteristicasPage";

export const router = createBrowserRouter([
  {
    Component: RootLayout,
    children: [
      // ── Site público ──────────────────────────────────────────
      { path: "/",                   Component: HomePage       },
      { path: "/imovel/:id",         Component: PropertyDetail },
      { path: "/sobre",              Component: AboutPage      },
      { path: "/contato",            Component: ContactPage    },
      { path: "/visualizar-imagem",  Component: ImageViewer    },

      // ── Sistema de gerenciamento ──────────────────────────────
      {
        path: "/sistema",
        children: [
          // Login (index — rota exata /sistema)
          { index: true, Component: LoginPage },

          // Páginas protegidas (dentro do SistemaLayout com sidebar)
          {
            Component: SistemaLayout,
            children: [
              { path: "home",                   Component: SistemaHome     },
              { path: "imoveis",                Component: ImoveisList     },
              { path: "imoveis/novo",           Component: ImoveisForm     },
              { path: "imoveis/:id/editar",     Component: ImoveisForm     },
              { path: "caracteristicas",        Component: CaracteristicasPage },
              { path: "configuracoes",          Component: ConfiguracaoSite },
            ],
          },
        ],
      },
    ],
  },
]);
