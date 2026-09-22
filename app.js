const API_URL =
  "https://script.google.com/macros/s/AKfycbxQbrgEhVoGG8-V3tl6wZCAIgFewtix985ijIN-mrnVHlgsZnVSOtqLlGnY4pgAu31t/exec";

let sessionToken =
  sessionStorage.getItem("clh_session") || "";

let currentUser = null;
let currentCaseId = null;
let selectedFile = null;

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];


/* =========================================================
   API
   ========================================================= */

async function api(action, payload = {}) {

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify({
      action,
      sessionToken,
      ...payload
    })
  });

  const data = await res.json();

  if (!data.success) {
    throw new Error(
      data.error || "Request failed"
    );
  }

  return data;
}


/* =========================================================
   LOGIN / APP
   ========================================================= */

function showApp() {

  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");

  $("#whoami").textContent =
    `${currentUser.displayName} · ${currentUser.role}`;

  if (currentUser.role === "consultant") {

    $$(".registrar-only")
      .forEach(
        x => x.classList.add("hidden")
      );

    $("#libraryTitle").textContent =
      "All submitted cases";

  } else {

    $$(".registrar-only")
      .forEach(
        x => x.classList.remove("hidden")
      );

    $("#libraryTitle").textContent =
      "My cases";

    loadConsultants();
  }

  loadCases();
}


function showLogin() {

  $("#loginView")
    .classList.remove("hidden");

  $("#appView")
    .classList.add("hidden");

  $("#logoutBtn")
    .classList.add("hidden");
}


$("#loginForm")
  .addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      $("#loginStatus").textContent =
        "Signing in…";

      try {

        const d = await api(
          "login",
          {
            username:
              $("#username")
                .value
                .trim(),

            password:
              $("#password").value
          }
        );

        sessionToken =
          d.sessionToken;

        currentUser =
          d.user;

        sessionStorage.setItem(
          "clh_session",
          sessionToken
        );

        $("#loginStatus").textContent =
          "";

        showApp();

      } catch (err) {

        $("#loginStatus").textContent =
          err.message;

      }
    }
  );


$("#logoutBtn")
  .addEventListener(
    "click",
    async () => {

      try {
        await api("logout");
      } catch (_) {}

      sessionStorage.removeItem(
        "clh_session"
      );

      sessionToken = "";
      currentUser = null;

      showLogin();
    }
  );


/* =========================================================
   TABS
   ========================================================= */

$$(".tab").forEach(
  t =>
    t.addEventListener(
      "click",
      () => {

        $$(".tab").forEach(
          x =>
            x.classList.remove(
              "active"
            )
        );

        $$(".view").forEach(
          x =>
            x.classList.remove(
              "active"
            )
        );

        t.classList.add(
          "active"
        );

        $(
          `#view-${t.dataset.view}`
        ).classList.add(
          "active"
        );

      }
    )
);


/* =========================================================
   CONSULTANT LIST
   ========================================================= */

async function loadConsultants() {

  const select =
    $("#consultantId");

  if (!select) {
    return;
  }

  select.innerHTML =
    `<option value="">Loading consultants…</option>`;

  try {

    const d =
      await api(
        "listConsultants"
      );

    select.innerHTML =
      `<option value="">Select consultant</option>` +
      d.consultants
        .map(
          c => `
            <option value="${escAttr(c.userId)}">
              ${esc(c.displayName)}
            </option>
          `
        )
        .join("");

  } catch (err) {

    select.innerHTML =
      `<option value="">Could not load consultants</option>`;

  }
}


/* =========================================================
   CASE LIST
   ========================================================= */

$("#refreshBtn")
  .addEventListener(
    "click",
    loadCases
  );


