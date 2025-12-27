// =================== CONFIG ===================
// Thay URL này bằng URL Web App Apps Script của bạn
// Ví dụ: https://script.google.com/macros/s/AKfycbxxxxx/exec
const API_BASE = "https://script.google.com/macros/s/AKfycbydN15dpCZPJ3XdvPBUh2r2G_T7sjGQOod1-xBnSYo-4wxQo-MHiPmsduvH0mzM0Q/exec";

// =================== HELPERS ===================
const $ = (id) => document.getElementById(id);

function setAuthStatus(text, ok=false){
  const el = $("authStatus");
  el.textContent = text;
  el.style.color = ok ? "rgba(63,208,122,.95)" : "";
}

function openModal(title){
  $("modalTitle").textContent = title;
  $("modal").setAttribute("aria-hidden", "false");
}
function closeModal(){
  $("modal").setAttribute("aria-hidden", "true");
}
document.addEventListener("click", (e)=>{
  if (e.target?.dataset?.close) closeModal();
});

// Preview images
function previewSingle(file, container){
  container.innerHTML = "";
  if(!file) return;
  const img = document.createElement("img");
  img.src = URL.createObjectURL(file);
  container.appendChild(img);
}
function previewMulti(files, container){
  container.innerHTML = "";
  [...(files || [])].slice(0, 9).forEach(f=>{
    const img = document.createElement("img");
    img.src = URL.createObjectURL(f);
    container.appendChild(img);
  });
}

// =================== API (simple) ===================
// Chuẩn form Apps Script:
// GET  /exec?action=list&q=...&brand=...&category=...&lowStock=1
// POST /exec  body: { action: 'login' | 'save' ... }
async function apiGet(params){
  const url = new URL(API_BASE);
  Object.entries(params).forEach(([k,v])=>{
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), { method: "GET" });
  if(!res.ok) throw new Error("API lỗi: " + res.status);
  return await res.json();
}

async function apiPost(data){
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if(!res.ok) throw new Error("API lỗi: " + res.status);
  return await res.json();
}

// =================== TABLE RENDER ===================
function money(n){
  const x = Number(n || 0);
  return x.toLocaleString("vi-VN");
}

function renderTable(items){
  const tbody = $("tbody");
  if(!items || items.length === 0){
    tbody.innerHTML = `<tr><td colspan="8" class="muted center">Không có kết quả.</td></tr>`;
    return;
  }
  tbody.innerHTML = items.map(it => `
    <tr>
      <td>${it.id ?? ""}</td>
      <td>${it.oem ?? ""}</td>
      <td>
        <div style="font-weight:700">${it.name ?? ""}</div>
        <div class="muted" style="margin-top:4px">${it.oem_alt ? ("OEM thay thế: " + it.oem_alt) : ""}</div>
      </td>
      <td>${it.brand ?? ""}</td>
      <td>${it.category ?? ""}</td>
      <td style="text-align:right">${money(it.price)}</td>
      <td style="text-align:right">${money(it.stock)}</td>
      <td>
        <button class="btn btn--ghost" data-edit="${it.id}">Sửa</button>
        <button class="btn" data-addcart="${it.id}">+ Giỏ</button>
      </td>
    </tr>
  `).join("");
}

// =================== STATE ===================
let token = "";
let cart = new Map(); // id -> qty

function updateCartCount(){
  let total = 0;
  for (const qty of cart.values()) total += qty;
  $("cartCount").textContent = String(total);
}

function fillForm(data){
  $("p_id").value = data?.id ?? "";
  $("p_price").value = data?.price ?? "";
  $("p_oem").value = data?.oem ?? "";
  $("p_oem_alt").value = data?.oem_alt ?? "";
  $("p_name").value = data?.name ?? "";
  $("p_brand").value = data?.brand ?? "";
  $("p_category").value = data?.category ?? "";
  $("p_desc").value = data?.desc ?? "";
  $("p_avatar").value = "";
  $("p_album").value = "";
  $("avatarPreview").innerHTML = "";
  $("albumPreview").innerHTML = "";
}

