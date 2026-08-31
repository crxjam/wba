const API_URL="https://script.google.com/macros/s/AKfycbxQbrgEhVoGG8-V3tl6wZCAIgFewtix985ijIN-mrnVHlgsZnVSOtqLlGnY4pgAu31t/exec";
let sessionToken=sessionStorage.getItem("clh_session")||"";
let currentUser=null;
let currentCaseId=null;
let selectedFile=null;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

async function api(action,payload={}){
  const res=await fetch(API_URL,{
    method:"POST",
    headers:{"Content-Type":"text/plain;charset=utf-8"},
    body:JSON.stringify({action,sessionToken,...payload})
  });
  const data=await res.json();
  if(!data.success) throw new Error(data.error||"Request failed");
  return data;
}

function showApp(){
  $("#loginView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  $("#logoutBtn").classList.remove("hidden");
  $("#whoami").textContent=`${currentUser.displayName} · ${currentUser.role}`;
  if(currentUser.role==="consultant"){
    $$(".registrar-only").forEach(x=>x.classList.add("hidden"));
    $("#libraryTitle").textContent="All submitted cases";
  }else{
    $$(".registrar-only").forEach(x=>x.classList.remove("hidden"));
    $("#libraryTitle").textContent="My cases";
  }
  loadCases();
}

function showLogin(){
  $("#loginView").classList.remove("hidden");
  $("#appView").classList.add("hidden");
  $("#logoutBtn").classList.add("hidden");
}

$("#loginForm").addEventListener("submit",async e=>{
  e.preventDefault(); $("#loginStatus").textContent="Signing in…";
  try{
    const d=await api("login",{username:$("#username").value.trim(),password:$("#password").value});
    sessionToken=d.sessionToken; currentUser=d.user;
    sessionStorage.setItem("clh_session",sessionToken);
    $("#loginStatus").textContent="";
    showApp();
  }catch(err){$("#loginStatus").textContent=err.message}
});

$("#logoutBtn").addEventListener("click",async()=>{
  try{await api("logout")}catch(_){}
  sessionStorage.removeItem("clh_session");sessionToken="";currentUser=null;showLogin();
});

$$(".tab").forEach(t=>t.addEventListener("click",()=>{
  $$(".tab").forEach(x=>x.classList.remove("active"));
  $$(".view").forEach(x=>x.classList.remove("active"));
  t.classList.add("active");$(`#view-${t.dataset.view}`).classList.add("active");
}));

$("#refreshBtn").addEventListener("click",loadCases);

async function loadCases(){
  $("#caseList").innerHTML=`<div class="empty">Loading…</div>`;
  try{
    const d=await api("listCases");
    if(!d.cases.length){$("#caseList").innerHTML=`<div class="empty">No cases yet.</div>`;return}
    $("#caseList").innerHTML=d.cases.map(c=>`
      <article class="case-card" data-id="${esc(c.id)}">
        <h3>${esc(c.title)}</h3>
        <div class="meta">${esc(c.specialty)} · ${esc(c.ownerDisplayName)} · ${new Date(c.createdAt).toLocaleString()}</div>
        <span class="pill">${c.commentCount||0} response${(c.commentCount||0)===1?"":"s"}</span>
      </article>`).join("");
    $$(".case-card").forEach(c=>c.addEventListener("click",()=>openCase(c.dataset.id)));
  }catch(err){
    if(/session/i.test(err.message)){showLogin()}
    $("#caseList").innerHTML=`<div class="empty">${esc(err.message)}</div>`;
  }
}

$("#cameraBtn").addEventListener("click",()=>$("#cameraInput").click());
$("#attachment").addEventListener("change",e=>selectFile(e.target.files[0]));
$("#cameraInput").addEventListener("change",e=>selectFile(e.target.files[0]));

function selectFile(file){
  selectedFile=file||null;
  $("#fileName").textContent=selectedFile?selectedFile.name:"";
}

function fileToBase64(file){
  return new Promise((resolve,reject)=>{
    const r=new FileReader();
    r.onload=()=>resolve(String(r.result).split(",")[1]);
    r.onerror=reject;r.readAsDataURL(file);
  });
}

$("#caseForm").addEventListener("submit",async e=>{
  e.preventDefault();$("#submitStatus").textContent="Submitting…";
  try{
    let attachment=null;
    if(selectedFile){
      if(selectedFile.size>8*1024*1024) throw new Error("Attachment is too large. Maximum 8 MB.");
      attachment={name:selectedFile.name,type:selectedFile.type||"application/octet-stream",base64:await fileToBase64(selectedFile)};
    }
    await api("createCase",{
      title:$("#title").value.trim(),
      specialty:$("#specialty").value,
      summary:$("#summary").value.trim(),
      results:$("#results").value.trim(),
      learningPoint:$("#learningPoint").value.trim(),
      discussion:$("#discussion").value.trim(),
      attachment
    });
    e.target.reset();selectedFile=null;$("#fileName").textContent="";
    $("#submitStatus").textContent="Case submitted.";
    document.querySelector('.tab[data-view="cases"]').click();loadCases();
  }catch(err){$("#submitStatus").textContent=err.message}
});

async function openCase(id){
  try{
    const d=await api("getCase",{caseId:id});currentCaseId=id;
    const c=d.case;
    $("#dialogTitle").textContent=c.title;
    $("#dialogBody").innerHTML=`
      <div class="meta">${esc(c.specialty)} · submitted by ${esc(c.ownerDisplayName)} · ${new Date(c.createdAt).toLocaleString()}</div>
      ${detail("Clinical summary",c.summary)}
      ${c.results?detail("Key results / findings",c.results):""}
      ${detail("Learning point",c.learningPoint)}
      ${c.discussion?detail("Discussion",c.discussion):""}
      ${c.attachmentFileId ? `
        <div class="detail">
          <h4>Attachment</h4>
          <button
            type="button"
            class="secondary"
            onclick="openAttachment('${escAttr(c.id)}')">
            Open ${esc(c.attachmentName || "attachment")}
          </button>
        </div>
      ` : ""}
    `;
    renderComments(d.comments);
    $("#caseDialog").showModal();
  }catch(err){alert(err.message)}
}

function detail(h,v){return `<div class="detail"><h4>${h}</h4><p>${esc(v||"")}</p></div>`}
function renderComments(comments){
  $("#commentList").innerHTML=comments.length?comments.map(x=>`
    <div class="comment"><div class="comment-head">${esc(x.authorDisplayName)} · ${esc(x.authorRole)} · ${new Date(x.createdAt).toLocaleString()}</div><p>${esc(x.text)}</p></div>
  `).join(""):`<p class="muted">No responses yet.</p>`;
}
$("#closeDialog").addEventListener("click",()=>$("#caseDialog").close());
$("#commentForm").addEventListener("submit",async e=>{
  e.preventDefault();$("#commentStatus").textContent="Posting…";
  try{
    const d=await api("addComment",{caseId:currentCaseId,text:$("#commentText").value.trim()});
    $("#commentText").value="";$("#commentStatus").textContent="";
    renderComments(d.comments);loadCases();
  }catch(err){$("#commentStatus").textContent=err.message}
});

function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function escAttr(s=""){return esc(s)}

(async function restore(){
  if(!sessionToken){showLogin();return}
  try{
    const d=await api("me");currentUser=d.user;showApp();
  }catch(_){sessionStorage.removeItem("clh_session");sessionToken="";showLogin()}
})();


async function openAttachment(caseId) {

  // Open the tab immediately while still directly triggered by the click
  const win = window.open("", "_blank");

  if (!win) {
    alert("Your browser blocked the attachment window. Please allow pop-ups for Case Learning Hub.");
    return;
  }

  // Show something while the file loads
  win.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Loading attachment...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
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

    const d = await api("getAttachment", { caseId });

    const a = d.attachment;

    const binary = atob(a.base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const mimeType = a.mimeType || "application/octet-stream";

    const blob = new Blob(
      [bytes],
      { type: mimeType }
    );

    const url = URL.createObjectURL(blob);


    // IMAGE
    if (mimeType.startsWith("image/")) {

      win.document.open();

      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${esc(a.name || "Case attachment")}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">

            <style>
              body {
                margin: 0;
                background: #111;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
              }

              img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
              }
            </style>

          </head>

          <body>
            <img src="${url}" alt="Case attachment">
          </body>

        </html>
      `);

      win.document.close();
    }


    // PDF
    else if (mimeType === "application/pdf") {

      win.location.href = url;

    }


    // OTHER FILES
    else {

      win.close();

      const link = document.createElement("a");

      link.href = url;
      link.download = a.name || "attachment";

      document.body.appendChild(link);
      link.click();
      link.remove();

    }


    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 60000);


  } catch (err) {

    win.document.open();

    win.document.write(`
      <html>
        <body style="
          font-family: Arial, sans-serif;
          padding: 30px;
        ">
          <h3>Could not open attachment</h3>
          <p>${esc(err.message)}</p>
        </body>
      </html>
    `);

    win.document.close();

  }
}