async function loadCases() {

  $("#caseList").innerHTML =
    `<div class="empty">Loading…</div>`;

  try {

    const d =
      await api(
        "listCases"
      );

    if (!d.cases.length) {

      $("#caseList").innerHTML =
        `<div class="empty">No cases yet.</div>`;

      return;
    }


    $("#caseList").innerHTML =
      d.cases
        .map(
          c => {

            let status = "";

            if (c.isWBA) {

              const statusText =
                c.wbaStatus ||
                "Awaiting assessment";

              status = `
                <span class="pill">
                  ${esc(statusText)}
                </span>
              `;
            }


            const consultant =
              c.requestedConsultantDisplayName
                ? `
                  <div class="meta">
                    Consultant:
                    ${esc(
                      c.requestedConsultantDisplayName
                    )}
                  </div>
                `
                : "";


            return `
              <article
                class="case-card"
                data-id="${escAttr(c.id)}"
              >

                <h3>
                  ${esc(c.title)}
                </h3>

                <div class="meta">
                  ${esc(c.specialty)}
                  ·
                  ${esc(c.ownerDisplayName)}
                  ·
                  ${new Date(
                    c.createdAt
                  ).toLocaleString()}
                </div>

                ${consultant}

                ${status}

                <span class="pill">
                  ${c.commentCount || 0}
                  response${(c.commentCount || 0) === 1 ? "" : "s"}
                </span>

              </article>
            `;
          }
        )
        .join("");


    $$(".case-card")
      .forEach(
        c =>
          c.addEventListener(
            "click",
            () =>
              openCase(
                c.dataset.id
              )
          )
      );

  } catch (err) {

    if (
      /session/i.test(
        err.message
      )
    ) {
      showLogin();
    }

    $("#caseList").innerHTML =
      `<div class="empty">${esc(err.message)}</div>`;
  }
}


/* =========================================================
   ATTACHMENT SELECTION
   ========================================================= */

$("#cameraBtn")
  .addEventListener(
    "click",
    () =>
      $("#cameraInput")
        .click()
  );


$("#attachment")
  .addEventListener(
    "change",
    e =>
      selectFile(
        e.target.files[0]
      )
  );


$("#cameraInput")
  .addEventListener(
    "change",
    e =>
      selectFile(
        e.target.files[0]
      )
  );


function selectFile(file) {

  selectedFile =
    file || null;

  $("#fileName").textContent =
    selectedFile
      ? selectedFile.name
      : "";
}


function fileToBase64(file) {

  return new Promise(
    (resolve, reject) => {

      const r =
        new FileReader();

      r.onload =
        () =>
          resolve(
            String(
              r.result
            ).split(",")[1]
          );

      r.onerror =
        reject;

      r.readAsDataURL(
        file
      );
    }
  );
}


/* =========================================================
   SUBMIT WBA REQUEST
   ========================================================= */

$("#caseForm")
  .addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      $("#submitStatus").textContent =
        "Submitting…";

      try {

        let attachment = null;


        if (selectedFile) {

          if (
            selectedFile.size >
            8 * 1024 * 1024
          ) {

            throw new Error(
              "Attachment is too large. Maximum 8 MB."
            );
          }


          attachment = {

            name:
              selectedFile.name,

            type:
              selectedFile.type ||
              "application/octet-stream",

            base64:
              await fileToBase64(
                selectedFile
              )

          };
        }


        const selfRating =
          document.querySelector(
            'input[name="selfSupervision"]:checked'
          );


        if (!selfRating) {

          throw new Error(
            "Please select your self-assessed supervision level."
          );

        }


        await api(
          "createCase",
          {

            registrarFullName:
              $("#registrarFullName")
                .value
                .trim(),

            trainingYear:
              $("#trainingYear")
                .value,

            rotation:
              $("#rotation")
                .value
                .trim(),

            observationDate:
              $("#observationDate")
                .value,

            title:
              $("#title")
                .value
                .trim(),

            specialty:
              $("#specialty")
                .value,

            summary:
              $("#summary")
                .value
                .trim(),

            selfSupervision:
              selfRating.value,

            consultantId:
              $("#consultantId")
                .value,

            attachment:
              attachment

          }
        );


        e.target.reset();

        selectedFile = null;

        $("#fileName").textContent =
          "";

        $("#submitStatus").textContent =
          "Observation request submitted.";


        await loadConsultants();


        document
          .querySelector(
            '.tab[data-view="cases"]'
          )
          .click();


        loadCases();

      } catch (err) {

        $("#submitStatus").textContent =
          err.message;

      }
    }
  );


/* =========================================================
   OPEN CASE
   ========================================================= */

