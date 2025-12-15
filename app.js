document.addEventListener("DOMContentLoaded", () => {

// ====== GOOGLE SHEET SYNC CONFIG ======
const SHEET_WEBAPP_URL = "https://script.google.com/macros/s/AKfycbwQs6-8Gf7Q5QXRB_99CjyzP469OkIVdrVANEACRnGwdBwqi1M2WjNjITgveVo-DmmWcg/exec";
const SHEET_TOKEN = "haivo2002-thaovy";

// ===== Storage =====
const KEY = "kiosk_parts_v9";
const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
const save = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));

// Quote qty storage
const QKEY = "kiosk_quote_qty_v1";
let quoteQtyById = (()=>{ try{ return JSON.parse(localStorage.getItem(QKEY) || "{}"); }catch{ return {}; } })();
const saveQuoteQty_ = ()=> localStorage.setItem(QKEY, JSON.stringify(quoteQtyById));

// ===== State =====
let items = load();
let editingImageDataUrl = null;
let activeType = "";
let activeBrand = "";
let selectedIds = new Set();
let moveTargetId = null;
let detailTargetId = null;

// ===== Safe get element (ANTI-CRASH) =====
const $ = (id) => document.getElementById(id);

// ===== Elements =====
const elList = $("list");
const elStats = $("stats");
const elTypeButtons = $("typeButtons");
const elBrandButtons = $("brandButtons");
const elPrintArea = $("printArea");

const elForm = $("formPart");
const elId = $("id");
const elIdView = $("idView");
const elOem = $("oem");
const elOemAlt = $("oemAlt");
const elName = $("name");
const elBrand = $("brand");
const elType = $("type");
const elPrice = $("price");
const elQty = $("qty");
const elNote = $("note");

const elImage = $("image");
const elPreviewImg = $("previewImg");
const elPreviewEmpty = $("previewEmpty");

const elQ = $("q");
const btnClear = $("btnClear");
const btnReset = $("btnReset");
const btnClearSelect = $("btnClearSelect");
const btnPrintQuote = $("btnPrintQuote");
const btnSyncMoves = $("btnSyncMoves");
const btnClearSearch = $("btnClearSearch");

const btnExportInv = $("btnExportInv");
const btnExportMoves = $("btnExportMoves");
const btnExportJson = $("btnExportJson");
const fileImport = $("fileImport");

// Detail (may be null if user removed dialog)
const dlgDetail = $("dlgDetail");
const dTitle = $("dTitle");
const dImg = $("dImg");
const dImgEmpty = $("dImgEmpty");
const dId = $("dId");
const dOem = $("dOem");
const dOemAlt = $("dOemAlt");
const dName = $("dName");
const dBrand = $("dBrand");
const dType = $("dType");
const dPrice = $("dPrice");
const dQty = $("dQty");
const dNote = $("dNote");
const dMoves = $("dMoves");
const btnPrintSingle = $("btnPrintSingle");
const btnMoveFromDetail = $("btnMoveFromDetail");
const btnAltFromDetail = $("btnAltFromDetail");

// Alternatives dialog
const dlgAlt = $("dlgAlt");
const altTitle = $("altTitle");
const altSub = $("altSub");
const altList = $("altList");

// Move dialog
const dlgMove = $("dlgMove");
const dlgTitle = $("dlgTitle");
const dlgSub = $("dlgSub");
const moveKind = $("moveKind");
const moveQty = $("moveQty");
const moveNote = $("moveNote");
const btnDoMove = $("btnDoMove");

// ===== Helpers =====
function money(v){ return Number(v||0).toLocaleString("vi-VN")+"₫"; }

