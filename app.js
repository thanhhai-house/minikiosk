// ===== Storage =====
const KEY = "kiosk_parts_v3";
const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
const save = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));

// ===== State =====
let items = load();
let editingImageDataUrl = null;
let activeType = "";
let activeBrand = "";
let selectedIds = new Set();
let moveTargetId = null;
let detailTargetId = null;

// ===== Elements =====
const elList = document.getElementById("list");
const elStats = document.getElementById("stats");
const elTypeButtons = document.getElementById("typeButtons");
const elBrandButtons = document.getElementById("brandButtons");
const elPrintArea = document.getElementById("printArea");

const elForm = document.getElementById("formPart");
const elId = document.getElementById("id");
const elIdView = document.getElementById("idView");
const elOem = document.getElementById("oem");
const elName = document.getElementById("name");
const elBrand = document.getElementById("brand");
const elType = document.getElementById("type");
const elPrice = document.getElementById("price");
const elQty = document.getElementById("qty");
const elImage = document.getElementById("image");
const elPreviewImg = document.getElementById("previewImg");
const elPreviewEmpty = document.getElementById("previewEmpty");

const elQ = document.getElementById("q");
const btnClear = document.getElementById("btnClear");
const btnReset = document.getElementById("btnReset");
const btnClearSelect = document.getElementById("btnClearSelect");
const btnPrintQuote = document.getElementById("btnPrintQuote");

const btnExportInv = document.getElementById("btnExportInv");
const btnExportMoves = document.getElementById("btnExportMoves");
const btnExportJson = document.getElementById("btnExportJson");
const fileImport = document.getElementById("fileImport");

// Dialog detail
const dlgDetail = document.getElementById("dlgDetail");
const dTitle = document.getElementById("dTitle");
const dImg = document.getElementById("dImg");
const dImgEmpty = document.getElementById("dImgEmpty");
const dId = document.getElementById("dId");
const dOem = document.getElementById("dOem");
const dName = document.getElementById("dName");
const dBrand = document.getElementById("dBrand");
const dType = document.getElementById("dType");
const dPrice = document.getElementById("dPrice");
const dQty = document.getElementById("dQty");
const dMoves = document.getElementById("dMoves");
const btnPrintSingle = document.getElementById("btnPrintSingle");
const btnMoveFromDetail = document.getElementById("btnMoveFromDetail");

// Dialog move
const dlgMove = document.getElementById("dlgMove");
const dlgTitle = document.getElementById("dlgTitle");
const dlgSub = document.getElementById("dlgSub");
const moveKind = document.getElementById("moveKind");
const moveQty = document.getElementById("moveQty");
const moveNote = document.getElementById("moveNote");
const btnDoMove = document.getElementById("btnDoMove");

// ===== Helpers =====
function money(v){
  const n = Number(v || 0);
  return n.toLocaleString("vi-VN") + "₫";
}
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
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const day = String(d.getDate()).padStart(2,"0");
  const rnd = Math.random().toString(36).slice(2,6).toUpperCase();
  return `PT-${y}${m}${day}-${rnd}`;
}
function norm(s){ return (s || "").toString().trim().toLowerCase(); }

