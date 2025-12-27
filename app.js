// ====================== CONFIG ======================
const API_URL = "https://script.google.com/macros/s/AKfycbydN15dpCZPJ3XdvPBUh2r2G_T7sjGQOod1-xBnSYo-4wxQo-MHiPmsduvH0mzM0Q/exec"; // <-- DÁN URL WEB APP

let TOKEN = localStorage.getItem("token") || "";
let ROLE = "guest";

const $ = (id) => document.getElementById(id);

let ALL = [];
let CURRENT = null;

// ====================== CART ======================
let CART = JSON.parse(localStorage.getItem("cart") || "[]"); // [{product_id,name,price,qty}]
function saveCart(){ localStorage.setItem("cart", JSON.stringify(CART)); updateCartCount(); }
function updateCartCount(){ $("cartCount").textContent = CART.reduce((s,i)=>s+i.qty,0); }

// ====================== UI HELPERS ======================
function setRoleUI() {
  document.querySelectorAll(".adminOnly").forEach(el => el.style.display = (ROLE === "admin") ? "" : "none");
  document.querySelectorAll(".guestOnly").forEach(el => el.style.display = (ROLE !== "admin") ? "" : "none");
}

function toast(msg){ alert(msg); }

function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function formatVND(n){ return (Number(n)||0).toLocaleString("vi-VN") + " đ"; }

// ====================== API ======================
async function apiGet(action, params={}) {
  const url = new URL(API_URL);
  url.searchParams.set("action", action);
  url.searchParams.set("token", TOKEN || "");
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  return await res.json();
}

async function apiPost(action, payload) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ action, token: TOKEN || "", payload })
  });
  return await res.json();
}

// ====================== LOAD + RENDER ======================
async function loadProducts() {
  const data = await apiGet("products_list");
  if (!data.ok) return toast(data.error || "Lỗi load");

  ROLE = data.role || "guest";
  setRoleUI();

  ALL = data.items || [];
  buildFilters();
  render();
  updateCartCount();
}

function buildFilters(){
  const cats = [...new Set(ALL.map(x => x.category).filter(Boolean))].sort();
  const brands = [...new Set(ALL.map(x => x.brand).filter(Boolean))].sort();

  $("cat").innerHTML = `<option value="">Tất cả loại</option>` + cats.map(c => `<option>${escapeHtml(c)}</option>`).join("");
  $("brand").innerHTML = `<option value="">Tất cả thương hiệu</option>` + brands.map(b => `<option>${escapeHtml(b)}</option>`).join("");
}

function matchQuery(item, q){
  if(!q) return true;
  q = q.toLowerCase();
  return (
    String(item.name||"").toLowerCase().includes(q) ||
    String(item.oem||"").toLowerCase().includes(q) ||
    String(item.oem_alt||"").toLowerCase().includes(q)
  );
}

function render(){
  const q = $("q").value.trim();
  const cat = $("cat").value.trim();
  const brand = $("brand").value.trim();
  const low = $("lowStock").checked;

  const items = ALL.filter(x => {
    if (!matchQuery(x,q)) return false;
    if (cat && x.category !== cat) return false;
    if (brand && x.brand !== brand) return false;
    if (low && !x.low_stock) return false;
    return true;
  });

  $("grid").innerHTML = items.map(cardHTML).join("");
}

function cardHTML(p){
  const total = (p.qty_warehouse||0) + (p.qty_store||0);
  const img = p.image_url || "https://via.placeholder.com/600x400?text=No+Image";
  return `
    <div class="card" onclick="openModal('${p.id}')">
      <div class="thumb"><img src="${img}" alt="${escapeHtml(p.name||'')}"/></div>
      <div class="cardBody">
        <div class="name">${escapeHtml(p.name||"")}</div>
        <div class="meta">
          OEM: <b>${escapeHtml(p.oem||"")}</b> • Giá: <b>${formatVND(p.price||0)}</b>
        </div>
        <div class="badges">
          <span class="badge">Kho: ${p.qty_warehouse||0}</span>
          <span class="badge">CH: ${p.qty_store||0}</span>
          <span class="badge ${total<=3?'low':'ok'}">${total<=3?'Sắp hết':'OK'}</span>
        </div>
      </div>
    </div>
  `;
}

// ====================== MODAL ======================
window.openModal = async (id) => {
  const data = await apiGet("product_get", { id });
  if (!data.ok) return toast(data.error || "Không tìm thấy");

  CURRENT = data.item;
  fillModal(CURRENT);
  renderAlbum(CURRENT);
  await loadTxns(CURRENT.id);
  $("modal").classList.remove("hidden");
};