async function openCase(id) {

  try {

    const d =
      await api(
        "getCase",
        {
          caseId: id
        }
      );


    currentCaseId = id;

    const c =
      d.case;


    $("#dialogTitle").textContent =
      c.title;


    let bodyHtml = `
      <div class="meta">
        ${esc(c.specialty)}
        · submitted by
        ${esc(
          c.registrarFullName ||
          c.ownerDisplayName
        )}
        ·
        ${new Date(
          c.createdAt
        ).toLocaleString()}
      </div>
    `;


    /*
      WBA DETAILS
    */

    if (d.isWBA) {

      bodyHtml +=
        detail(
          "Registrar",
          c.registrarFullName ||
          c.ownerDisplayName
        );


      bodyHtml +=
        detail(
          "Year of training",
          c.trainingYear
        );


      bodyHtml +=
        detail(
          "Rotation",
          c.rotation
        );


      bodyHtml +=
        detail(
          "Date of observation",
          formatDateOnly(
            c.observationDate
          )
        );


      bodyHtml +=
        detail(
          "Observation requested for",
          c.summary
        );


      bodyHtml +=
        detail(
          "Consultant present for observation",
          c.requestedConsultantDisplayName
        );


      /*
        Only the registrar receives this
        field from the backend.
      */

      if (
        c.selfSupervision
      ) {

        bodyHtml += `
          <div class="detail">

            <h4>
              Your self-assessment
            </h4>

            <p>
              ${esc(
                c.selfSupervision
              )}
            </p>

            <p class="muted small">
              This self-assessment is private
              and is not shown to the consultant.
            </p>

          </div>
        `;
      }


      /*
        COMPLETED CONSULTANT ASSESSMENT
      */

      if (d.assessment) {

        const a =
          d.assessment;


        bodyHtml += `
          <div class="detail">

            <h3>
              Consultant observation report
            </h3>

            <div class="meta">
              Completed by
              ${esc(
                a.consultantDisplayName
              )}
              ·
              ${new Date(
                a.createdAt
              ).toLocaleString()}
            </div>

          </div>
        `;


        bodyHtml +=
          detail(
            "Activity observed",
            a.activityObserved
          );


        bodyHtml +=
          detail(
            "Description of activity",
            a.activityDescription
          );


        bodyHtml +=
          detail(
            "Difficulty rating",
            a.difficultyRating
          );


        bodyHtml +=
          detail(
            "Supervisor physically present",
            a.supervisorPresent
          );


        bodyHtml +=
          detail(
            "Ability to perform the activity independently",
            a.independentPerformance
          );


        bodyHtml +=
          detail(
            "Supervision required next time",
            a.supervisionRating
          );


        bodyHtml +=
          detail(
            "What was done well",
            a.doneWell
          );


        bodyHtml +=
          detail(
            "What could be done differently",
            a.doDifferently
          );

      }


      /*
        ASSESS BUTTON
        Only appears for the selected consultant
        before an assessment has been submitted.
      */

      if (d.canAssess) {

        bodyHtml += `
          <div class="detail">

            <h4>
              Observation report
            </h4>

            <p>
              You have been selected as the
              consultant for this observation.
            </p>

            <button
              type="button"
              class="primary"
              id="assessCaseBtn"
            >
              Complete observation report
            </button>

          </div>
        `;

      }

    }


    /*
      LEGACY CASE
      Keeps old cases working.
    */

    else {

      bodyHtml +=
        detail(
          "Clinical summary",
          c.summary
        );


      if (c.results) {

        bodyHtml +=
          detail(
            "Key results / findings",
            c.results
          );

      }


      if (c.learningPoint) {

        bodyHtml +=
          detail(
            "Learning point",
            c.learningPoint
          );

      }


      if (c.discussion) {

        bodyHtml +=
          detail(
            "Discussion",
            c.discussion
          );

      }

    }


    /*
      ATTACHMENT
    */

    if (
      c.attachmentFileId
    ) {

      bodyHtml += `
        <div class="detail">

          <h4>
            Attachment
          </h4>

          <button
            type="button"
            class="secondary"
            onclick="openAttachment('${escAttr(c.id)}')"
          >
            Open ${esc(
              c.attachmentName ||
              "attachment"
            )}
          </button>

        </div>
      `;
    }


    $("#dialogBody").innerHTML =
      bodyHtml;


    renderComments(
      d.comments
    );


    $("#caseDialog")
      .showModal();


    const assessButton =
      $("#assessCaseBtn");


    if (assessButton) {

      assessButton
        .addEventListener(
          "click",
          () =>
            openAssessment(
              c
            )
        );

    }

  } catch (err) {

    alert(
      err.message
    );

  }
}


/* =========================================================
   DETAIL DISPLAY
   ========================================================= */

function detail(h, v) {

  return `
    <div class="detail">
      <h4>${esc(h)}</h4>
      <p>${esc(v || "")}</p>
    </div>
  `;
}