// =================== EVENTS ===================
$("btnLogin").addEventListener("click", async ()=>{
  const username = $("username").value.trim();
  const password = $("password").value;
  if(!username || !password){
    setAuthStatus("Nhập tài khoản + mật khẩu");
    return;
  }
  try{
    setAuthStatus("Đang đăng nhập...");
    // Bạn tự implement action=login ở Apps Script
    const r = await apiPost({ action:"login", username, password });
    if(r.ok){
      token = r.token || "";
      setAuthStatus("Đăng nhập thành công", true);
    }else{
      setAuthStatus(r.message || "Sai thông tin đăng nhập");
    }
  }catch(err){
    setAuthStatus("Không kết nối được API");
    console.error(err);
  }
});

$("btnSearch").addEventListener("click", async ()=>{
  try{
    const q = $("q").value.trim();
    const brand = $("brand").value;
    const category = $("category").value;
    const lowStock = $("lowStock").checked ? "1" : "";
    const r = await apiGet({ action:"list", q, brand, category, lowStock, token });
    renderTable(r.items || []);
  }catch(err){
    console.error(err);
    renderTable([]);
  }
});

$("q").addEventListener("keydown", (e)=>{
  if(e.key === "Enter") $("btnSearch").click();
});

$("btnAdd").addEventListener("click", ()=>{
  fillForm(null);
  openModal("Thêm sản phẩm");
});

$("btnSave").addEventListener("click", async ()=>{
  const payload = {
    action: "save",
    token,
    item: {
      id: $("p_id").value.trim(),
      price: $("p_price").value.trim(),
      oem: $("p_oem").value.trim(),
      oem_alt: $("p_oem_alt").value.trim(),
      name: $("p_name").value.trim(),
      brand: $("p_brand").value.trim(),
      category: $("p_category").value.trim(),
      desc: $("p_desc").value.trim(),
      // Ảnh: nếu muốn upload lên Drive/Sheet, bạn cần convert Base64
      // Ở đây giữ UI preview, phần upload bạn add sau theo API của bạn
    }
  };

  if(!payload.item.oem || !payload.item.name){
    alert("Thiếu OEM hoặc Tên");
    return;
  }

  try{
    const r = await apiPost(payload);
    if(r.ok){
      closeModal();
      $("btnSearch").click();
    }else{
      alert(r.message || "Lưu thất bại");
    }
  }catch(err){
    console.error(err);
    alert("Không kết nối được API");
  }
});

$("p_avatar").addEventListener("change", (e)=>{
  previewSingle(e.target.files?.[0], $("avatarPreview"));
});
$("p_album").addEventListener("change", (e)=>{
  previewMulti(e.target.files, $("albumPreview"));
});

// Table click: edit / add cart
document.addEventListener("click", async (e)=>{
  const editId = e.target?.dataset?.edit;
  const addCartId = e.target?.dataset?.addcart;
  if(editId){
    // Nếu API có action=getOne thì load chi tiết
    try{
      const r = await apiGet({ action:"getOne", id: editId, token });
      fillForm(r.item || { id: editId });
    }catch{
      fillForm({ id: editId });
    }
    openModal("Sửa sản phẩm");
  }
  if(addCartId){
    cart.set(addCartId, (cart.get(addCartId) || 0) + 1);
    updateCartCount();
  }
});

// CSV import/export (UI stub)
$("btnExport").addEventListener("click", ()=>{
  alert("Xuất CSV: bạn nối vào API action=export hoặc tự xuất từ items đang render.");
});
$("csvFile").addEventListener("change", ()=>{
  const f = $("csvFile").files?.[0];
  if(!f) return;
  alert("Nhập CSV: bạn đọc file CSV rồi gửi API action=import.");
});

// Init
setAuthStatus("Chưa đăng nhập");
updateCartCount();