function closeModal(){
  $("modal").classList.add("hidden");
  CURRENT = null;
}

function fillModal(p){
  $("f_id").value = p.id || "";
  $("f_oem").value = p.oem || "";
  $("f_oem_alt").value = p.oem_alt || "";
  $("f_name").value = p.name || "";
  $("f_brand").value = p.brand || "";
  $("f_category").value = p.category || "";
  $("f_price").value = p.price || 0;
  $("f_desc").value = p.desc || "";

  $("s_wh").textContent = p.qty_warehouse || 0;
  $("s_st").textContent = p.qty_store || 0;

  $("mTitle").textContent = `${p.name || "Chi tiết sản phẩm"} (${p.id})`;
  $("mImg").src = p.image_url || "https://via.placeholder.com/800x600?text=No+Image";
  $("cart_qty").value = 1;
}

function renderAlbum(p){
  const ids = String(p.image_ids||"").split(";").map(x=>x.trim()).filter(Boolean);
  const urls = ids.map(id => `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`);
  const el = $("album");
  if(!el) return;
  el.innerHTML = urls.map(u=>`<img src="${u}" title="Xem ảnh" onclick="document.getElementById('mImg').src='${u}'"/>`).join("");
}

async function loadTxns(id){
  const data = await apiGet("txns_by_product", { id, limit: 30 });
  if(!data.ok) { $("txnsList").innerHTML = "Không tải được lịch sử"; return; }
  $("txnsList").innerHTML = data.items.map(t=>{
    const time = new Date(t.time).toLocaleString("vi-VN");
    const loc = t.type==="MOVE" ? `${t.from_loc} → ${t.to_loc}` : (t.type==="IN" ? `Nhập ${t.to_loc}` : `Xuất ${t.from_loc}`);
    return `<div class="txnItem">
      <div>${time} • <b>${escapeHtml(t.type)}</b> • ${escapeHtml(loc)} • SL: <b>${t.qty}</b></div>
      <div>${escapeHtml(t.note||"")}</div>
    </div>`;
  }).join("");
}

// ====================== ADMIN: SAVE/DELETE ======================
async function saveProduct(){
  const payload = {
    id: $("f_id").value.trim() || undefined,
    oem: $("f_oem").value.trim(),
    oem_alt: $("f_oem_alt").value.trim(),
    name: $("f_name").value.trim(),
    brand: $("f_brand").value.trim(),
    category: $("f_category").value.trim(),
    price: Number($("f_price").value || 0),
    desc: $("f_desc").value.trim(),
    image_file_id: CURRENT?.image_file_id || "",
    image_url: CURRENT?.image_url || "",
    image_ids: CURRENT?.image_ids || ""
  };

  const res = await apiPost("product_upsert", payload);
  if (!res.ok) return toast(res.error || "Lỗi lưu");

  toast("Đã lưu");
  await loadProducts();
  await openModal(res.id);
}

async function deleteProduct(){
  if (!confirm("Xóa sản phẩm này?")) return;
  const res = await apiGet("product_delete", { id: $("f_id").value.trim() });
  if (!res.ok) return toast(res.error || "Lỗi xóa");
  toast("Đã xóa");
  closeModal();
  await loadProducts();
}

// ====================== STOCK ======================
async function adjustStock(){
  const payload = {
    loc: $("adj_loc").value,
    type: $("adj_type").value,
    product_id: $("f_id").value.trim(),
    qty: Number($("adj_qty").value || 0),
    note: "Điều chỉnh tồn"
  };
  const res = await apiPost("stock_adjust", payload);
  if (!res.ok) return toast(res.error || "Lỗi");
  toast("OK");
  await openModal(payload.product_id);
  await loadProducts();
}

async function moveStock(){
  const payload = {
    from_loc: $("mv_from").value,
    to_loc: $("mv_to").value,
    product_id: $("f_id").value.trim(),
    qty: Number($("mv_qty").value || 0),
    note: "Chuyển kho"
  };
  const res = await apiPost("stock_move", payload);
  if (!res.ok) return toast(res.error || "Lỗi");
  toast("Đã chuyển");
  await openModal(payload.product_id);
  await loadProducts();
}