function formatDateOnly(value) {

  if (!value) {
    return "";
  }

  const s =
    String(value);

  const match =
    s.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (!match) {
    return s;
  }

  return (
    match[3] +
    "/" +
    match[2] +
    "/" +
    match[1]
  );
}


/* =========================================================
   COMMENTS
   ========================================================= */

function renderComments(comments) {

  $("#commentList").innerHTML =
    comments.length
      ? comments
          .map(
            x => `
              <div class="comment">

                <div class="comment-head">
                  ${esc(x.authorDisplayName)}
                  ·
                  ${esc(x.authorRole)}
                  ·
                  ${new Date(
                    x.createdAt
                  ).toLocaleString()}
                </div>

                <p>
                  ${esc(x.text)}
                </p>

              </div>
            `
          )
          .join("")
      : `<p class="muted">No responses yet.</p>`;
}


$("#closeDialog")
  .addEventListener(
    "click",
    () =>
      $("#caseDialog")
        .close()
  );


$("#commentForm")
  .addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      $("#commentStatus").textContent =
        "Posting…";

      try {

        const d =
          await api(
            "addComment",
            {
              caseId:
                currentCaseId,

              text:
                $("#commentText")
                  .value
                  .trim()
            }
          );


        $("#commentText").value =
          "";

        $("#commentStatus").textContent =
          "";


        renderComments(
          d.comments
        );


        loadCases();

      } catch (err) {

        $("#commentStatus").textContent =
          err.message;

      }
    }
  );


/* =========================================================
   CONSULTANT ASSESSMENT
   ========================================================= */

function openAssessment(c) {

  /*
    Close the case window so the assessment
    dialog is cleanly displayed.
  */

  $("#caseDialog")
    .close();


  $("#assessmentForm")
    .reset();


  $("#assessmentStatus")
    .textContent = "";


  $("#assessmentCaseId")
    .value = c.id;


  /*
    Pre-populate information already known
    from the registrar's request.
  */

  $("#activityObserved")
    .value =
      c.summary || "";


  $("#supervisorPresent")
    .value =
      currentUser.displayName || "";


  $("#assessmentDialog")
    .showModal();
}


$("#closeAssessmentDialog")
  .addEventListener(
    "click",
    () =>
      $("#assessmentDialog")
        .close()
  );


$("#assessmentForm")
  .addEventListener(
    "submit",
    async e => {

      e.preventDefault();


      $("#assessmentStatus")
        .textContent =
          "Submitting assessment…";


      try {

        const difficulty =
          document.querySelector(
            'input[name="difficultyRating"]:checked'
          );


        const supervision =
          document.querySelector(
            'input[name="consultantSupervision"]:checked'
          );


        if (!difficulty) {

          throw new Error(
            "Please select a difficulty rating."
          );

        }


        if (!supervision) {

          throw new Error(
            "Please select the supervision level required."
          );

        }


        await api(
          "submitAssessment",
          {

            caseId:
              $("#assessmentCaseId")
                .value,

            activityObserved:
              $("#activityObserved")
                .value
                .trim(),

            activityDescription:
              $("#activityDescription")
                .value
                .trim(),

            difficultyRating:
              difficulty.value,

            supervisorPresent:
              $("#supervisorPresent")
                .value
                .trim(),

            independentPerformance:
              $("#independentPerformance")
                .value
                .trim(),

            supervisionRating:
              supervision.value,

            doneWell:
              $("#doneWell")
                .value
                .trim(),

            doDifferently:
              $("#doDifferently")
                .value
                .trim()

          }
        );


        $("#assessmentStatus")
          .textContent =
            "Assessment submitted.";


        await loadCases();


        setTimeout(
          () => {

            $("#assessmentDialog")
              .close();

          },
          700
        );

      } catch (err) {

        $("#assessmentStatus")
          .textContent =
            err.message;

      }
    }
  );


/* =========================================================
   RESTORE SESSION
   ========================================================= */

(async function restore() {

  if (!sessionToken) {

    showLogin();
    return;

  }


  try {

    const d =
      await api("me");

    currentUser =
      d.user;

    showApp();

  } catch (_) {

    sessionStorage.removeItem(
      "clh_session"
    );

    sessionToken = "";

    showLogin();

  }

})();


/* =========================================================
   ATTACHMENT VIEWER
   ========================================================= */

