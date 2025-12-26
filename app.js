/* =========================
   CONFIG — DÁN URL WEB APP /exec Ở ĐÂY
========================= */
const API_URL = "https://script.google.com/macros/s/AKfycbyVyL-CA1zgK0DyGkD6GJel8j13xCy5tAKKk5FELGRdYo6BGyrD5p0hrE3hNkWBzF8/exec";

// Mật khẩu bật chế độ Admin (UI)
const ADMIN_PASSWORD = "123456";

// Fallback image
const FALLBACK_IMG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <circle cx="450" cy="380" r="150" fill="#e5e7eb"/>
    <text x="50%" y="62%" dominant-baseline="middle" text-anchor="middle"
      font-family="Arial" font-size="28" font-weight="700" fill="#6b7280">No Image</text>
  </svg>`);

/* =========================
   STATE
========================= */
const S = {
  isAdmin: localStorage.getItem("is_admin_v1") === "1",
  adminKey: localStorage.getItem("admin_key_v1") || "",
  mode: localStorage.getItem("mode_v1") || "dashboard", // dashboard | shop

  products: [],
  moves: [],
  warehouses: [],

  // stock maps
  stockTotal: new Map(),            // productId -> qty
  stockByWH: new Map(),             // `${wh}|${pid}` -> qty

  // filters
  filters: { q:"", cat:"", brand:"", sort:"newest" },
  globalWarehouse: "", // "" means all

  // shop filters
  shop: { q:"", cat:"", brand:"" },

  // move context
  moveProductId: null
};

/* =========================
   DOM
========================= */
const $ = (id)=>document.getElementById(id);

const pillRole = $("pillRole");
const chipOnline = $("chipOnline");

const btnPing = $("btnPing");
const btnReload = $("btnReload");
const btnExportCSV = $("btnExportCSV");
const csvFile = $("csvFile");
const btnAdmin = $("btnAdmin");

const btnModeDashboard = $("btnModeDashboard");
const btnModeShop = $("btnModeShop");

const globalWarehouse = $("globalWarehouse");

const statProducts = $("statProducts");
const statMoves = $("statMoves");
const statWarehouses = $("statWarehouses");

const shopView = $("shopView");
const dashboardView = $("dashboardView");
const shopSearch = $("shopSearch");
const shopCat = $("shopCat");
const shopBrand = $("shopBrand");
const shopGrid = $("shopGrid");
const shopEmpty = $("shopEmpty");

const pid = $("pid");
const pname = $("pname");
const psku = $("psku");
const poem = $("poem");
const pcat = $("pcat");
const pbrand = $("pbrand");
const punit = $("punit");
const pRetail = $("pRetail");
const pWholesale = $("pWholesale");
const pdesc = $("pdesc");
const pimgurl = $("pimgurl");
const pfile = $("pfile");
const btnPick = $("btnPick");
const pactive = $("pactive");

const previewImg = $("previewImg");
const hint = $("hint");

const btnSave = $("btnSave");
const btnReset = $("btnReset");
const btnDel = $("btnDel");

const q = $("q");
const fcat = $("fcat");
const fbrand = $("fbrand");
const fsort = $("fsort");
const btnClear = $("btnClear");
const tb = $("tb");
const empty = $("empty");

const mAdmin = $("mAdmin");
const adminPass = $("adminPass");
const adminKey = $("adminKey");
const btnLogin = $("btnLogin");
const btnLogout = $("btnLogout");

const mMove = $("mMove");
const moveFor = $("moveFor");
const mtype = $("mtype");
const mqty = $("mqty");
const mnote = $("mnote");
const mwarehouse = $("mwarehouse");
const mfrom = $("mfrom");
const mto = $("mto");
const wrapWarehouse = $("wrapWarehouse");
const wrapFrom = $("wrapFrom");
const wrapTo = $("wrapTo");
const btnSaveMove = $("btnSaveMove");

const toast = $("toast");
const toastText = $("toastText");

/* =========================
   INIT
========================= */
init();

async function init(){
  wireModalClose();
  wireUI();

  updatePreview(FALLBACK_IMG, true);
  syncAdminUI();
  syncModeUI();

  await reloadAll();
  renderAll();
}

/* =========================
   UI WIRING
========================= */
function wireModalClose(){
  document.addEventListener("click",(e)=>{
    if (e.target?.dataset?.close) closeAllModals();
  });
}

function wireUI(){
  btnPing?.addEventListener("click", async ()=>{
    const r = await apiGet("ping");
    if (r.ok) toastOK("API OK: " + (r.time || ""));
    else toastBad(r.error || "Ping failed");
  });

  btnReload?.addEventListener("click", async ()=>{
    await reloadAll();
    toastOK("Đã làm mới");
    renderAll();
  });

  btnExportCSV?.addEventListener("click", ()=>{
    exportCSV();
  });

  csvFile?.addEventListener("change", async ()=>{
    const file = csvFile.files?.[0];
    csvFile.value = "";
    if (!file) return;
    if (!S.isAdmin) return toastBad("Chỉ admin import.");
    try{
      const txt = await file.text();
      const rows = parseCSV(txt);
      await importCSV(rows);
    }catch(err){
      toastBad(String(err.message || err));
    }
  });

  btnAdmin?.addEventListener("click", ()=>openModal(mAdmin));

  btnModeDashboard?.addEventListener("click", ()=>{
    S.mode = "dashboard";
    localStorage.setItem("mode_v1", S.mode);
    syncModeUI();
    renderAll();
  });

  btnModeShop?.addEventListener("click", ()=>{
    S.mode = "shop";
    localStorage.setItem("mode_v1", S.mode);
    syncModeUI();
    renderAll();
  });

  globalWarehouse?.addEventListener("change", ()=>{
    S.globalWarehouse = globalWarehouse.value;
    renderTable();
    renderShop();
  });

  // form image
  btnPick?.addEventListener("click", ()=>pfile.click());

  pimgurl?.addEventListener("input", ()=>{
    const url = (pimgurl.value || "").trim();
    if(!url){
      previewImg.dataset.src = "";
      updatePreview(FALLBACK_IMG,true);
      return;
    }
    previewImg.dataset.src = url;
    updatePreview(url,false);
  });

  pfile?.addEventListener("change", async ()=>{
    const file = pfile.files?.[0];
    if (!file) return;
    const dataUrl = await fileToDataUrlCompressed(file, 1000, 0.86);
    previewImg.dataset.src = dataUrl;
    pimgurl.value = "";
    updatePreview(dataUrl,false);
  });

  btnReset?.addEventListener("click", ()=>resetForm());

  btnSave?.addEventListener("click", async ()=>{
    if(!S.isAdmin) return toastBad("Bạn phải đăng nhập admin.");
    await saveProduct();
  });

  btnDel?.addEventListener("click", async ()=>{
    if(!S.isAdmin) return toastBad("Chỉ admin.");
    const id = pid.value;
    if(!id) return;
    if(!confirm("Xoá sản phẩm này?")) return;
    const res = await apiPost({ action:"delete_product", adminKey:S.adminKey, id });
    if(!res.ok) return toastBad(res.error || "Delete failed");
    await reloadAll();
    resetForm();
    toastOK("Đã xoá");
    renderAll();
  });

  // table filters
  q?.addEventListener("input", ()=>{ S.filters.q = q.value.trim(); renderTable(); });
  fcat?.addEventListener("change", ()=>{ S.filters.cat = fcat.value; renderTable(); });
  fbrand?.addEventListener("change", ()=>{ S.filters.brand = fbrand.value; renderTable(); });
  fsort?.addEventListener("change", ()=>{ S.filters.sort = fsort.value; renderTable(); });

  btnClear?.addEventListener("click", ()=>{
    S.filters = { q:"", cat:"", brand:"", sort:"newest" };
    q.value=""; fcat.value=""; fbrand.value=""; fsort.value="newest";
    renderTable();
  });

  // admin auth
  btnLogin?.addEventListener("click", ()=>{
    const pass = (adminPass.value||"").trim();
    const key = (adminKey.value||"").trim();
    if (pass !== ADMIN_PASSWORD) return toastBad("Sai mật khẩu admin UI.");
    if (!key) return toastBad("Thiếu ADMIN_KEY.");

    S.isAdmin = true;
    S.adminKey = key;
    localStorage.setItem("is_admin_v1","1");
    localStorage.setItem("admin_key_v1", key);
    adminPass.value = "";
    toastOK("Admin ON");
    syncAdminUI();
    closeAllModals();
    renderAll();
  });

  btnLogout?.addEventListener("click", ()=>{
    S.isAdmin = false;
    localStorage.setItem("is_admin_v1","0");
    toastOK("Admin OFF");
    syncAdminUI();
    closeAllModals();
    renderAll();
  });

  // shop filters
  shopSearch?.addEventListener("input", ()=>{ S.shop.q = shopSearch.value.trim(); renderShop(); });
  shopCat?.addEventListener("change", ()=>{ S.shop.cat = shopCat.value; renderShop(); });
  shopBrand?.addEventListener("change", ()=>{ S.shop.brand = shopBrand.value; renderShop(); });

  // move modal type switching
  mtype?.addEventListener("change", ()=>{
    syncMoveTypeUI();
  });

  btnSaveMove?.addEventListener("click", async ()=>{
    if(!S.isAdmin) return toastBad("Chỉ admin.");

    const qty = Number(mqty.value||0);
    if(!S.moveProductId) return toastBad("Thiếu sản phẩm.");
    if(!Number.isFinite(qty) || qty<=0) return toastBad("Số lượng > 0");

    const type = mtype.value;
    const note = (mnote.value||"").trim();

    const payload = {
      id: rid(),
      type,
      productId: S.moveProductId,
      qty,
      cost: 0,
      note
    };

    if (type === "IN" || type === "OUT"){
      payload.warehouse = mwarehouse.value || (S.warehouses[0]?.code || "A");
      payload.fromWarehouse = "";
      payload.toWarehouse = "";
    } else {
      payload.warehouse = "";
      payload.fromWarehouse = mfrom.value;
      payload.toWarehouse = mto.value;
      if (!payload.fromWarehouse || !payload.toWarehouse) return toastBad("Chọn đủ kho.");
      if (payload.fromWarehouse === payload.toWarehouse) return toastBad("Kho đi và kho đến phải khác nhau.");
    }

    const res = await apiPost({ action:"add_move", adminKey:S.adminKey, move: payload });
    if(!res.ok) return toastBad(res.error || "Move failed");

    closeAllModals();
    mqty.value=""; mnote.value="";
    await reloadAll();
    toastOK("Đã lưu phiếu");
    renderAll();
  });
}

/* =========================
   MODE + ADMIN UI
========================= */
function syncModeUI(){
  const isShop = S.mode === "shop";
  shopView.hidden = !isShop;
  dashboardView.hidden = isShop;
}

function syncAdminUI(){
  pillRole.textContent = S.isAdmin ? "ADMIN" : "KHÁCH";

  btnLogout.hidden = !S.isAdmin;
  btnLogin.hidden = S.isAdmin;

  const lock = !S.isAdmin;
  [pname,psku,poem,pcat,pbrand,punit,pRetail,pWholesale,pdesc,pimgurl,pactive].forEach(el=>el.disabled = lock);
  btnPick.disabled = lock;
  btnSave.disabled = lock;
  btnReset.disabled = lock;
  btnDel.hidden = !(S.isAdmin && pid.value);

  chipOnline.innerHTML = `<span class="dot"></span> ${S.isAdmin ? "Admin ready" : "Viewer"}`;
}

/* =========================
   DATA LOAD
========================= */
async function reloadAll(){
  setChip("Loading...", "#f59e0b");
  const [p,m,w] = await Promise.all([
    apiGet("list_products"),
    apiGet("list_moves"),
    apiGet("list_warehouses")
  ]);

  if(!p.ok){ setChip("Products error", "#ef4444"); toastBad(p.error||"Load products failed"); return; }
  if(!m.ok){ setChip("Moves error", "#ef4444"); toastBad(m.error||"Load moves failed"); return; }
  if(!w.ok){ setChip("Warehouses error", "#ef4444"); toastBad(w.error||"Load warehouses failed"); return; }

  S.products = (p.data || []).filter(x => x.active !== false);
  S.moves = m.data || [];
  S.warehouses = (w.data || []).filter(x => x.active !== false);

  rebuildStock();
  buildOptions();

  // stats
  statProducts.textContent = String(S.products.length);
  statMoves.textContent = String(S.moves.length);
  statWarehouses.textContent = String(S.warehouses.length);

  setChip("OK", "#22c55e");
}

function setChip(text, color){
  chipOnline.innerHTML = `<span class="dot" style="background:${color}"></span> ${text}`;
}

/* =========================
   STOCK
========================= */
function rebuildStock(){
  const total = new Map();
  const byWH = new Map();

  const add = (wh, pid, delta)=>{
    const k = `${wh}|${pid}`;
    byWH.set(k, (byWH.get(k)||0) + delta);
    total.set(pid, (total.get(pid)||0) + delta);
  };

  for(const mv of S.moves){
    const qty = Number(mv.qty||0);
    if (!mv.productId) continue;

    if (mv.type === "IN"){
      add(mv.warehouse || "A", mv.productId, qty);
    } else if (mv.type === "OUT"){
      add(mv.warehouse || "A", mv.productId, -qty);
    } else if (mv.type === "TRANSFER"){
      if (mv.fromWarehouse) add(mv.fromWarehouse, mv.productId, -qty);
      if (mv.toWarehouse) add(mv.toWarehouse, mv.productId, qty);
    }
  }

  S.stockTotal = total;
  S.stockByWH = byWH;
}

function stockTotal(pid){ return S.stockTotal.get(pid)||0; }
function stockWH(wh,pid){ return S.stockByWH.get(`${wh}|${pid}`)||0; }

/* =========================
   OPTIONS
========================= */
function buildOptions(){
  // categories + brands
  const cats = uniq(S.products.map(p => (p.category||"").trim()).filter(Boolean)).sort(locale);
  const brands = uniq(S.products.map(p => (p.brand||"").trim()).filter(Boolean)).sort(locale);

  fcat.innerHTML = `<option value="">Tất cả danh mục</option>` + cats.map(c=>`<option value="${escAttr(c)}">${esc(c)}</option>`).join("");
  fbrand.innerHTML = `<option value="">Tất cả thương hiệu</option>` + brands.map(b=>`<option value="${escAttr(b)}">${esc(b)}</option>`).join("");

  shopCat.innerHTML = `<option value="">Tất cả danh mục</option>` + cats.map(c=>`<option value="${escAttr(c)}">${esc(c)}</option>`).join("");
  shopBrand.innerHTML = `<option value="">Tất cả thương hiệu</option>` + brands.map(b=>`<option value="${escAttr(b)}">${esc(b)}</option>`).join("");

  // global warehouse
  globalWarehouse.innerHTML =
    `<option value="">Tất cả kho</option>` +
    S.warehouses.map(w=>`<option value="${escAttr(w.code)}">${esc(w.code)} — ${esc(w.name||("Kho "+w.code))}</option>`).join("");

  // move modal warehouse selects
  mwarehouse.innerHTML = S.warehouses.map(w=>`<option value="${escAttr(w.code)}">${esc(w.code)} — ${esc(w.name||"")}</option>`).join("");
  mfrom.innerHTML = S.warehouses.map(w=>`<option value="${escAttr(w.code)}">${esc(w.code)} — ${esc(w.name||"")}</option>`).join("");
  mto.innerHTML = S.warehouses.map(w=>`<option value="${escAttr(w.code)}">${esc(w.code)} — ${esc(w.name||"")}</option>`).join("");

  // keep selection
  if (S.globalWarehouse && !S.warehouses.some(w=>w.code===S.globalWarehouse)){
    S.globalWarehouse = "";
  }
  globalWarehouse.value = S.globalWarehouse;
}

/* =========================
   RENDER ALL
========================= */
function renderAll(){
  syncAdminUI();
  syncModeUI();
  renderTable();
  renderShop();
}

/* =========================
   TABLE RENDER
========================= */
function getFilteredProducts(){
  let arr = [...S.products];

  const qv = (S.filters.q||"").toLowerCase();
  if (qv){
    arr = arr.filter(p=>{
      const hay = `${p.name||""} ${p.sku||""} ${p.oem||""} ${p.brand||""} ${p.category||""}`.toLowerCase();
      return hay.includes(qv);
    });
  }

  if (S.filters.cat) arr = arr.filter(p => (p.category||"").trim() === S.filters.cat);
  if (S.filters.brand) arr = arr.filter(p => (p.brand||"").trim() === S.filters.brand);

  arr.sort((a,b)=>{
    if (S.filters.sort === "az") return locale(a.name,b.name);
    if (S.filters.sort === "za") return locale(b.name,a.name);
    if (S.filters.sort === "stockDesc") return getDisplayStock(b.id) - getDisplayStock(a.id);
    if (S.filters.sort === "stockAsc") return getDisplayStock(a.id) - getDisplayStock(b.id);
    return String(b.updatedAt||"").localeCompare(String(a.updatedAt||""));
  });

  return arr;
}

function getDisplayStock(productId){
  if (!S.globalWarehouse) return stockTotal(productId);
  return stockWH(S.globalWarehouse, productId);
}

function renderTable(){
  const items = getFilteredProducts();
  empty.hidden = items.length !== 0;

  const whShort = S.warehouses.slice(0,5); // show up to 5 kho line

  tb.innerHTML = items.map(p=>{
    const img = p.imageUrl || FALLBACK_IMG;

    const whLine = !S.globalWarehouse
      ? whShort.map(w=>`${w.code}:${stockWH(w.code,p.id)}`).join(" • ")
      : `${S.globalWarehouse}:${stockWH(S.globalWarehouse,p.id)} (lọc)`;

    const stock = getDisplayStock(p.id);

    const priceText = formatVND(p.priceRetail || 0);

    return `
      <tr>
        <td>
          <div class="timg">
            <img src="${escAttr(img)}" alt="img" onerror="this.src='${escAttr(FALLBACK_IMG)}'">
          </div>
        </td>
        <td>
          <div style="font-weight:1000">${esc(p.name||"")}</div>
          <div class="small muted">SKU: ${esc(p.sku||"—")} • OEM: ${esc(p.oem||"—")} • ĐV: ${esc(p.unit||"—")}</div>
          <div class="whline">${esc(whLine)} • <b>Tổng:</b> ${stockTotal(p.id)}</div>
        </td>
        <td>${esc(p.category||"")}</td>
        <td>${esc(p.brand||"")}</td>
        <td><span class="badge"><i class="fa-solid fa-box"></i> ${stock}</span></td>
        <td style="font-weight:1000">${priceText}</td>
        <td>
          <div class="act">
            <button class="btn btn-sm" data-edit="${escAttr(p.id)}"><i class="fa-solid fa-pen"></i> Sửa</button>
            <button class="btn btn-sm btn-primary" data-move="${escAttr(p.id)}" data-kind="IN"><i class="fa-solid fa-arrow-down"></i> Nhập</button>
            <button class="btn btn-sm btn-dark" data-move="${escAttr(p.id)}" data-kind="OUT"><i class="fa-solid fa-arrow-up"></i> Xuất</button>
            <button class="btn btn-sm btn-ghost" data-move="${escAttr(p.id)}" data-kind="TRANSFER"><i class="fa-solid fa-right-left"></i> Chuyển</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  // wire edit
  tb.querySelectorAll("[data-edit]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if (!S.isAdmin) return toastBad("Khách chỉ xem.");
      const p = S.products.find(x=>x.id === btn.dataset.edit);
      if (!p) return;
      fillForm(p);
      toastOK("Đã nạp form để sửa");
    });
  });

  // wire move
  tb.querySelectorAll("[data-move]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if (!S.isAdmin) return toastBad("Chỉ admin.");
      const id = btn.dataset.move;
      const kind = btn.dataset.kind;
      const p = S.products.find(x=>x.id === id);
      if (!p) return;

      S.moveProductId = id;
      moveFor.textContent = `Sản phẩm: ${p.name} (${p.sku||"no-sku"})`;

      mtype.value = kind;
      mqty.value = "";
      mnote.value = "";

      // default values
      if (S.warehouses.length){
        mwarehouse.value = S.globalWarehouse || S.warehouses[0].code;
        mfrom.value = S.warehouses[0].code;
        mto.value = S.warehouses[Math.min(1, S.warehouses.length-1)].code;
      }

      syncMoveTypeUI();
      openModal(mMove);
    });
  });
}