function uniqueTypes(arr){
  return [...new Set(arr.map(x => x.type).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}
function uniqueBrands(arr){
  return [...new Set(arr.map(x => x.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
}

function setPreview(dataUrl){
  if(dataUrl){
    elPreviewImg.src = dataUrl;
    elPreviewImg.style.display = "block";
    elPreviewEmpty.style.display = "none";
  }else{
    elPreviewImg.removeAttribute("src");
    elPreviewImg.style.display = "none";
    elPreviewEmpty.style.display = "block";
  }
}
function setDetailImage(dataUrl){
  if(dataUrl){
    dImg.src = dataUrl;
    dImg.style.display = "block";
    dImgEmpty.style.display = "none";
  }else{
    dImg.removeAttribute("src");
    dImg.style.display = "none";
    dImgEmpty.style.display = "block";
  }
}

// CSV export (Google Sheets import)
function toCsv(rows){
  const esc = (v) => {
    const s = (v ?? "").toString().replaceAll('"','""');
    return `"${s}"`;
  };
  return rows.map(r => r.map(esc).join(",")).join("\n");
}
function downloadText(filename, text, mime="text/plain"){
  const blob = new Blob([text], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ===== Filter Buttons =====
function renderTypeButtons(){
  const types = uniqueTypes(items);
  const allCount = items.length;

  const btnAll = `
    <button class="typebtn ${activeType===""?"active":""}" onclick="setType('')">
      Tất cả loại <small>${allCount} mặt hàng</small>
    </button>
  `;
  const btns = types.map(t=>{
    const c = items.filter(x=>x.type===t).length;
    const safe = t.replaceAll("'","&#39;");
    return `
      <button class="typebtn ${activeType===t?"active":""}" onclick="setType('${safe}')">
        ${t} <small>${c} món</small>
      </button>
    `;
  }).join("");

  elTypeButtons.innerHTML = btnAll + btns;
}
window.setType = function(t){ activeType = t; render(); };

function renderBrandButtons(){
  const brands = uniqueBrands(items);
  const allCount = items.length;

  const btnAll = `
    <button class="typebtn ${activeBrand===""?"active":""}" onclick="setBrand('')">
      Tất cả thương hiệu <small>${allCount} mặt hàng</small>
    </button>
  `;
  const btns = brands.map(b=>{
    const c = items.filter(x=>x.brand===b).length;
    const safe = b.replaceAll("'","&#39;");
    return `
      <button class="typebtn ${activeBrand===b?"active":""}" onclick="setBrand('${safe}')">
        ${b} <small>${c} món</small>
      </button>
    `;
  }).join("");

  elBrandButtons.innerHTML = btnAll + btns;
}
window.setBrand = function(b){ activeBrand = b; render(); };

// ===== Render =====
function render(){
  renderTypeButtons();
  renderBrandButtons();

  const q = norm(elQ.value);

  const filtered = items
    .filter(it => !activeType || it.type === activeType)
    .filter(it => !activeBrand || it.brand === activeBrand)
    .filter(it => {
      if(!q) return true;
      const hay = `${it.id} ${it.oem} ${it.name} ${it.brand} ${it.type}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a,b)=> (a.name || "").localeCompare(b.name || ""));

  const totalSku = items.length;
  const totalQty = items.reduce((s,it)=> s + Number(it.qty||0), 0);
  const totalValue = items.reduce((s,it)=> s + Number(it.qty||0)*Number(it.price||0), 0);

  elStats.innerHTML = `
    <div class="stat"><div class="k">Tổng mặt hàng</div><div class="v">${totalSku}</div></div>
    <div class="stat"><div class="k">Tổng số lượng tồn</div><div class="v">${totalQty}</div></div>
    <div class="stat"><div class="k">Giá trị tồn (ước tính)</div><div class="v">${money(totalValue)}</div></div>
  `;

  elList.innerHTML = filtered.map(it => {
    const checked = selectedIds.has(it.id) ? "checked" : "";
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
          <div class="small">OEM: <b>${it.oem || "-"}</b></div>
          <h3 style="margin:6px 0 2px">${it.name || "-"}</h3>
          <div class="kv">
            <span class="tag">${it.brand || "Chưa hãng"}</span>
            <span class="tag">${it.type || "Chưa loại"}</span>
            <span class="tag">Tồn: <b>${Number(it.qty||0)}</b></span>
            <span class="tag price">${money(it.price||0)}</span>
          </div>

          <div class="btns">
            <button class="btn ghost" onclick="openDetail('${it.id}')">Chi tiết</button>
            <button class="btn ghost" onclick="editItem('${it.id}')">Chỉnh sửa</button>
            <button class="btn" onclick="openMove('${it.id}')">Nhập / Bán</button>
            <button class="btn danger" onclick="delItem('${it.id}')">Xoá</button>
          </div>
        </div>
      </div>
    `;
  }).join("") || `<div class="muted">Không có dữ liệu phù hợp.</div>`;
}

// ===== Select for Quote =====
window.toggleSelect = function(id, isOn){
  if(isOn) selectedIds.add(id);
  else selectedIds.delete(id);
};

// ===== Form =====
elImage.addEventListener("change", () => {
  const file = elImage.files?.[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    editingImageDataUrl = reader.result;
    setPreview(editingImageDataUrl);
  };
  reader.readAsDataURL(file);
});

function clearForm(){
  elId.value = "";
  elIdView.value = "Tự tạo";
  elOem.value = "";
  elName.value = "";
  elBrand.value = "";
  elType.value = "";
  elPrice.value = "";
  elQty.value = "";
  elImage.value = "";
  editingImageDataUrl = null;
  setPreview(null);
  document.getElementById("btnSave").textContent = "Lưu phụ tùng";
}
btnClear.addEventListener("click", clearForm);

elForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const id = elId.value || makeId();
  const oem = elOem.value.trim();
  const name = elName.value.trim();
  const brand = elBrand.value.trim();
  const type = elType.value.trim();
  const price = Number(elPrice.value || 0);
  const qty = Number(elQty.value || 0);

  if(!oem || !name || !brand || !type){
    alert("Vui lòng nhập đủ: OEM, Tên, Thương hiệu, Loại.");
    return;
  }
  if(price < 0 || qty < 0){
    alert("Giá và số lượng phải >= 0.");
    return;
  }

  const idx = items.findIndex(x => x.id === id);
  const old = idx >= 0 ? items[idx] : null;

  const payload = {
    id, oem, name, brand, type, price, qty,
    image: editingImageDataUrl || old?.image || null,
    createdAt: old?.createdAt || Date.now(),
    updatedAt: Date.now(),
    moves: old?.moves || []
  };

  if(idx >= 0) items[idx] = payload;
  else items.push(payload);

  save(items);
  clearForm();
  render();
});

// ===== CRUD =====
window.editItem = function(id){
  const it = items.find(x => x.id === id);
  if(!it) return;

  elId.value = it.id;
  elIdView.value = it.id;
  elOem.value = it.oem || "";
  elName.value = it.name || "";
  elBrand.value = it.brand || "";
  elType.value = it.type || "";
  elPrice.value = it.price ?? 0;
  elQty.value = it.qty ?? 0;

  editingImageDataUrl = it.image || null;
  elImage.value = "";
  setPreview(editingImageDataUrl);

  document.getElementById("btnSave").textContent = "Cập nhật";
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.delItem = function(id){
  const it = items.find(x => x.id === id);
  if(!it) return;
  const ok = confirm(`Xoá phụ tùng:\n${it.name}\nID: ${it.id}\nOEM: ${it.oem} ?`);
  if(!ok) return;
  items = items.filter(x => x.id !== id);
  selectedIds.delete(id);
  save(items);
  render();
};

// ===== Detail =====
window.openDetail = function(id){
  const it = items.find(x => x.id === id);
  if(!it) return;

  detailTargetId = id;
  dTitle.textContent = `Chi tiết: ${it.name}`;
  dId.textContent = it.id;
  dOem.textContent = it.oem || "-";
  dName.textContent = it.name || "-";
  dBrand.textContent = it.brand || "-";
  dType.textContent = it.type || "-";
  dPrice.textContent = money(it.price || 0);
  dQty.textContent = String(it.qty ?? 0);

  setDetailImage(it.image);

  const moves = (it.moves || []).slice(0, 80);
  dMoves.innerHTML = moves.length ? moves.map(m => {
    const sign = m.kind === "in" ? "+" : "-";
    const title = m.kind === "in" ? "NHẬP HÀNG" : "XUẤT (BÁN)";
    return `
      <div class="move">
        <div class="t">${title} ${sign}${m.qty}</div>
        <div class="m">${fmtDate(m.at)}${m.note ? " • " + m.note : ""}</div>
      </div>
    `;
  }).join("") : `<div class="muted">Chưa có lịch sử.</div>`;

  dlgDetail.showModal();
};

btnMoveFromDetail.addEventListener("click", () => {
  if(!detailTargetId) return;
  dlgDetail.close();
  openMove(detailTargetId);
});

btnPrintSingle.addEventListener("click", () => {
  if(!detailTargetId) return;
  printQuote([detailTargetId]);
});

// ===== Move (Nhập/Bán) =====
window.openMove = function(id){
  const it = items.find(x => x.id === id);
  if(!it) return;

  moveTargetId = id;
  dlgTitle.textContent = `Nhập/Bán: ${it.name}`;
  dlgSub.textContent = `ID: ${it.id} • OEM: ${it.oem} • Tồn hiện tại: ${it.qty}`;
  moveKind.value = "in";
  moveQty.value = 1;
  moveNote.value = "";

  dlgMove.showModal();
};

btnDoMove.addEventListener("click", (e) => {
  const it = items.find(x => x.id === moveTargetId);
  if(!it) return;

  const kind = moveKind.value; // in | out
  const q = Number(moveQty.value || 0);
  const note = moveNote.value.trim();

  if(q <= 0){
    alert("Số lượng phải >= 1");
    e.preventDefault();
    return;
  }

  const current = Number(it.qty || 0);
  const next = kind === "in" ? current + q : current - q;

  if(kind === "out" && next < 0){
    alert("Không đủ tồn kho để bán!");
    e.preventDefault();
    return;
  }

  it.qty = next;
  it.updatedAt = Date.now();
  it.moves = it.moves || [];
  it.moves.unshift({ at: Date.now(), kind, qty: q, note });

  save(items);
  render();

  if(detailTargetId === it.id && dlgDetail.open){
    openDetail(it.id);
  }
});

// ===== Search =====
elQ.addEventListener("input", render);

// ===== Quote (nhiều sp) =====
btnClearSelect.addEventListener("click", () => {
  selectedIds = new Set();
  render();
});

btnPrintQuote.addEventListener("click", () => {
  const ids = [...selectedIds];
  if(ids.length === 0){
    alert("Bạn chưa chọn sản phẩm nào để in báo giá.");
    return;
  }
  printQuote(ids);
});

function printQuote(ids){
  const products = ids.map(id => items.find(x => x.id === id)).filter(Boolean);
  const today = fmtDate(Date.now());
  const total = products.reduce((s,p)=> s + Number(p.price||0), 0);

  elPrintArea.innerHTML = `
    <div style="font-family:system-ui; padding:18px">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px">
        <div>
          <h2 style="margin:0">BÁO GIÁ PHỤ TÙNG</h2>
          <div style="color:#475569;font-size:12px;margin-top:4px">Ngày: ${today}</div>
        </div>
        <div style="text-align:right;color:#475569;font-size:12px">
          <div>Kiosk Phụ Tùng Xe</div>
          <div>(In từ Chrome)</div>
        </div>
      </div>

      <hr style="margin:12px 0; border:none; border-top:1px solid #e5e7eb" />

      <table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead>
          <tr>
            <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:8px">ID</th>
            <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:8px">OEM</th>
            <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:8px">Tên</th>
            <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:8px">Thương hiệu</th>
            <th style="text-align:left;border-bottom:1px solid #e5e7eb;padding:8px">Loại</th>
            <th style="text-align:right;border-bottom:1px solid #e5e7eb;padding:8px">Giá</th>
          </tr>
        </thead>
        <tbody>
          ${products.map(p=>`
            <tr>
              <td style="border-bottom:1px solid #f1f5f9;padding:8px">${p.id}</td>
              <td style="border-bottom:1px solid #f1f5f9;padding:8px">${p.oem||""}</td>
              <td style="border-bottom:1px solid #f1f5f9;padding:8px">${p.name||""}</td>
              <td style="border-bottom:1px solid #f1f5f9;padding:8px">${p.brand||""}</td>
              <td style="border-bottom:1px solid #f1f5f9;padding:8px">${p.type||""}</td>
              <td style="border-bottom:1px solid #f1f5f9;padding:8px;text-align:right">${money(p.price||0)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <div style="display:flex;justify-content:flex-end;margin-top:10px;font-weight:900">
        Tổng: ${money(total)}
      </div>

      <div style="margin-top:18px;color:#475569;font-size:12px">
        Ghi chú: Giá có thể thay đổi theo từng thời điểm. Vui lòng kiểm tra tồn kho trước khi chốt.
      </div>
    </div>
  `;

  window.print();
}

// ===== Export CSV for Google Sheets =====
btnExportInv.addEventListener("click", () => {
  const header = ["id","oem","ten","thuong_hieu","loai","gia","so_luong_ton","created_at","updated_at"];
  const rows = [header].concat(items.map(it => ([
    it.id,
    it.oem,
    it.name,
    it.brand,
    it.type,
    it.price,
    it.qty,
    fmtDate(it.createdAt),
    fmtDate(it.updatedAt),
  ])));
  const csv = toCsv(rows);
  downloadText(`ton_kho_${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv");
});

btnExportMoves.addEventListener("click", () => {
  const header = ["id","oem","ten","thuong_hieu","loai","ngay_gio","loai_thao_tac","so_luong","ghi_chu"];
  const rows = [header];

  for(const it of items){
    const moves = it.moves || [];
    const asc = [...moves].sort((a,b)=> a.at - b.at);
    for(const m of asc){
      rows.push([
        it.id,
        it.oem,
        it.name,
        it.brand,
        it.type,
        fmtDate(m.at),
        m.kind === "in" ? "NHAP" : "XUAT_BAN",
        m.qty,
        m.note || ""
      ]);
    }
  }

  const csv = toCsv(rows);
  downloadText(`lich_su_nhap_xuat_${new Date().toISOString().slice(0,10)}.csv`, csv, "text/csv");
});

// ===== Export/Import JSON =====
btnExportJson.addEventListener("click", () => {
  downloadText(
    `kiosk_parts_${new Date().toISOString().slice(0,10)}.json`,
    JSON.stringify(items, null, 2),
    "application/json"
  );
});

fileImport.addEventListener("change", () => {
  const f = fileImport.files?.[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if(!Array.isArray(data)) throw new Error("File không đúng định dạng mảng");
      const map = new Map(items.map(x => [x.id, x]));
      for(const it of data){
        if(it && it.id) map.set(it.id, it);
      }
      items = [...map.values()];
      save(items);
      render();
      alert("Nhập dữ liệu thành công!");
    }catch(err){
      alert("Không đọc được file JSON: " + err.message);
    }finally{
      fileImport.value = "";
    }
  };
  reader.readAsText(f);
});

// ===== Reset =====
btnReset.addEventListener("click", () => {
  const ok = confirm("Xoá toàn bộ dữ liệu trên máy này? (Không thể phục hồi)");
  if(!ok) return;
  items = [];
  selectedIds = new Set();
  save(items);
  clearForm();
  render();
});

// ===== Init =====
clearForm();
render();
