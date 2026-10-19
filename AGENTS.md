<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Los textos visibles de cada pantalla deben usar el diccionario común de seis idiomas; evita diccionarios locales parciales para que ningún idioma vuelva al inglés.
- Data portability lives in `src/lib/backup.server.ts` (table list in FK order + conflict keys), exposed via `/api/public/backup/{export,import}` (Bearer `BACKUP_API_KEY`) and the admin "backup" tab; import only runs on a destination with zero players. Why: lets the app be cloned to another server without ever overwriting live balances. Add any new table to `BACKUP_TABLES`.
