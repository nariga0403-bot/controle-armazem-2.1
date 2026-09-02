const $=s=>document.querySelector(s);
let containers=[], responsibles=[], pending=JSON.parse(localStorage.getItem("pendingSync")||"[]");

function savePending(){localStorage.setItem("pendingSync",JSON.stringify(pending))}
function fmtDate(iso){
  if(!iso)return "—";
  const d=new Date(iso);
  return new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short"}).format(d);
}
function nowParts(){
  const d=new Date();
  const p=n=>String(n).padStart(2,"0");
  return {date:`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`,time:`${p(d.getHours())}:${p(d.getMinutes())}`};
}
function setConnection(){
  const online=navigator.onLine;
  $("#connection").textContent=online?"● Online":"● Offline";
  $("#connection").className="badge "+(online?"online":"offline");
  $("#offlineNote").classList.toggle("hidden",online);
}
window.addEventListener("online",async()=>{setConnection();await syncPending();await load()});
window.addEventListener("offline",setConnection);

async function api(url,opt={}){
  const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opt});
  if(!r.ok) throw new Error((await r.json()).error||"Erro");
  return r.json();
}
async function load(){
  try{
    [containers,responsibles]=await Promise.all([api("/api/containers"),api("/api/responsibles")]);
    localStorage.setItem("cacheContainers",JSON.stringify(containers));
    localStorage.setItem("cacheResponsibles",JSON.stringify(responsibles));
    render();
  }catch{
    containers=JSON.parse(localStorage.getItem("cacheContainers")||"[]");
    responsibles=JSON.parse(localStorage.getItem("cacheResponsibles")||"[]");
    render(); setConnection();
  }
}
function render(){
  $("#total").textContent=containers.length;
  $("#running").textContent=containers.filter(x=>x.status!=="Finalizado").length;
  $("#finished").textContent=containers.filter(x=>x.status==="Finalizado").length;
  $("#responsible").innerHTML=responsibles.map(r=>`<option value="${esc(r.name)}">${esc(r.name)}</option>`).join("");
  renderLists();
}
function renderLists(){
  const q=$("#search").value.toLowerCase();
  const run=containers.filter(x=>x.status!=="Finalizado" && JSON.stringify(x).toLowerCase().includes(q));
  const fin=containers.filter(x=>x.status==="Finalizado");
  $("#runningList").innerHTML=run.length?run.map(x=>card(x,true)).join(""):"<p class='meta'>Nenhum contêiner em andamento.</p>";
  $("#finishedList").innerHTML=fin.length?fin.map(x=>card(x,false)).join(""):"<p class='meta'>Nenhum contêiner finalizado.</p>";
}
function card(x,running){
 return `<div class="item">
  <div><b>${esc(x.number)}</b><div class="meta">Área: ${esc(x.area)} · Responsável: ${esc(x.responsible)}</div>
  <div class="meta">${running?"Cadastrado: "+fmtDate(x.created_at):"Finalizado: "+fmtDate(x.finished_at)}</div></div>
  <div class="actions">${running?`<button class="success" onclick="finish(${x.id})">✓ Finalizar</button>`:`<button class="edit" onclick="editFinished(${x.id})">✏ Editar</button>`}<button class="danger" onclick="removeItem(${x.id})">Excluir</button></div>
 </div>`;
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

$("#containerForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const payload={number:$("#number").value,area:$("#area").value,responsible:$("#responsible").value,created_at:new Date().toISOString()};
 try{const x=await api("/api/containers",{method:"POST",body:JSON.stringify(payload)});containers.unshift(x)}
 catch{const x={id:"local-"+Date.now(),...payload,status:"Em andamento"};containers.unshift(x);pending.push({method:"POST",url:"/api/containers",body:payload});savePending();alert("Sem internet: salvo neste aparelho e será sincronizado.");}
 e.target.reset();render();setConnection();
});