function fmtDate(ts){
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2,"0");
  const mi = String(d.getMinutes()).padStart(2,"0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

function makeId(){
  const d=new Date();
  const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  const rnd=Math.random().toString(36).slice(2,6).toUpperCase();
  return `PT-${y}${m}${day}-${rnd}`;
}

function norm(s){ return (s||"").toString().trim().toLowerCase(); }
function uniqueTypes(arr){ return [...new Set(arr.map(x=>x.type).filter(Boolean))].sort((a,b)=>a.localeCompare(b)); }
function uniqueBrands(arr){ return [...new Set(arr.map(x=>x.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b)); }

// OEM alternate helpers
function normalizeOem(s){ return (s||"").toString().trim().toUpperCase(); }
function parseAltOems(raw){
  return (raw || "").split(",").map(s => s.trim()).filter(Boolean).map(normalizeOem);
}
function buildOemSet(item){
  const set = new Set();
  set.add(normalizeOem(item.oem));
  for(const x of (item.oemAlt || [])) set.add(normalizeOem(x));
  return set;
}

function setPreview(dataUrl){
  if(!elPreviewImg || !elPreviewEmpty) return;
  if(dataUrl){
    elPreviewImg.src=dataUrl;
    elPreviewImg.style.display="block";
    elPreviewEmpty.style.display="none";
  }else{
    elPreviewImg.removeAttribute("src");
    elPreviewImg.style.display="none";
    elPreviewEmpty.style.display="block";
  }
}
function setDetailImage(dataUrl){
  if(!dImg || !dImgEmpty) return;
  if(dataUrl){
    dImg.src=dataUrl; dImg.style.display="block"; dImgEmpty.style.display="none";
  }else{
    dImg.removeAttribute("src"); dImg.style.display="none"; dImgEmpty.style.display="block";
  }
}

// CSV
function toCsv(rows){
  const esc=(v)=>`"${(v??"").toString().replaceAll('"','""')}"`;
  return rows.map(r=>r.map(esc).join(",")).join("\n");
}
function downloadText(filename, text, mime="text/plain"){
  const blob=new Blob([text],{type:mime});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

// Quote qty
function getQuoteQty(id){
  const n = Number(quoteQtyById[id] ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}
function setQuoteQty(id, qty){
  const n = Number(qty);
  quoteQtyById[id] = (Number.isFinite(n) && n > 0) ? Math.floor(n) : 1;
  saveQuoteQty_();
}

// ===== Form reset =====
function clearForm(){
  if(!elIdView) return;
  elId.value=""; elIdView.value="Tự tạo";
  elOem.value=""; elOemAlt.value="";
  elName.value=""; elBrand.value=""; elType.value="";
  elPrice.value=""; elQty.value=""; elNote.value="";
  if(elImage) elImage.value="";
  editingImageDataUrl=null;
  setPreview(null);
  const btnSave = $("btnSave");
  if(btnSave) btnSave.textContent="Lưu phụ tùng";
}

// ===== Filter buttons =====
function renderTypeButtons(){
  if(!elTypeButtons) return;
  const types=uniqueTypes(items);
  const allCount=items.length;
  const btnAll=`<button class="typebtn ${activeType===""?"active":""}" onclick="setType('')">Tất cả loại <small>${allCount} mặt hàng</small></button>`;
  const btns=types.map(t=>{
    const c=items.filter(x=>x.type===t).length;
    const safe=t.replaceAll("'","&#39;");
    return `<button class="typebtn ${activeType===t?"active":""}" onclick="setType('${safe}')">${t} <small>${c} món</small></button>`;
  }).join("");
  elTypeButtons.innerHTML=btnAll+btns;
}
window.setType=(t)=>{ activeType=t; render(); };

function renderBrandButtons(){
  if(!elBrandButtons) return;
  const brands=uniqueBrands(items);
  const allCount=items.length;
  const btnAll=`<button class="typebtn ${activeBrand===""?"active":""}" onclick="setBrand('')">Tất cả thương hiệu <small>${allCount} mặt hàng</small></button>`;
  const btns=brands.map(b=>{
    const c=items.filter(x=>x.brand===b).length;
    const safe=b.replaceAll("'","&#39;");
    return `<button class="typebtn ${activeBrand===b?"active":""}" onclick="setBrand('${safe}')">${b} <small>${c} món</small></button>`;
  }).join("");
  elBrandButtons.innerHTML=btnAll+btns;
}
window.setBrand=(b)=>{ activeBrand=b; render(); };

// ===== Render =====
function render(){
  renderTypeButtons();
  renderBrandButtons();

  const q=elQ ? norm(elQ.value) : "";

  const filtered=items
    .filter(it=>!activeType || it.type===activeType)
    .filter(it=>!activeBrand || it.brand===activeBrand)
    .filter(it=>{
      if(!q) return true;
      const hay = `${it.id} ${it.oem} ${(it.oemAlt||[]).join(" ")} ${it.name} ${it.brand} ${it.type} ${it.note}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a,b)=> (a.name||"").localeCompare(b.name||""));

  if(elStats){
    const totalSku=items.length;
    const totalQty=items.reduce((s,it)=> s+Number(it.qty||0),0);
    const totalValue=items.reduce((s,it)=> s+Number(it.qty||0)*Number(it.price||0),0);

    elStats.innerHTML=`
      <div class="stat"><div class="k">Tổng mặt hàng</div><div class="v">${totalSku}</div></div>
      <div class="stat"><div class="k">Tổng số lượng tồn</div><div class="v">${totalQty}</div></div>
      <div class="stat"><div class="k">Giá trị tồn (ước tính)</div><div class="v">${money(totalValue)}</div></div>
    `;
  }

  if(!elList) return;

  elList.innerHTML = filtered.map(it=>{
    const checked=selectedIds.has(it.id)?"checked":"";
    const qqty = getQuoteQty(it.id);
    const altCount = (it.oemAlt||[]).length;
    const outOfStock = Number(it.qty||0) <= 0;

    return `
      <div class="card">
        <div class="img">
          <div class="selectbox">
            <input type="checkbox" ${checked} onchange="toggleSelect('${it.id}', this.checked)" />
            <span class="small">Chọn</span>
          </div>
          ${it.image ? `<img src="${it.image}" alt="img" />` : `<div class="small">Không có hình</div>`}
        </div>
        <div class="body">
          <div class="small">ID: <b>${it.id}</b></div>
          <div class="small">OEM: <b>${it.oem || "-"}</b> ${altCount ? `• <b>${altCount}</b> mã thay` : ""}</div>

          <h3 style="margin:6px 0 2px">${it.name || "-"}</h3>

          <div class="kv">
            <span class="tag">${it.brand || "Chưa hãng"}</span>
            <span class="tag">${it.type || "Chưa loại"}</span>
            <span class="tag">Tồn: <b>${Number(it.qty||0)}</b></span>
            <span class="tag price">${money(it.price||0)}</span>
          </div>

          <div class="small" style="margin-top:6px">${(it.note||"").slice(0,90)}${(it.note||"").length>90?"…":""}</div>

          <div class="row" style="margin-top:8px">
            <span class="small" style="font-weight:800">SL báo giá</span>
            <input
              type="number" min="1" step="1"
              style="width:110px"
              value="${qqty}"
              oninput="setQuoteQtyLive('${it.id}', this.value)"
            />
            <span class="small">=</span>
            <span class="small" style="font-weight:900">${money((Number(it.price||0))*qqty)}</span>
          </div>

          <div class="btns">
            <button class="btn ghost" onclick="openDetail('${it.id}')">Chi tiết</button>
            <button class="btn ghost" onclick="editItem('${it.id}')">Chỉnh sửa</button>
            <button class="btn ghost" onclick="openAlternatives('${it.id}')">${outOfStock ? "🔥 Thay thế" : "Thay thế"}</button>
            <button class="btn" onclick="openMove('${it.id}')">Nhập / Bán</button>
            <button class="btn danger" onclick="delItem('${it.id}')">Xoá</button>
          </div>
        </div>
      </div>
    `;
  }).join("") || `<div class="muted">Chưa có sản phẩm. Hãy thêm 1 món.</div>`;
}

window.toggleSelect=(id,isOn)=>{
  if(isOn) selectedIds.add(id);
  else selectedIds.delete(id);
};
window.setQuoteQtyLive=(id,val)=>{ setQuoteQty(id, val); };

// ===== Image upload (FIX PREVIEW) =====
if(elImage){
  elImage.addEventListener("change", ()=>{
    const file=elImage.files?.[0];
    if(!file){ editingImageDataUrl=null; setPreview(null); return; }

    const reader=new FileReader();
    reader.onload=()=>{
      editingImageDataUrl=reader.result;
      setPreview(editingImageDataUrl);
    };
    reader.readAsDataURL(file);
  });
}

// ===== Form submit =====
if(elForm){
  elForm.addEventListener("submit",(e)=>{
    e.preventDefault();

    const id=elId.value || makeId();
    const oem = normalizeOem(elOem.value);
    const oemAlt = parseAltOems(elOemAlt.value);

    const name=elName.value.trim();
    const brand=elBrand.value.trim();
    const type=elType.value.trim();
    const note=elNote.value.trim();
    const price=Number(elPrice.value||0);
    const qty=Number(elQty.value||0);

    if(!oem || !name||!brand||!type||!note){
      alert("Nhập đủ: OEM, Tên, Thương hiệu, Loại, Ghi chú.");
      return;
    }
    if(price<0||qty<0){ alert("Giá và số lượng phải >=0"); return; }

    const idx=items.findIndex(x=>x.id===id);
    const old=idx>=0?items[idx]:null;

    const payload={
      id, oem, oemAlt,
      name, brand, type, note,
      price, qty,
      image: editingImageDataUrl || old?.image || null,
      createdAt: old?.createdAt || Date.now(),
      updatedAt: Date.now(),
      moves: old?.moves || []
    };

    if(idx>=0) items[idx]=payload; else items.push(payload);

    save(items);
    if(!quoteQtyById[id]) setQuoteQty(id, 1);

    clearForm();
    render();
  });
}

// ===== Buttons =====
if(btnClear) btnClear.addEventListener("click", ()=>{ clearForm(); window.scrollTo({top:0,behavior:"smooth"}); });
if(btnClearSelect) btnClearSelect.addEventListener("click", ()=>{ selectedIds=new Set(); render(); });
if(btnClearSearch) btnClearSearch.addEventListener("click", ()=>{ if(elQ) elQ.value=""; render(); });
if(elQ) elQ.addEventListener("input", render);

// ===== CRUD =====
window.editItem=(id)=>{
  const it=items.find(x=>x.id===id); if(!it) return;

  elId.value=it.id; elIdView.value=it.id;
  elOem.value=it.oem||"";
  elOemAlt.value=(it.oemAlt||[]).join(", ");

  elName.value=it.name||"";
  elBrand.value=it.brand||"";
  elType.value=it.type||"";
  elPrice.value=it.price??0;
  elQty.value=it.qty??0;
  elNote.value=it.note||"";

  editingImageDataUrl=it.image||null;
  if(elImage) elImage.value="";
  setPreview(editingImageDataUrl);

  const btnSave = $("btnSave");
  if(btnSave) btnSave.textContent="Cập nhật";
  window.scrollTo({top:0,behavior:"smooth"});
};

window.delItem=(id)=>{
  const it=items.find(x=>x.id===id); if(!it) return;
  const ok=confirm(`Xoá phụ tùng:\n${it.name}\nID: ${it.id}\nOEM: ${it.oem} ?`);
  if(!ok) return;

  items=items.filter(x=>x.id!==id);
  selectedIds.delete(id);
  delete quoteQtyById[id]; saveQuoteQty_();

  save(items);
  render();
};

// ===== Detail =====
window.openDetail=(id)=>{
  const it=items.find(x=>x.id===id); if(!it) return;
  detailTargetId=id;

  if(!dlgDetail){ alert("Thiếu dialog Chi tiết trong index.html"); return; }

  dTitle.textContent=`Chi tiết: ${it.name}`;
  dId.textContent=it.id;
  dOem.textContent=it.oem||"-";
  dOemAlt.textContent=(it.oemAlt && it.oemAlt.length) ? it.oemAlt.join(", ") : "-";

  dName.textContent=it.name||"-";
  dBrand.textContent=it.brand||"-";
  dType.textContent=it.type||"-";
  dPrice.textContent=money(it.price||0);
  dQty.textContent=String(it.qty??0);
  dNote.textContent=it.note||"-";

  setDetailImage(it.image);

  const moves=(it.moves||[]).slice(0,120);
  dMoves.innerHTML=moves.length?moves.map(m=>{
    const sign=m.kind==="in"?"+":"-";
    const title=m.kind==="in"?"NHẬP HÀNG":"XUẤT (BÁN)";
    return `<div class="move"><div class="t">${title} ${sign}${m.qty}</div><div class="m">${fmtDate(m.at)}${m.note?" • "+m.note:""}</div></div>`;
  }).join(""):`<div class="muted">Chưa có lịch sử.</div>`;

  dlgDetail.showModal();
};

if(btnMoveFromDetail){
  btnMoveFromDetail.addEventListener("click", ()=>{
    if(!detailTargetId) return;
    dlgDetail.close();
    openMove(detailTargetId);
  });
}

if(btnAltFromDetail){
  btnAltFromDetail.addEventListener("click", ()=>{
    if(!detailTargetId) return;
    openAlternatives(detailTargetId);
  });
}

// ===== Move =====
window.openMove=(id)=>{
  const it=items.find(x=>x.id===id); if(!it) return;
  moveTargetId=id;

  if(!dlgMove){ alert("Thiếu dialog Nhập/Bán trong index.html"); return; }

  dlgTitle.textContent=`Nhập/Bán: ${it.name}`;
  dlgSub.textContent=`ID: ${it.id} • OEM: ${it.oem} • Tồn hiện tại: ${it.qty}`;
  moveKind.value="in"; moveQty.value=1; moveNote.value="";
  dlgMove.showModal();
};

if(btnDoMove){
  btnDoMove.addEventListener("click",(e)=>{
    const it=items.find(x=>x.id===moveTargetId); if(!it) return;

    const kind=moveKind.value;
    const q=Number(moveQty.value||0);
    const note=moveNote.value.trim();

    if(q<=0){ alert("Số lượng phải >=1"); e.preventDefault(); return; }

    const current=Number(it.qty||0);
    const next=kind==="in"?current+q:current-q;

    if(kind==="out" && next<0){ alert("Không đủ tồn kho!"); e.preventDefault(); return; }

    it.qty=next;
    it.updatedAt=Date.now();
    it.moves=it.moves||[];
    it.moves.unshift({ at: Date.now(), kind, qty: q, note });

    save(items);
    render();

    if(detailTargetId===it.id && dlgDetail?.open) openDetail(it.id);
  });
}

// ===== Alternatives popup (FIX: hiển thị ảnh nếu có, không bắt buộc) =====
window.openAlternatives = function(id){
  const base = items.find(x => x.id === id);
  if(!base) return;

  if(!dlgAlt || !altList){ alert("Thiếu dialog Thay thế trong index.html"); return; }

  const baseSet = buildOemSet(base);

  const alts = items
    .filter(x => x.id !== base.id)
    .map(x => ({ item: x, set: buildOemSet(x) }))
    .filter(x => {
      for(const k of x.set) if(baseSet.has(k)) return true;
      return false;
    })
    .map(x => x.item)
    .sort((a,b) => Number(b.qty||0) - Number(a.qty||0));

  altTitle.textContent = `Gợi ý thay thế: ${base.name}`;
  altSub.textContent = `OEM: ${base.oem} • OEM thay thế: ${(base.oemAlt||[]).join(", ") || "-"} • Tồn: ${base.qty}`;

  if(alts.length === 0){
    altList.innerHTML = `<div class="muted">Không có sản phẩm thay thế theo OEM tương đương.</div>`;
    dlgAlt.showModal();
    return;
  }

  altList.innerHTML = alts.slice(0, 24).map(it=>{
    const checked=selectedIds.has(it.id)?"checked":"";
    const qqty = getQuoteQty(it.id);
    const altCount = (it.oemAlt||[]).length;

    return `
      <div class="card">
        <div class="img">
          <div class="selectbox">
            <input type="checkbox" ${checked} onchange="toggleSelect('${it.id}', this.checked)" />
            <span class="small">Chọn</span>
          </div>
          ${it.image ? `<img src="${it.image}" alt="img"
