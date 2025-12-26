const $ = (id) => document.getElementById(id);

let itemsCache = [];
let saleLines = [];

function setStatus(msg) { $("status").textContent = msg || ""; }

function loadAuth() {
  $("apiUrl").value = localStorage.getItem("inv_apiUrl") || "";
  $("token").value = localStorage.getItem("inv_token") || "";
}

function saveAuth() {
  localStorage.setItem("inv_apiUrl", $("apiUrl").value.trim());
  localStorage.setItem("inv_token", $("token").value.trim());
  setStatus("Đã lưu Apps Script URL + token.");
}

function getAuth() {
  const apiUrl = $("apiUrl").value.trim();
  const token = $("token").value.trim();
  if (!apiUrl) throw new Error("Chưa dán Apps Script Web App URL");
  if (!token) throw new Error("Chưa nhập token");
  return { apiUrl, token };
}

async function api(action, payload = {}) {
  const { apiUrl, token } = getAuth();
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, action, payload })
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || "API error");
  return data;
}

/************ MODAL ************/
function openModal(title, html) {
  $("modalTitle").textContent = title || "Preview";
  $("modalContent").innerHTML = html || "";
  $("modal").classList.remove("hidden");
}
function closeModal() { $("modal").classList.add("hidden"); }

/************ TABS ************/
function setTab(name) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll("section.panel").forEach(s => s.classList.add("hidden"));
  $("tab-" + name).classList.remove("hidden");
}

/************ INVENTORY ************/
function fillForm(item) {
  $("f_id").value = item.id || "";
  $("f_oem").value = item.oem || "";
  $("f_oem_alt").value = item.oem_alt || "";
  $("f_name").value = item.name || "";
  $("f_brand").value = item.brand || "";
  $("f_category").value = item.category || "";
  $("f_info").value = item.info || "";
  $("f_qty").value = Number(item.qty || 0);
  $("f_price").value = Number(item.price || 0);
}
function clearForm() { fillForm({}); }
function findItem(id) { return itemsCache.find(x => String(x.id) === String(id)); }

function renderTable(rows) {
  const tb = $("tbody");
  tb.innerHTML = "";

  rows.forEach((r) => {
    const tr = document.createElement("tr");

    const tdThumb = document.createElement("td");
    const thumb = document.createElement("div");
    thumb.className = "thumb";

    if (r.image_url) {
      const img = document.createElement("img");
      img.src = r.image_url.replace("/preview", "/view");
      thumb.appendChild(img);
      thumb.onclick = () => openModal("Ảnh: " + r.id, `<iframe src="${r.image_url}"></iframe>`);
    } else {
      thumb.textContent = "—";
      thumb.onclick = () => { fillForm(r); setTab("edit"); };
    }
    tdThumb.appendChild(thumb);
    tr.appendChild(tdThumb);

    const td = (t) => { const c = document.createElement("td"); c.textContent = t ?? ""; return c; };
    tr.appendChild(td(String(r.id || "")));
    tr.appendChild(td(String(r.oem || "")));
    tr.appendChild(td(String(r.oem_alt || "")));
    tr.appendChild(td(String(r.name || "")));
    tr.appendChild(td(String(r.brand || "")));
    tr.appendChild(td(String(r.category || "")));
    tr.appendChild(td(String(r.qty ?? "")));
    tr.appendChild(td(String(r.price ?? "")));

    const actions = document.createElement("td");
    actions.style.whiteSpace = "nowrap";

    const btnEdit = document.createElement("button");
    btnEdit.className = "btn btn-secondary";
    btnEdit.textContent = "Sửa";
    btnEdit.onclick = () => { fillForm(r); setTab("edit"); };

    const btnAddToSale = document.createElement("button");
    btnAddToSale.className = "btn";
    btnAddToSale.style.marginLeft = "8px";
    btnAddToSale.textContent = "Thêm vào đơn";
    btnAddToSale.onclick = () => {
      saleLines.push({ id: r.id, qty: 1, price: "" });
      renderSaleLines();
      setTab("sale");
    };

    actions.appendChild(btnEdit);
    actions.appendChild(btnAddToSale);
    tr.appendChild(actions);
    tb.appendChild(tr);
  });

  setStatus(`Hiển thị ${rows.length} mặt hàng.`);
}

async function reload() {
  setStatus("Đang tải dữ liệu kho...");
  const out = await api("list");
  itemsCache = out.data || [];
  renderTable(itemsCache);
}

async function search() {
  const q = $("q").value.trim();
  setStatus("Đang tìm...");
  const out = await api("search", { q });
  renderTable(out.data || []);
}