function syncMoveTypeUI(){
  const t = mtype.value;
  if (t === "TRANSFER"){
    wrapWarehouse.hidden = true;
    wrapFrom.hidden = false;
    wrapTo.hidden = false;
  } else {
    wrapWarehouse.hidden = false;
    wrapFrom.hidden = true;
    wrapTo.hidden = true;
  }
}

/* =========================
   SHOP RENDER
========================= */
function renderShop(){
  const qv = (S.shop.q || "").toLowerCase();
  const cat = S.shop.cat || "";
  const brand = S.shop.brand || "";

  let items = [...S.products];

  if (qv){
    items = items.filter(p=>{
      const hay = `${p.name||""} ${p.sku||""} ${p.oem||""} ${p.brand||""} ${p.category||""}`.toLowerCase();
      return hay.includes(qv);
    });
  }
  if (cat) items = items.filter(p => (p.category||"").trim() === cat);
  if (brand) items = items.filter(p => (p.brand||"").trim() === brand);

  shopEmpty.hidden = items.length !== 0;

  shopGrid.innerHTML = items.map(p=>{
    const img = p.imageUrl || FALLBACK_IMG;
    const stock = getDisplayStock(p.id);
    return `
      <div class="shop-card">
        <div class="shop-img">
          <img src="${escAttr(img)}" alt="img" onerror="this.src='${escAttr(FALLBACK_IMG)}'">
        </div>
        <div class="shop-body">
          <div class="shop-name">${esc(p.name||"")}</div>
          <div class="shop-meta">${esc(p.brand||"")} • ${esc(p.category||"")} • SKU: ${esc(p.sku||"—")}</div>
          <div class="shop-price">${formatVND(p.priceRetail||0)}</div>
          <div class="shop-stock">Tồn: ${stock}${S.globalWarehouse ? ` (Kho ${esc(S.globalWarehouse)})` : ""}</div>
        </div>
      </div>
    `;
  }).join("");
}

