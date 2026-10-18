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

## Architecture rules
- Photo culling runs client-side orchestration: originals never leave the PC; only a ~1600px JPEG copy goes to the `analyzePhoto` server function. Why: speed and zero quality loss on exports.
- Folder rules (which photo goes where) live in `src/lib/culling.ts` as a pure function and are recomputed live from stored AI scores. Why: changing thresholds must not cost a re-analysis.
- Lightroom presets are approximated with per-channel LUTs in `src/lib/xmp.ts`; exports without a preset copy original bytes. Why: fast full-res processing in the browser.
- Access: first signed-in user becomes admin; others need an `invitations` row matching their Google email (roles in `user_roles`). Why: invite-only team.