/************ CRUD ************/
function readFormPayload() {
  return {
    id: $("f_id").value.trim(),
    oem: $("f_oem").value.trim(),
    oem_alt: $("f_oem_alt").value.trim(),
    name: $("f_name").value.trim(),
    brand: $("f_brand").value.trim(),
    category: $("f_category").value.trim(),
    info: $("f_info").value.trim(),
    qty: Number($("f_qty").value || 0),
    price: Number($("f_price").value || 0)
  };
}

async function addItem() {
  const payload = readFormPayload();
  if (!payload.id) return setStatus("Thiếu Mã ID.");
  setStatus("Đang thêm...");
  await api("add", payload);
  setStatus("Đã thêm. Đang tải lại...");
  await reload();
}

async function updateItem() {
  const payload = readFormPayload();
  if (!payload.id) return setStatus("Thiếu Mã ID.");
  setStatus("Đang cập nhật...");
  await api("update", payload);
  setStatus("Đã cập nhật. Đang tải lại...");
  await reload();
}

async function deleteItem() {
  const id = $("f_id").value.trim();
  if (!id) return setStatus("Thiếu Mã ID.");
  if (!confirm("Xóa hàng ID=" + id + " ?")) return;
  setStatus("Đang xóa...");
  await api("delete", { id });
  setStatus("Đã xóa. Đang tải lại...");
  clearForm();
  await reload();
}

/************ STOCK IN ************/
async function stockIn() {
  const id = $("in_id").value.trim();
  const qty = Number($("in_qty").value || 0);
  const note = $("in_note").value.trim();
  if (!id) return setStatus("Thiếu ID nhập kho.");
  if (!qty || qty <= 0) return setStatus("Số lượng phải > 0.");
  setStatus("Đang nhập kho...");
  await api("stock_in", { id, qty, note });
  setStatus("Nhập kho OK. Tải lại...");
  $("in_id").value = "";
  $("in_qty").value = 1;
  $("in_note").value = "";
  await reload();
}

/************ IMAGE UPLOAD ************/
function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });
}

async function uploadImage() {
  const id = $("f_id").value.trim();
  if (!id) return setStatus("Nhập ID trước khi upload ảnh.");
  const f = $("imgFile").files && $("imgFile").files[0];
  if (!f) return setStatus("Chọn file ảnh trước.");

  setStatus("Đang đọc ảnh...");
  const dataUrl = await fileToDataUrl(f);

  setStatus("Đang upload lên Google Drive...");
  const out = await api("upload_image", { id, image_data_url: dataUrl });

  setStatus("Upload xong. Đang tải lại...");
  await reload();

  if (out.image && out.image.url) {
    openModal("Ảnh: " + id, `<iframe src="${out.image.url}"></iframe>`);
  }
}

function viewCurrentImage() {
  const id = $("f_id").value.trim();
  const it = findItem(id);
  if (!it || !it.image_url) return setStatus("Mặt hàng này chưa có ảnh.");
  openModal("Ảnh: " + id, `<iframe src="${it.image_url}"></iframe>`);
}

/************ SALE ************/
function renderSaleLines() {
  const tb = $("saleLines");
  tb.innerHTML = "";

  saleLines.forEach((ln, idx) => {
    const tr = document.createElement("tr");
    const td = (nodeOrText) => {
      const c = document.createElement("td");
      if (nodeOrText instanceof Node) c.appendChild(nodeOrText);
      else c.textContent = nodeOrText ?? "";
      return c;
    };

    tr.appendChild(td(ln.id));

    const inQty = document.createElement("input");
    inQty.className = "input";
    inQty.type = "number";
    inQty.step = "1";
    inQty.value = ln.qty;
    inQty.onchange = () => { ln.qty = Number(inQty.value || 0); renderSaleLines(); };
    tr.appendChild(td(inQty));

    const inPrice = document.createElement("input");
    inPrice.className = "input";
    inPrice.type = "number";
    inPrice.step = "1000";
    inPrice.placeholder = "giá";
    inPrice.value = ln.price;
    inPrice.onchange = () => { ln.price = inPrice.value; renderSaleLines(); };
    tr.appendChild(td(inPrice));

    const btnRm = document.createElement("button");
    btnRm.className = "btn btn-danger";
    btnRm.textContent = "Xóa";
    btnRm.onclick = () => { saleLines.splice(idx, 1); renderSaleLines(); };
    tr.appendChild(td(btnRm));

    tb.appendChild(tr);
  });

  let total = 0;
  for (const ln of saleLines) {
    const it = findItem(ln.id) || {};
    const price = (ln.price !== "" && ln.price !== null && ln.price !== undefined)
      ? Number(ln.price)
      : Number(it.price || 0);
    total += Number(ln.qty || 0) * price;
  }
  $("saleTotal").textContent = "Tổng: " + total.toLocaleString("vi-VN");
}

