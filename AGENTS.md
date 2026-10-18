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
- Access uses real-email/password accounts provisioned by authenticated server functions after validating the sole superadministrator role and active profile; signup triggers create profiles but never assign privileges. Why: prevent public registration and privilege escalation.
- Teams organize account membership only; albums and analysis results remain owner-only under active-member RLS, including administrators. Why: preserve each photographer's private workspace.
- Auth state is provided once at the root; sign-out cancels queries and disposes module-level album sessions before clearing credentials. Why: prevent account-switch data leaks and background work under a different identity.
- Album work (analysis queue, folder watch, auto-export) lives in a module-level per-album session in `src/lib/album-session.ts`, not in React state. Why: it must keep running when the user navigates away from the album page.
- Auto exposure is a histogram-based LUT in `src/lib/exposure.ts`, applied to "boas" exports before the preset. Why: same fast per-pixel pipeline as presets.
