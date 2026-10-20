# RAIP and MOTEMA SLIM correction — 2026-10-20

Status at preparation: local implementation and browser QA complete. User subsequently approved publication with Live; production verification is recorded in the task evidence folder.

- MOTEMA SLIM: remove package crop from profile. Native text fallback reads MOTEMA SLIM in both navigation and section header; pink banner retained, text #8c264a. No verified standalone official logo was obtainable from the checked sources. Details: ../evidence/motema-source/provenance.md in the task folder.
- RAIP: replace the cropped dark header asset with the manufacturer's exact transparent white footer asset from https://raip.co.kr/aim/images/ft_logo.png (125×36). No image editing. Banner filter none preserves original white artwork; rail brightness(0) makes the transparent wordmark dark on its light background. Remove crop geometry.
- The reported RAIP blank was not reproduced in current Chrome production: existing computed filter was brightness(0) invert(1) and wordmark was visible. This patch removes reliance on that banner recolouring/crop path; original Safari screenshot conditions were not available for retest.

Validation: node --check category-brand-headers.js; git diff --check; exact source bytes for RAIP; actual original shop.html rendered at 375×812 and 1440×1000. Both brand rails and banners visually checked; links resolve to correct brand sections; no horizontal page overflow. Four screenshots are in task evidence/. Existing about:blank page reused and restored; no tabs created; emulation reset; HTTP server stopped.

Scope: two profiles plus one official asset; catalog data, prices, inventory and shared rendering unchanged. Release approval: Winston Live. All 12 category entry pages use the new script version to bypass the existing ten-minute browser cache.