async function submitSale() {
  const order_code = $("s_order").value.trim();
  const customer = $("s_customer").value.trim();
  const date = $("s_date").value;
  const note = $("s_note").value.trim();

  if (!order_code) return setStatus("Thiếu mã đơn.");
  if (!date) return setStatus("Thiếu ngày.");
  if (!saleLines.length) return setStatus("Chưa có dòng hàng trong đơn.");

  const lines = saleLines.map(ln => ({
    id: ln.id,
    qty: Number(ln.qty || 0),
    price: ln.price === "" ? undefined : Number(ln.price)
  }));

  setStatus("Đang xuất/bán & lưu lịch sử...");
  const out = await api("sale", { order_code, customer, date, note, lines });

  setStatus("OK. Đang tải lại kho...");
  saleLines = [];
  renderSaleLines();
  await reload();

  openModal("Đã lưu lịch sử: " + out.tx.order_code, `<pre>${JSON.stringify(out.tx, null, 2)}</pre>`);
}

/************ HISTORY ************/
async function loadTx() {
  setStatus("Đang tải lịch sử...");
  const out = await api("tx_list");
  const rows = out.data || [];

  const tb = $("txBody");
  tb.innerHTML = "";

  rows.forEach((r) => {
    const tr = document.createElement("tr");
    const td = (t) => { const c = document.createElement("td"); c.textContent = t ?? ""; return c; };

    tr.appendChild(td(String(r.created_at || "")));
    tr.appendChild(td(String(r.type || "")));
    tr.appendChild(td(String(r.order_code || "")));
    tr.appendChild(td(String(r.customer || "")));
    tr.appendChild(td(String(r.date || "")));
    tr.appendChild(td(String(r.total || "")));
    tr.appendChild(td(String(r.note || "")));

    const btn = document.createElement("button");
    btn.className = "btn btn-secondary";
    btn.textContent = "Xem";
    btn.onclick = () => openModal("Chi tiết " + (r.tx_id || ""), `<pre>${String(r.lines_json || "")}</pre>`);

    const c = document.createElement("td");
    c.appendChild(btn);
    tr.appendChild(c);

    tb.appendChild(tr);
  });

  setStatus(`Đã tải ${rows.length} giao dịch.`);
}

/************ INIT ************/
function wireTabs() {
  document.querySelectorAll(".tab").forEach(btn => btn.onclick = () => setTab(btn.dataset.tab));
}
function wire() {
  $("btnSaveAuth").onclick = saveAuth;

  $("btnReload").onclick = () => reload().catch(e => setStatus("Lỗi: " + e.message));
  $("btnSearch").onclick = () => search().catch(e => setStatus("Lỗi: " + e.message));
  $("q").addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") search().catch(e => setStatus("Lỗi: " + e.message));
  });

  $("btnAdd").onclick = () => addItem().catch(e => setStatus("Lỗi: " + e.message));
  $("btnUpdate").onclick = () => updateItem().catch(e => setStatus("Lỗi: " + e.message));
  $("btnDelete").onclick = () => deleteItem().catch(e => setStatus("Lỗi: " + e.message));
  $("btnClear").onclick = clearForm;

  $("btnUploadImg").onclick = () => uploadImage().catch(e => setStatus("Lỗi: " + e.message));
  $("btnViewImg").onclick = viewCurrentImage;

  $("btnStockIn").onclick = () => stockIn().catch(e => setStatus("Lỗi: " + e.message));

  $("btnAddLine").onclick = () => {
    const id = $("l_id").value.trim();
    const qty = Number($("l_qty").value || 0);
    const price = $("l_price").value.trim();
    if (!id) return setStatus("Thiếu ID dòng hàng.");
    if (!qty || qty <= 0) return setStatus("SL phải > 0.");
    saleLines.push({ id, qty, price });
    $("l_id").value = "";
    $("l_qty").value = 1;
    $("l_price").value = "";
    renderSaleLines();
  };

  $("btnSubmitSale").onclick = () => submitSale().catch(e => setStatus("Lỗi: " + e.message));
  $("btnLoadTx").onclick = () => loadTx().catch(e => setStatus("Lỗi: " + e.message));

  $("modalClose").onclick = closeModal;
  $("modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });

  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  $("s_date").value = `${yyyy}-${mm}-${dd}`;
}

loadAuth();
wireTabs();
wire();
setStatus("Dán Web App URL + token → Lưu → Tải lại kho.");