/* =========================
   FORM
========================= */
function resetForm(){
  pid.value = "";
  pname.value = "";
  psku.value = "";
  poem.value = "";
  pcat.value = "";
  pbrand.value = "";
  punit.value = "";
  pRetail.value = "0";
  pWholesale.value = "0";
  pdesc.value = "";
  pimgurl.value = "";
  pfile.value = "";
  pactive.value = "true";

  previewImg.dataset.src = "";
  updatePreview(FALLBACK_IMG, true);

  btnDel.hidden = true;
}

function fillForm(p){
  pid.value = p.id || "";
  pname.value = p.name || "";
  psku.value = p.sku || "";
  poem.value = p.oem || "";
  pcat.value = p.category || "";
  pbrand.value = p.brand || "";
  punit.value = p.unit || "";
  pRetail.value = String(Number(p.priceRetail||0));
  pWholesale.value = String(Number(p.priceWholesale||0));
  pdesc.value = p.desc || "";
  pactive.value = (p.active === false) ? "false" : "true";

  pimgurl.value = "";
  pfile.value = "";

  previewImg.dataset.src = p.imageUrl || "";
  updatePreview(p.imageUrl || FALLBACK_IMG, !p.imageUrl);

  btnDel.hidden = !S.isAdmin ? true : false;
}