// ====================== UPLOAD IMAGE ======================
function fileToBase64(file){
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function uploadCover(file){
  const base64 = await fileToBase64(file);
  const payload = { filename: file.name, mimeType: file.type, base64 };
  const res = await apiPost("image_upload", payload);
  if (!res.ok) return toast(res.error || "Upload lỗi");

  CURRENT.image_file_id = res.file_id;
  CURRENT.image_url = res.url;
  $("mImg").src = res.url;
  toast("Đã upload ảnh đại diện (nhớ bấm Lưu)");
}

async function uploadAlbum(files){
  const list = [];
  for(const f of files){
    list.push({ filename:f.name, mimeType:f.type, base64: await fileToBase64(f) });
  }
  const res = await apiPost("images_upload", { files: list });
  if(!res.ok) return toast(res.error || "Upload album lỗi");

  const newIds = res.items.map(x=>x.file_id);
  const old = String(CURRENT.image_ids||"").split(";").map(x=>x.trim()).filter(Boolean);
  const merged = [...old, ...newIds];
  CURRENT.image_ids = merged.join(";");

  if(!CURRENT.image_url && res.items[0]){
    CURRENT.image_url = res.items[0].url;
    CURRENT.image_file_id = res.items[0].file_id;
    $("mImg").src = CURRENT.image_url;
  }

  renderAlbum(CURRENT);
  toast("Đã upload album (nhớ bấm Lưu)");
}

// ====================== CART ======================
$("btnAddCart").onclick = ()=>{
  if(!CURRENT) return;
  const pid = $("f_id").value.trim();
  const qty = Number($("cart_qty").value||1);
  const price = Number($("f_price").value||0);
  const name = $("f_name").value.trim();

  if(!pid || qty<=0) return toast("Sai số lượng");

  const idx = CART.findIndex(x=>x.product_id===pid);
  if(idx>=0) CART[idx].qty += qty;
  else CART.push({ product_id: pid, name, price, qty });

  saveCart();
  toast("Đã thêm vào giỏ");
};

function renderCart(){
  if(!CART.length){
    $("cartTable").innerHTML = "<div style='color:var(--muted)'>Giỏ trống</div>";
    updateCartCount();
    return;
  }
  const total = CART.reduce((s,i)=>s+i.qty*i.price,0);

  $("cartTable").innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="text-align:left;border-bottom:1px solid var(--line);padding:8px">Sản phẩm</th>
        <th style="text-align:right;border-bottom:1px solid var(--line);padding:8px">SL</th>
        <th style="text-align:right;border-bottom:1px solid var(--line);padding:8px">Giá</th>
        <th style="text-align:right;border-bottom:1px solid var(--line);padding:8px">TT</th>
        <th style="border-bottom:1px solid var(--line);padding:8px"></th>
      </tr></thead>
      <tbody>
        ${CART.map((it,idx)=>`
          <tr>
            <td style="padding:8px;border-bottom:1px dashed var(--line)">
              ${escapeHtml(it.name)}<br/><span style="color:var(--muted)">${escapeHtml(it.product_id)}</span>
            </td>
            <td style="padding:8px;border-bottom:1px dashed var(--line);text-align:right">
              <input type="number" min="1" value="${it.qty}" style="width:80px"
                onchange="cartSetQty(${idx}, this.value)"/>
            </td>
            <td style="padding:8px;border-bottom:1px dashed var(--line);text-align:right">${formatVND(it.price)}</td>
            <td style="padding:8px;border-bottom:1px dashed var(--line);text-align:right">${formatVND(it.qty*it.price)}</td>
            <td style="padding:8px;border-bottom:1px dashed var(--line);text-align:right">
              <button class="danger" onclick="cartRemove(${idx})">Xóa</button>
            </td>
          </tr>
        `).join("")}
      </tbody>
      <tfoot>
        <tr>
          <th colspan="3" style="text-align:right;padding:8px">Tổng</th>
          <th style="text-align:right;padding:8px">${formatVND(total)}</th>
          <th></th>
        </tr>
      </tfoot>
    </table>
  `;
  updateCartCount();
}

window.cartSetQty = (idx, v)=>{
  const q = Number(v||1);
  CART[idx].qty = q>0?q:1;
  saveCart(); renderCart();
};
window.cartRemove = (idx)=>{
  CART.splice(idx,1);
  saveCart(); renderCart();
};

// ====================== BILL (checkout) ======================
$("btnCheckout").onclick = async ()=>{
  if(ROLE!=="admin") return toast("Chỉ admin tạo bill");
  if(!CART.length) return toast("Giỏ trống");

  const loc = $("cart_loc").value;
  const note = $("cart_note").value.trim();

  const payload = {
    loc,
    note,
    items: CART.map(it=>({ product_id: it.product_id, qty: it.qty, price: it.price }))
  };

  const res = await apiPost("bill_create", payload);
  if(!res.ok) return toast(res.error || "Lỗi tạo bill");

  printBill({ bill_id: res.bill_id, loc, items: payload.items, total: res.total });
  CART = [];
  saveCart();
  $("cartModal").classList.add("hidden");
  await loadProducts();
};

function printBill(bill){
  const html = `
  <html><head><meta charset="utf-8">
  <style>
    body{font-family:Arial;padding:14px}
    h2{margin:0 0 6px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    td,th{border:1px solid #ddd;padding:8px}
    .right{text-align:right}
  </style>
  </head><body>
    <h2>HÓA ĐƠN BÁN HÀNG</h2>
    <div>Mã bill: <b>${bill.bill_id}</b></div>
    <div>Nơi bán: <b>${bill.loc}</b></div>
    <div>Thời gian: <b>${new Date().toLocaleString("vi-VN")}</b></div>

    <table>
      <thead><tr><th>Mã SP</th><th class="right">SL</th><th class="right">Giá</th><th class="right">Thành tiền</th></tr></thead>
      <tbody>
        ${bill.items.map(it => `
          <tr>
            <td>${escapeHtml(it.product_id)}</td>
            <td class="right">${it.qty}</td>
            <td class="right">${formatVND(it.price)}</td>
            <td class="right">${formatVND(it.qty*it.price)}</td>
          </tr>
        `).join("")}
      </tbody>
      <tfoot>
        <tr><th colspan="3" class="right">Tổng</th><th class="right">${formatVND(bill.total)}</th></tr>
      </tfoot>
    </table>
    <script>window.onload=()=>window.print()</script>
  </body></html>
  `;
  const w = window.open("", "_blank");
  w.document.write(html);
  w.document.close();
}

// ====================== CSV import/export ======================
function toCSV(rows){
  const esc = (v) => `"${String(v ?? "").replace(/"/g,'""')}"`;
  return rows.map(r => r.map(esc).join(",")).join("\n");
}
function download(name, text){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], {type:"text/csv;charset=utf-8"}));
  a.download = name;
  a.click();
}