async function openAttachment(caseId) {

  /*
    Open the window immediately while the action
    is still directly connected to the user's click.
    This prevents mobile/Chrome popup blocking.
  */

  const win =
    window.open(
      "",
      "_blank"
    );


  if (!win) {

    alert(
      "Your browser blocked the attachment window. Please allow pop-ups for Case Learning Hub."
    );

    return;
  }


  win.document.write(`
    <!DOCTYPE html>

    <html>

      <head>

        <title>
          Loading attachment...
        </title>

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1"
        >

      </head>

      <body style="
        font-family: Arial, sans-serif;
        padding: 30px;
        text-align: center;
      ">

        Loading attachment...

      </body>

    </html>
  `);


  win.document.close();


  try {

    const d =
      await api(
        "getAttachment",
        {
          caseId
        }
      );


    const a =
      d.attachment;


    const binary =
      atob(
        a.base64
      );


    const bytes =
      new Uint8Array(
        binary.length
      );


    for (
      let i = 0;
      i < binary.length;
      i++
    ) {

      bytes[i] =
        binary.charCodeAt(i);

    }


    const mimeType =
      a.mimeType ||
      "application/octet-stream";


    const blob =
      new Blob(
        [bytes],
        {
          type: mimeType
        }
      );


    const url =
      URL.createObjectURL(
        blob
      );


    /* IMAGE */

    if (
      mimeType.startsWith(
        "image/"
      )
    ) {

      win.document.open();


      win.document.write(`
        <!DOCTYPE html>

        <html>

          <head>

            <title>
              ${esc(
                a.name ||
                "Case attachment"
              )}
            </title>

            <meta
              name="viewport"
              content="width=device-width, initial-scale=1, maximum-scale=10, user-scalable=yes"
            >

            <style>

              html,
              body {
                margin: 0;
                padding: 0;
                background: #111;
                min-height: 100%;
              }

              .toolbar {
                position: sticky;
                top: 0;
                z-index: 10;
                display: flex;
                justify-content: center;
                gap: 10px;
                padding: 10px;
                background: rgba(20,20,20,0.95);
              }

              .toolbar button {
                border: 0;
                border-radius: 8px;
                padding: 9px 14px;
                background: white;
                color: #222;
                font-size: 14px;
                font-weight: 600;
              }

              .image-wrap {
                width: 100%;
                overflow: auto;
                text-align: center;
              }

              img {
                display: block;
                width: 100%;
                height: auto;
                margin: 0 auto;
                transform-origin: center center;
              }

            </style>

          </head>

          <body>

            <div class="toolbar">

              <button
                onclick="rotateImage()"
              >
                Rotate
              </button>

              <button
                onclick="resetImage()"
              >
                Reset
              </button>

            </div>


            <div class="image-wrap">

              <img
                id="caseImage"
                src="${url}"
                alt="Case attachment"
              >

            </div>


            <script>

              let rotation = 0;

              function rotateImage() {

                rotation += 90;

                document
                  .getElementById("caseImage")
                  .style
                  .transform =
                    "rotate(" +
                    rotation +
                    "deg)";

              }

              function resetImage() {

                rotation = 0;

                document
                  .getElementById("caseImage")
                  .style
                  .transform =
                    "rotate(0deg)";

              }

            <\/script>

          </body>

        </html>
      `);


      win.document.close();

    }


    /* PDF */

    else if (
      mimeType ===
      "application/pdf"
    ) {

      win.location.href =
        url;

    }


    /* OTHER FILE TYPES */

    else {

      win.close();


      const link =
        document.createElement(
          "a"
        );


      link.href =
        url;


      link.download =
        a.name ||
        "attachment";


      document.body
        .appendChild(
          link
        );


      link.click();


      link.remove();

    }


    setTimeout(
      () => {

        URL.revokeObjectURL(
          url
        );

      },
      60000
    );


  } catch (err) {

    win.document.open();


    win.document.write(`
      <html>

        <body style="
          font-family: Arial, sans-serif;
          padding: 30px;
        ">

          <h3>
            Could not open attachment
          </h3>

          <p>
            ${esc(err.message)}
          </p>

        </body>

      </html>
    `);


    win.document.close();

  }
}


/* =========================================================
   ESCAPING
   ========================================================= */

function esc(s = "") {

  return String(s)
    .replace(
      /[&<>"']/g,
      c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[c])
    );
}


function escAttr(s = "") {

  return esc(s);
}