async function finish(id){
 const x=containers.find(c=>c.id===id), p=nowParts();
 const finished_at=`${p.date}T${p.time}:00`;
 try{const y=await api(`/api/containers/${id}`,{method:"PUT",body:JSON.stringify({status:"Finalizado",finished_at})});Object.assign(x,y)}
 catch{Object.assign(x,{status:"Finalizado",finished_at});pending.push({method:"PUT",url:`/api/containers/${id}`,body:{status:"Finalizado",finished_at}});savePending();alert("Finalização salva neste aparelho.")}
 render();
}
function editFinished(id){
 const x=containers.find(c=>c.id===id), d=new Date(x.finished_at), p=n=>String(n).padStart(2,"0");
 $("#editId").value=id; $("#editDate").value=`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; $("#editTime").value=`${p(d.getHours())}:${p(d.getMinutes())}`;
 $("#editResponsible").innerHTML=responsibles.map(r=>`<option ${r.name===x.responsible?"selected":""} value="${esc(r.name)}">${esc(r.name)}</option>`).join("");
 $("#editModal").classList.remove("hidden");
}
$("#editForm").addEventListener("submit",async e=>{
 e.preventDefault();const id=$("#editId").value,x=containers.find(c=>String(c.id)===String(id));
 const finished_at=`${$("#editDate").value}T${$("#editTime").value}:00`, responsible=$("#editResponsible").value;
 try{const y=await api(`/api/containers/${id}`,{method:"PUT",body:JSON.stringify({responsible,finished_at})});Object.assign(x,y)}
 catch{Object.assign(x,{responsible,finished_at});pending.push({method:"PUT",url:`/api/containers/${id}`,body:{responsible,finished_at}});savePending();alert("Alteração salva localmente.")}
 $("#editModal").classList.add("hidden");render();
});
async function removeItem(id){
 if(!confirm("Excluir este registro?"))return;
 try{await api(`/api/containers/${id}`,{method:"DELETE"})}catch{alert("Não foi possível excluir sem internet.");return}
 containers=containers.filter(x=>x.id!==id);render();
}
$("#search").addEventListener("input",renderLists);
$("#manageBtn").onclick=()=>{$("#modal").classList.remove("hidden");renderResp()};
$("#closeModal").onclick=()=>$("#modal").classList.add("hidden");
$("#closeEdit").onclick=()=>$("#editModal").classList.add("hidden");

function renderResp(){
 $("#respList").innerHTML=responsibles.map(r=>`<div class="resp-row"><input value="${esc(r.name)}" data-id="${r.id}"><button onclick="renameResp(${r.id},this)">Salvar</button><button class="danger" onclick="deleteResp(${r.id})">Excluir</button></div>`).join("");
}
$("#respForm").addEventListener("submit",async e=>{
 e.preventDefault();const name=$("#respName").value.trim();if(!name)return;
 try{const r=await api("/api/responsibles",{method:"POST",body:JSON.stringify({name})});responsibles.push(r);$("#respName").value="";renderResp();render()}
 catch(err){alert(err.message)}
});
async function renameResp(id,btn){
 const input=btn.parentElement.querySelector("input"),name=input.value.trim();if(!name)return;
 try{const r=await api(`/api/responsibles/${id}`,{method:"PUT",body:JSON.stringify({name})});const old=responsibles.find(x=>x.id===id);old.name=r.name;renderResp();render()}catch(err){alert(err.message)}
}
async function deleteResp(id){
 if(!confirm("Remover este responsável da lista?"))return;
 try{await api(`/api/responsibles/${id}`,{method:"DELETE"});responsibles=responsibles.filter(x=>x.id!==id);renderResp();render()}catch(err){alert(err.message)}
}
async function syncPending(){
 if(!navigator.onLine||!pending.length)return;
 const queue=[...pending];pending=[];savePending();
 for(const item of queue){
  try{
   if(item.url.includes("local-")){
    const created=await api("/api/containers",{method:"POST",body:JSON.stringify(item.body)});
    const local=containers.find(x=>x.id===item.url.split("/").pop());
    if(local) Object.assign(local,created);
   }else await api(item.url,{method:item.method,body:JSON.stringify(item.body)});
  }catch{pending.push(item)}
 }
 savePending();
}
setConnection();load();