function exportCSV(){
  const headers = ["id","oem","oem_alt","name","brand","category","price","desc","image_url","image_ids","qty_warehouse","qty_store"];
  const rows = [headers].concat(ALL.map(p => [
    p.id,p.oem,p.oem_alt,p.name,p.brand,p.category,p.price,p.desc,p.image_url,p.image_ids,p.qty_warehouse,p.qty_store
  ]));
  download("products.csv", toCSV(rows));
}

function parseCSVLine(line){
  const out=[]; let cur=""; let q=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(c === '"'){ q=!q; continue; }
    if(c === "," && !q){ out.push(cur); cur=""; continue; }
    cur+=c;
  }
  out.push(cur);
  return out.map(x=>x.trim());
}

async function importCSV(file){
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if(lines.length<2) return toast("CSV rỗng");

  const headers = lines[0].split(",").map(s=>s.replace(/^"|"$/g,"").trim());
  const idx = (k)=>headers.indexOf(k);

  for (let i=1;i<lines.length;i++){
    const cols = parseCSVLine(lines[i]);
    const payload = {
      id: cols[idx("id")] || undefined,
      oem: cols[idx("oem")] || "",
      oem_alt: cols[idx("oem_alt")] || "",
      name: cols[idx("name")] || "",
      brand: cols[idx("brand")] || "",
      category: cols[idx("category")] || "",
      price: Number(cols[idx("price")] || 0),
      desc: cols[idx("desc")] || "",
      image_url: cols[idx("image_url")] || "",
      image_ids: cols[idx("image_ids")] || ""
    };
    const res = await apiPost("product_upsert", payload);
    if(!res.ok) { console.warn(res); toast("Import lỗi dòng "+(i+1)); return; }
  }
  toast("Import xong");
  await loadProducts();
}

// ====================== ADD PRODUCT ======================
async function addProduct(){
  CURRENT = {
    id:"",
    oem:"",
    oem_alt:"",
    name:"",
    brand:"",
    category:"",
    price:0,
    desc:"",
    image_file_id:"",
    image_url:"",
    image_ids:"",
    qty_warehouse:0,
    qty_store:0
  };
  fillModal({ ...CURRENT, id: "(tự tạo khi lưu)" });
  renderAlbum(CURRENT);
  $("txnsList").innerHTML = "";
  $("modal").classList.remove("hidden");
}

