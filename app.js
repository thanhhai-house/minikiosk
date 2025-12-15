document.addEventListener("DOMContentLoaded", () => {
  // ===== Storage =====
  const KEY = "kiosk_parts_fix_full_v1";
  const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const save = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));

  // ===== State =====
  let items = load();
  let editingImageDataUrl = null;
  let activeType = "";
  let activeBrand = "";
  let detailTargetId = null;
  let currentAltBaseId = null;

  // ===== Elements =====
  const elList = document.getElementById("list");
  const elTypeButtons = document.getElementById("typeButtons");
  const elBrandButtons = document.getElementById("brandButtons");
  const elQ = document.getElementById("q");
  const btnClearSearch = document.getElementById("btnClearSearch");
  const btnReset = document.getElementById("btnReset");

  const elForm = document.getElementById("formPart");
  const elId = document.getElementById("id");
  const elIdView = document.getElementById("idView");
  const elOem = document.getElementById("oem");
  const elOemAlt = document.getElementById("oemAlt");
  const elName = document.getElementById("name");
  const elBrand = document.getElementById("brand");
  const elType = document.getElementById("type");
  const elPrice = document.getElementById("price");
  const elQty = document.getElementById("qty");
  const elNote = document.getElementById("note");
  const elImage = document.getElementById("image");
  const elPreviewImg = document.getElementById("previewImg");
  const elPreviewEmpty = document.getElementById("previewEmpty");
  const btnClear = document.getElementById("btnClear");

  // Detail dialog
  const dlgDetail = document.getElementById("dlgDetail");
  const dTitle = document.getElementById("dTitle");
  const dImg = document.getElementById("dImg");
  const dImgEmpty = document.getElementById("dImgEmpty");
  const dId = document.getElementById("dId");
  const dOem = document.getElementById("dOem");
  const dOemAlt = document.getElementById("dOemAlt");
  const dName = document.getElementById("dName");
  const dBrand = document.getElementById("dBrand");
  const dType = document.getElementById("dType");
  const dPrice = document.getElementById("dPrice");
  const dQty = document.getElementById("dQty");
  const dNote = document.getElementById("dNote");
  const btnAltFromDetail = document.getElementById("btnAltFromDetail");

  const altBox = document.getElementById("altBox");
  const altInfo = document.getElementById("altInfo");
  const btnOpenAltDetail = document.getElementById("btnOpenAltDetail");

  // Alternatives dialog
  const dlgAlt = document.getElementById("dlgAlt");
  const altTitle = document.getElementById("altTitle");
  const altSub = document.getElementById("altSub");
  const altList = document.getElementById("altList");

  // ===== Helpers =====
  const money = (v) => Number(v || 0).toLocaleString("vi-VN") + "₫";
  const norm = (s) => (s || "").toString().trim().toLowerCase();

  function makeId(){
    const d=new Date();
    const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
    const rnd=Math.random().toString(36).slice(2,6).toUpperCase();
    return `PT-${y}${m}${day}-${rnd}`;
  }

  function normalizeOem(s){ return (s||"").toString().trim().toUpperCase(); }
  function parseAltOems(raw){
    return (raw || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .map(normalizeOem);
  }
  function buildOemSet(item){
    const set = new Set();
    set.add(normalizeOem(item.oem));
    for(const x of (item.oemAlt || [])) set.add(normalizeOem(x));
    return set;
  }

  function uniqueTypes(arr){
    return [...new Set(arr.map(x=>x.type).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  }
  function uniqueBrands(arr){
    return [...new Set(arr.map(x=>x.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  }

  function setPreview(dataUrl){
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
    if(dataUrl){
      dImg.src=dataUrl; dImg.style.display="block"; dImgEmpty.style.display="none";
    }else{
      dImg.removeAttribute("src"); dImg.style.display="none"; dImgEmpty.style.display="block";
    }
  }

  function clearForm(){
    elId.value=""; elIdView.value="Tự tạo";
    elOem.value=""; elOemAlt.value="";
    elName.value=""; elBrand.value=""; elType.value="";
    elPrice.value=""; elQty.value=""; elNote.value="";
    elImage.value="";
    editingImageDataUrl=null;
    setPreview(null);
    document.getElementById("btnSave").textContent="Lưu";
  }

  // ===== Image preview FIX =====
  elImage.addEventListener("change", ()=>{
    const file = elImage.files?.[0];
    if(!file){ editingImageDataUrl=null; setPreview(null); return; }
    const reader=new FileReader();
    reader.onload=()=>{ editingImageDataUrl=reader.result; setPreview(editingImageDataUrl); };
    reader.readAsDataURL(file);
  });

  // ===== Filters =====
  function renderTypeButtons(){
    const types=uniqueTypes(items);
    const allCount=items.length;
    const btnAll=`<button class="typebtn ${activeType===""?"active":""}" onclick="__setType('')">Tất cả loại <small>${allCount} mặt hàng</small></button>`;
    const btns=types.map(t=>{
      const c=items.filter(x=>x.type===t).length;
      const safe=t.replaceAll("'","&#39;");
      return `<button class="typebtn ${activeType===t?"active":""}" onclick="__setType('${safe}')">${t} <small>${c} món</small></button>`;
    }).join("");
    elTypeButtons.innerHTML=btnAll+btns;
  }

  function renderBrandButtons(){
    const brands=uniqueBrands(items);
    const allCount=items.length;
    const btnAll=`<button class="typebtn ${activeBrand===""?"active":""}" onclick="__setBrand('')">Tất cả thương hiệu <small>${allCount} mặt hàng</small></button>`;
    const btns=brands.map(b=>{
      const c=items.filter(x=>x.brand===b).length;
      const safe=b.replaceAll("'","&#39;");
      return `<button class="typebtn ${activeBrand===b?"active":""}" onclick="__setBrand('${safe}')">${b} <small>${c} món</small></button>`;
    }).join("");
    elBrandButtons.innerHTML=btnAll+btns;
  }

  window.__setType = (t)=>{ activeType=t; render(); };
  window.__setBrand = (b)=>{ activeBrand=b; render(); };

  // ===== Render list =====
  function render(){
    renderTypeButtons();
    renderBrandButtons();

    const q = norm(elQ.value);

    const filtered = items
      .filter(it=>!activeType || it.type===activeType)
      .filter(it=>!activeBrand || it.brand===activeBrand)
      .filter(it=>{
        if(!q) return true;
        const hay = `${it.id} ${it.oem} ${(it.oemAlt||[]).join(" ")} ${it.name} ${it.brand} ${it.type} ${it.note}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a,b)=>(a.name||"").localeCompare(b.name||""));

    if(filtered.length===0){
      elList.innerHTML = `<div class="muted">Chưa có sản phẩm (hoặc không khớp tìm kiếm).</div>`;
      return;
    }

    elList.innerHTML = filtered.map(it=>{
      const altCount = (it.oemAlt||[]).length;
      const out = Number(it.qty||0) <= 0;
      return `
        <div class="card">
          <div class="img">
            ${it.image ? `<img src="${it.image}" alt="img" />` : `<div class="small">Không có hình</div>`}
          </div>
          <div class="body">
            <div class="small">ID: <b>${it.id}</b></div>
            <div class="small">OEM: <b>${it.oem || "-"}</b>${altCount?` • <b>${altCount}</b> mã thay`:``}</div>
            <h3 style="margin:6px 0 2px">${it.name || "-"}</h3>
            <div class="kv">
              <span class="tag">${it.brand||"-"}</span>
              <span class="tag">${it.type||"-"}</span>
              <span class="tag">Tồn: <b>${Number(it.qty||0)}</b></span>
              <span class="tag price">${money(it.price||0)}</span>
            </div>
            <div class="small" style="margin-top:6px">${(it.note||"").slice(0,90)}${(it.note||"").length>90?"…":""}</div>
            <div class="btns">
              <button class="btn ghost" onclick="__openDetail('${it.id}')">Chi tiết</button>
              <button class="btn ghost" onclick="__editItem('${it.id}')">Chỉnh sửa</button>
              <button class="btn ghost" onclick="__openAlternatives('${it.id}')">${out?"🔥 Thay thế":"Thay thế"}</button>
              <button class="btn danger" onclick="__delItem('${it.id}')">Xoá</button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // ===== CRUD =====
  window.__editItem = (id)=>{
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
    elImage.value="";
    setPreview(editingImageDataUrl);
    document.getElementById("btnSave").textContent="Cập nhật";
    window.scrollTo({top:0,behavior:"smooth"});
  };

  window.__delItem = (id)=>{
    const it=items.find(x=>x.id===id); if(!it) return;
    if(!confirm(`Xoá: ${it.name}\nOEM: ${it.oem}`)) return;
    items = items.filter(x=>x.id!==id);
    save(items);
    render();
  };

  // ===== Submit =====
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

    if(!oem || !name || !brand || !type || !note){
      alert("Nhập đủ: OEM, Tên, Thương hiệu, Loại, Ghi chú.");
      return;
    }

    const idx=items.findIndex(x=>x.id===id);
    const old=idx>=0?items[idx]:null;

    const payload={
      id, oem, oemAlt,
      name, brand, type, note,
      price, qty,
      image: editingImageDataUrl || old?.image || null,
      // ✅ sản phẩm thay thế “chính” do bạn chọn
      preferredAltId: old?.preferredAltId || null,
      createdAt: old?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    if(idx>=0) items[idx]=payload; else items.push(payload);

    save(items);
    clearForm();
    render();
  });

  btnClear.addEventListener("click", clearForm);

  // ===== Search =====
  elQ.addEventListener("input", render);
  btnClearSearch.addEventListener("click", ()=>{ elQ.value=""; render(); });

  // ===== Detail =====
  window.__openDetail = (id)=>{
    const it=items.find(x=>x.id===id); if(!it) return;
    detailTargetId=id;

    dTitle.textContent=`Chi tiết: ${it.name}`;
    dId.textContent=it.id;
    dOem.textContent=it.oem||"-";
    dOemAlt.textContent=(it.oemAlt && it.oemAlt.length)?it.oemAlt.join(", "):"-";
    dName.textContent=it.name||"-";
    dBrand.textContent=it.brand||"-";
    dType.textContent=it.type||"-";
    dPrice.textContent=money(it.price||0);
    dQty.textContent=String(it.qty??0);
    dNote.textContent=it.note||"-";
    setDetailImage(it.image);

    // ✅ Nếu có “thay thế chính” thì hiện luôn info của thằng thay thế
    const alt = it.preferredAltId ? items.find(x=>x.id===it.preferredAltId) : null;
    if(alt){
      altBox.style.display = "block";
      altInfo.innerHTML = `
        <div><b>${alt.name}</b> (Tồn: <b>${alt.qty}</b>)</div>
        <div class="small">OEM: <b>${alt.oem}</b></div>
        <div class="small">${alt.brand} • ${alt.type} • ${money(alt.price||0)}</div>
      `;
      btnOpenAltDetail.onclick = () => {
        dlgDetail.close();
        window.__openDetail(alt.id);
      };
    }else{
      altBox.style.display = "none";
      altInfo.textContent = "";
      btnOpenAltDetail.onclick = null;
    }

    dlgDetail.showModal();
  };

  // ===== Alternatives (popup có ảnh nếu có) =====
  window.__openAlternatives = (baseId)=>{
    const base = items.find(x=>x.id===baseId);
    if(!base) return;

    currentAltBaseId = baseId;
    const baseSet = buildOemSet(base);

    const alts = items
      .filter(x => x.id !== base.id)
      .map(x => ({ item: x, set: buildOemSet(x) }))
      .filter(x => {
        for(const k of x.set) if(baseSet.has(k)) return true;
        return false;
      })
      .map(x => x.item)
      .sort((a,b)=>Number(b.qty||0)-Number(a.qty||0));

    altTitle.textContent = `Gợi ý thay thế: ${base.name}`;
    altSub.textContent = `OEM: ${base.oem} • OEM thay thế: ${(base.oemAlt||[]).join(", ")||"-"} • Tồn: ${base.qty}`;

    if(alts.length===0){
      altList.innerHTML = `<div class="muted">Không có sản phẩm thay thế theo OEM tương đương. Hãy nhập thêm OEM thay thế.</div>`;
      dlgAlt.showModal();
      return;
    }

    altList.innerHTML = alts.slice(0,24).map(it=>{
      const chosen = (base.preferredAltId && base.preferredAltId===it.id);
      return `
        <div class="card">
          <div class="img">
            ${it.image ? `<img src="${it.image}" alt="img" />` : `<div class="small">Không có hình</div>`}
          </div>
          <div class="body">
            <div class="small">ID: <b>${it.id}</b></div>
            <div class="small">OEM: <b>${it.oem}</b></div>
            <h3 style="margin:6px 0 2px">${it.name}</h3>
            <div class="kv">
              <span class="tag">${it.brand}</span>
              <span class="tag">${it.type}</span>
              <span class="tag">Tồn: <b>${it.qty}</b></span>
              <span class="tag price">${money(it.price||0)}</span>
            </div>
            <div class="btns">
              <button class="btn ghost" onclick="__openDetail('${it.id}')">Xem</button>
              <button class="btn ${chosen ? "" : "ghost"}" onclick="__setPreferredAlt('${baseId}','${it.id}')">
                ${chosen ? "✅ Đang chọn" : "Chọn làm thay thế chính"}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    dlgAlt.showModal();
  };

  // ✅ Chọn “thay thế chính”: bấm vào sản phẩm gốc sẽ hiện info thay thế luôn
  window.__setPreferredAlt = (baseId, altId)=>{
    const base = items.find(x=>x.id===baseId);
    if(!base) return;
    base.preferredAltId = altId;
    base.updatedAt = Date.now();
    save(items);
    render();

    // refresh popup + refresh detail nếu đang mở
    window.__openAlternatives(baseId);
    if(dlgDetail.open && detailTargetId===baseId){
      window.__openDetail(baseId);
    }
  };

  btnAltFromDetail.addEventListener("click", ()=>{
    if(!detailTargetId) return;
    window.__openAlternatives(detailTargetId);
  });

  // ===== Reset =====
  btnReset.addEventListener("click", ()=>{
    if(!confirm("Xoá toàn bộ dữ liệu trên máy này?")) return;
    items = [];
    save(items);
    clearForm();
    render();
  });

  // ===== Init =====
  clearForm();
  render();
});
