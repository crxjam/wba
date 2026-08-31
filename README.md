# Case Learning Hub v2

This version adds:

- username/password login
- registrar vs consultant roles
- registrars see only their own cases
- consultants see all cases
- threaded case responses/comments
- file/image upload
- phone camera capture
- Google Sheets backend
- Google Drive attachment storage

## Important security note

This is still a pilot architecture. Do not use identifiable patient information unless your institution has approved the storage, access-control and governance model. In particular, do not make the Drive upload folder public.

## 1. Replace the GitHub files

Upload these to the root of the `wba` repository, replacing the existing files:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`

GitHub Pages will redeploy automatically.

## 2. Replace Apps Script Code.gs

Open the existing Case Learning Hub Apps Script project and replace the old `Code.gs` with:

`apps-script/Code.gs`

Save it.

## 3. Run one-time backend setup

In Apps Script, select and run:

`setupCaseLearningHub`

Approve Google Sheets and Drive permissions when prompted.

This creates:

- a Google Sheet called `Case Learning Hub Data`
- a Google Drive folder called `Case Learning Hub Uploads`

## 4. Add users

In `Code.gs`, use the `addUser(...)` function from the Apps Script editor.

Example registrar:

`addUser("james", "James", "crxjam002@myuct.ac.za", "ChooseAStrongPassword", "registrar");`

Example consultant:

`addUser("consultant1", "Consultant One", "consultant@uct.ac.za", "ChooseAStrongPassword", "consultant");`

Run one line at a time from a temporary helper function if easier, e.g.:

function addInitialUsers() {
  addUser("james", "James", "crxjam002@myuct.ac.za", "CHANGE_ME", "registrar");
  addUser("consultant1", "Consultant One", "consultant@uct.ac.za", "CHANGE_ME", "consultant");
}

Run `addInitialUsers` once, then delete the temporary helper function so plaintext passwords do not remain in the code.

## 5. Update the existing web-app deployment

Apps Script:

Deploy -> Manage deployments -> Edit -> New version -> Deploy

Keep:

- Execute as: Me
- Who has access: Anyone

The frontend already points to the same `/exec` URL, so the URL does not need to change if you update the existing deployment.

## Behaviour

### Registrar
- signs in with own username/password
- can submit cases
- sees only own cases
- can open own cases
- can see and add discussion comments
- can attach one file/image to each case

### Consultant
- signs in with consultant account
- sees all registrars' cases
- can open any case
- can post responses/comments
- cannot submit a registrar case

### Camera
On mobile, the **Take photo** button invokes the phone camera using an HTML file input with `capture="environment"`.

## Storage

- user records, cases and comments: Google Sheet
- attachments: Google Drive
- login sessions: temporary Apps Script cache (6 hours)

## Limits

The current attachment limit is 8 MB per case.
