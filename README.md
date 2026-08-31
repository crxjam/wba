# Case Learning Hub

A lightweight, static proof-of-concept for anonymised case-based learning.

## What is included

- `index.html` — main website
- `styles.css` — responsive styling
- `app.js` — case library, browser storage and email call
- `apps-script/Code.gs` — safer Google Apps Script email backend

## Important

This version stores cases only in the user's browser using `localStorage`.
It is **not** a clinical record system and should not be used for identifiable
patient information.

The Apps Script backend has been restricted to recipients ending in:

- `@uct.ac.za`
- `@myuct.ac.za`

and includes a simple hourly send limit.

## Upload to GitHub

1. Open the repository.
2. Choose **Add file → Upload files**.
3. Upload `index.html`, `styles.css`, `app.js`, and this `README.md`.
4. Commit the files.
5. In **Settings → Pages**, set:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **/(root)**
6. Save.

GitHub will then provide the public site address.

## Update the Apps Script backend

The `apps-script/Code.gs` file is not for GitHub Pages. Open the Case Learning Hub
Google Apps Script project and replace its current `Code.gs` with the contents of
this file, save it, and update/redeploy the existing web app deployment.

The website is already configured to use the current Apps Script `/exec` URL.