async function saveProduct(){
  const id = pid.value || rid();
  const name = (pname.value||"").trim();
  if (!name) return toastBad("Tên sản phẩm là bắt buộc.");

  const rawSrc = (previewImg.dataset.src||"").trim() || (pimgurl.value||"").trim();

  // upload to Drive only when it's dataUrl
  let imageUrl = rawSrc || "";
  try{
    if (imageUrl.startsWith("data:image/")){
      setChip("Uploading image...", "#f59e0b");
      const up = await apiPost({
        action: "upload_image_to_drive",
        adminKey: S.adminKey,
        file: { name: `p_${id}.jpg`, mime: "image/jpeg", dataUrl: imageUrl }
      });
      if (!up.ok) throw new Error(up.error || "Upload ảnh thất bại");
      imageUrl = up.imageUrl;
    }
  } finally {
    setChip("OK", "#22c55e");
  }

  const product = {
    id,
    sku: (psku.value||"").trim(),
    name,
    category: (pcat.value||"").trim(),
    brand: (pbrand.value||"").trim(),
    oem: (poem.value||"").trim(),
    unit: (punit.value||"").trim(),
    priceRetail: Number(pRetail.value||0),
    priceWholesale: Number(pWholesale.value||0),
    imageUrl: imageUrl || "",
    desc: (pdesc.value||"").trim(),
    active: (pactive.value === "true")
  };

  const res = await apiPost({ action:"upsert_product", adminKey: S.adminKey, product });
  if (!res.ok) return toastBad(res.error || "Save failed");

  await reloadAll();
  pid.value = id;
  btnDel.hidden = false;
  toastOK("Đã lưu sản phẩm");
  renderAll();
}

