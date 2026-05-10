# Corretor de imoveis

Run `npm run dev` to start the development server.

## OCI Object Storage

Os uploads de fotos do sistema usam uma PAR do Oracle OCI. Configure um arquivo `.env`
baseado no `.env.example` com:

- `VITE_OCI_PAR_URL`: PAR de escrita para enviar as fotos.
- `VITE_OCI_READ_BASE`: base publica ou PAR de leitura para exibir as imagens.

Se a PAR de escrita expirar ou estiver sem permissao de upload, o sistema exibira erro `401`
ao tentar enviar fotos.
