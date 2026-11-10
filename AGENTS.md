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

- Pizzeria flavor and drink photo controls reuse the authenticated store-assets upload and signing functions, saving durable paths in image_url so temporary URLs are never persisted.

- Pizzeria public builder items (pizza/addon) flow through the normal cart and submitOrder; the server recalculates every pizza price from the database (most expensive flavor + addons) so browser prices are never trusted.