/* =========================
   CSV Export/Import
========================= */
function exportCSV(){
  const headers = [
    "id","sku","name","category","brand","oem","unit","priceRetail","priceWholesale","imageUrl","desc","active"
  ];

  const lines = [];
  lines.push(headers.join(","));

  for(const p of S.products){
    const row = headers.map(h => csvEscape(p[h]));
    lines.push(row.join(","));
  }

  const blob = new Blob([lines.join("\n")], { type:"text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "products_export.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  toastOK("Đã export CSV");
}

function parseCSV(text){
  // simple CSV parser (supports quoted)
  const rows = [];
  let row = [];
  let cur = "";
  let inQuotes = false;

  for (let i=0;i<text.length;i++){
    const ch = text[i];
    const next = text[i+1];

    if (ch === '"' && inQuotes && next === '"'){
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"'){
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (ch === ",")){
      row.push(cur);
      cur = "";
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")){
      if (cur.length || row.length){
        row.push(cur);
        rows.push(row);
      }
      cur = "";
      row = [];
      // skip \r\n
      if (ch === "\r" && next === "\n") i++;
      continue;
    }
    cur += ch;
  }
  if (cur.length || row.length){
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

async function importCSV(rows){
  if (!rows.length) return toastBad("CSV rỗng.");

  const headers = rows[0].map(x => (x||"").trim());
  const need = ["name"]; // minimal required

  for(const k of need){
    if (!headers.includes(k)) return toastBad(`CSV thiếu cột: ${k}`);
  }

  const idx = (col)=>headers.indexOf(col);

  const dataRows = rows.slice(1).filter(r => r.some(x => String(x||"").trim() !== ""));
  if (!dataRows.length) return toastBad("CSV không có dữ liệu.");

  setChip("Importing...", "#f59e0b");

  // batch upsert sequential (safe)
  let okCount = 0;
  for(const r of dataRows){
    const p = {
      id: (r[idx("id")] || "").trim() || rid(),
      sku: (r[idx("sku")] || "").trim(),
      name: (r[idx("name")] || "").trim(),
      category: (r[idx("category")] || "").trim(),
      brand: (r[idx("brand")] || "").trim(),
      oem: (r[idx("oem")] || "").trim(),
      unit: (r[idx("unit")] || "").trim(),
      priceRetail: Number((r[idx("priceRetail")] || "0").trim() || 0),
      priceWholesale: Number((r[idx("priceWholesale")] || "0").trim() || 0),
      imageUrl: (r[idx("imageUrl")] || "").trim(),
      desc: (r[idx("desc")] || "").trim(),
      active: ((r[idx("active")] || "true").trim().toLowerCase() !== "false")
    };

    if (!p.name) continue;

    const res = await apiPost({ action:"upsert_product", adminKey:S.adminKey, product:p });
    if (res.ok) okCount++;
  }

  await reloadAll();
  renderAll();
  setChip("OK", "#22c55e");
  toastOK(`Import xong: ${okCount} sản phẩm`);
}

function csvEscape(v){
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")){
    return `"${s.replaceAll('"','""')}"`;
  }
  return s;
}

/* =========================
   PREVIEW
========================= */
function updatePreview(src, showHint){
  previewImg.src = src || FALLBACK_IMG;
  hint.style.display = showHint ? "block" : "none";
}

/* =========================
   MODALS + TOAST
========================= */
function openModal(m){
  m.classList.add("open");
  m.setAttribute("aria-hidden","false");
}
function closeAllModals(){
  document.querySelectorAll(".modal").forEach(m=>{
    m.classList.remove("open");
    m.setAttribute("aria-hidden","true");
  });
}

let toastTimer = null;
function toastOK(msg){ showToast(msg,true); }
function toastBad(msg){ showToast(msg,false); }
function showToast(msg, ok){
  toast.hidden = false;
  toastText.textContent = msg;
  toast.querySelector("i").className = ok ? "fa-solid fa-circle-check" : "fa-solid fa-triangle-exclamation";
  toast.style.background = ok ? "#0b1220" : "#7f1d1d";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(()=>toast.hidden=true, 2200);
}

/* =========================
   API
========================= */
async function apiGet(action){
  try{
    const url = API_URL + "?action=" + encodeURIComponent(action);
    const r = await fetch(url, { method:"GET" });
    return await r.json();
  }catch(e){
    return { ok:false, error:String(e.message||e) };
  }
}

async function apiPost(payload){
  try{
    const r = await fetch(API_URL, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(payload)
    });
    return await r.json();
  }catch(e){
    return { ok:false, error:String(e.message||e) };
  }
}

/* =========================
   IMAGE COMPRESS
========================= */
async function fileToDataUrlCompressed(file, maxSize=1000, quality=0.86){
  const dataUrl = await new Promise((res, rej)=>{
    const fr = new FileReader();
    fr.onload = ()=>res(String(fr.result));
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });

  const img = await new Promise((res, rej)=>{
    const im = new Image();
    im.onload = ()=>res(im);
    im.onerror = rej;
    im.src = dataUrl;
  });

  const w = img.width, h = img.height;
  const scale = Math.min(1, maxSize / Math.max(w,h));
  const nw = Math.round(w * scale);
  const nh = Math.round(h * scale);

  const canvas = document.createElement("canvas");
  canvas.width = nw;
  canvas.height = nh;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, nw, nh);

  return canvas.toDataURL("image/jpeg", quality);
}

/* =========================
   HELPERS
========================= */
function rid(){
  if (crypto?.getRandomValues){
    const a = new Uint32Array(2);
    crypto.getRandomValues(a);
    return a[0].toString(16) + a[1].toString(16);
  }
  return String(Date.now()) + Math.random().toString(16).slice(2);
}

function uniq(arr){ return [...new Set(arr)]; }

function locale(a,b){ return String(a||"").localeCompare(String(b||""),"vi"); }

function formatVND(n){
  return Number(n||0).toLocaleString("vi-VN") + "đ";
}

function esc(s){
  return String(s ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escAttr(s){ return esc(s).replaceAll("\n"," "); }