// ====================== THEME ======================
function initTheme(){
  const theme = localStorage.getItem("theme") || "dark";
  if(theme==="light") document.body.classList.add("light");
}
function toggleTheme(){
  document.body.classList.toggle("light");
  localStorage.setItem("theme", document.body.classList.contains("light") ? "light" : "dark");
}

// ====================== LOGIN ======================
function initToken(){ $("token").value = TOKEN; }
function saveToken(){
  TOKEN = $("token").value.trim();
  localStorage.setItem("token", TOKEN);
}

// ====================== SCAN QR/BARCODE ======================
$("btnScan").onclick = async ()=>{
  if(!("BarcodeDetector" in window)){
    const code = prompt("Máy không hỗ trợ quét tự động. Nhập OEM/QR:");
    if(code){ $("q").value = code; render(); }
    return;
  }
  const det = new BarcodeDetector({ formats: ["qr_code","code_128","ean_13","ean_8","code_39"] });

  const overlay = document.createElement("div");
  overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:99;display:flex;align-items:center;justify-content:center;padding:14px";
  overlay.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--line);border-radius:16px;overflow:hidden;max-width:520px;width:100%">
      <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid var(--line)">
        <b>Quét QR / Barcode</b>
        <button id="scanClose" style="border:none;background:transparent;color:var(--text);font-size:18px;cursor:pointer">✕</button>
      </div>
      <video id="scanVideo" style="width:100%;height:360px;object-fit:cover;background:#000" autoplay playsinline></video>
      <div style="padding:10px 12px;color:var(--muted);font-size:13px">Đưa mã vào giữa khung hình. Khi nhận dạng được sẽ tự tìm.</div>
    </div>
  `;
  document.body.appendChild(overlay);

  const video = overlay.querySelector("#scanVideo");
  const closeBtn = overlay.querySelector("#scanClose");

  let stream;
  try{
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio:false });
    video.srcObject = stream;
  }catch(err){
    overlay.remove();
    return toast("Không mở được camera: " + err);
  }

  let stop=false;
  const stopAll = ()=>{
    stop=true;
    if(stream) stream.getTracks().forEach(t=>t.stop());
    overlay.remove();
  };
  closeBtn.onclick = stopAll;

  const tick = async ()=>{
    if(stop) return;
    try{
      const barcodes = await det.detect(video);
      if(barcodes && barcodes.length){
        const raw = barcodes[0].rawValue || "";
        stopAll();
        $("q").value = raw;
        render();
      }
    }catch(_){}
    requestAnimationFrame(tick);
  };
  tick();
};

// ====================== EVENTS ======================
$("btnDark").onclick = toggleTheme;

$("btnLogin").onclick = async () => { saveToken(); await loadProducts(); };

$("q").addEventListener("input", render);
$("cat").addEventListener("change", render);
$("brand").addEventListener("change", render);
$("lowStock").addEventListener("change", render);

$("mClose").onclick = closeModal;
$("modal").addEventListener("click", (e)=>{ if(e.target.id==="modal") closeModal(); });

$("btnSave").onclick = saveProduct;
$("btnDelete").onclick = deleteProduct;

$("btnAdjust").onclick = adjustStock;
$("btnMove").onclick = moveStock;

$("btnAdd").onclick = addProduct;

$("btnExport").onclick = exportCSV;
$("csvFile").addEventListener("change", (e)=>{
  const file = e.target.files?.[0];
  if(file) importCSV(file);
});

$("imgFile").addEventListener("change", (e)=>{
  const file = e.target.files?.[0];
  if(file) uploadCover(file);
});
$("imgFiles").addEventListener("change", (e)=>{
  const files = [...(e.target.files||[])];
  if(files.length) uploadAlbum(files);
});

// cart modal
$("btnCart").onclick = ()=>{ renderCart(); $("cartModal").classList.remove("hidden"); };
$("cartClose").onclick = ()=> $("cartModal").classList.add("hidden");
$("cartModal").addEventListener("click",(e)=>{ if(e.target.id==="cartModal") $("cartModal").classList.add("hidden"); });

// ====================== BOOT ======================
initTheme();
initToken();
loadProducts();
updateCartCount();
