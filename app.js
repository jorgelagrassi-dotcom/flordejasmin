import {
  db,
  auth,
  storage,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  ref,
  uploadBytes,
  getDownloadURL,
} from "./firebase.js";

/* ==============================
   ELEMENTOS
============================== */
const screenLogin = document.getElementById("screenLogin");
const screenSystem = document.getElementById("screenSystem");

const btnLogin = document.getElementById("btnLogin");
const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");
const loginMsg = document.getElementById("loginMsg");

const userEmail = document.getElementById("userEmail");
const btnLogout = document.getElementById("btnLogout");

/* Produtos */
const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");
const productStockLoja = document.getElementById("productStockLoja");
const productStockBalcao = document.getElementById("productStockBalcao");
const productStockOnline = document.getElementById("productStockOnline");
const productPhoto = document.getElementById("productPhoto");

const btnAddProduct = document.getElementById("btnAddProduct");
const productMsg = document.getElementById("productMsg");
const productSearch = document.getElementById("productSearch");
const productList = document.getElementById("productList");

/* Estoque */
const entrySearch = document.getElementById("entrySearch");
const entrySuggestions = document.getElementById("entrySuggestions");
const entryLocation = document.getElementById("entryLocation");
const entryQty = document.getElementById("entryQty");
const entryDateTime = document.getElementById("entryDateTime");
const btnAddEntry = document.getElementById("btnAddEntry");
const entryMsg = document.getElementById("entryMsg");

/* Estoque List */
const stockFilterName = document.getElementById("stockFilterName");
const stockFilterLocation = document.getElementById("stockFilterLocation");
const stockList = document.getElementById("stockList");

/* ==============================
   💰 VENDA (CARRINHO)
============================== */

/* Venda */
const saleSearch = document.getElementById("saleSearch");
const saleSuggestions = document.getElementById("saleSuggestions");
const saleLocation = document.getElementById("saleLocation");
const saleQty = document.getElementById("saleQty");
const salePayment = document.getElementById("salePayment");
const saleDateTime = document.getElementById("saleDateTime");
const saleNote = document.getElementById("saleNote");
const btnAddSale = document.getElementById("btnAddSale");
const btnFinalizeSale = document.getElementById("btnFinalizeSale");
const saleCartBody = document.getElementById("saleCartBody");
const saleCartTotal = document.getElementById("saleCartTotal");
const saleMsg = document.getElementById("saleMsg");

/* 🛒 Carrinho em memória */
let saleCart = [];

/* ==============================
   🛒 ADICIONAR ITEM AO CARRINHO
============================== */
if (btnAddSale) {
  btnAddSale.addEventListener("click", async function () {

    saleMsg.innerText = "";

    if (!selectedSaleProduct) {
      showMsg(saleMsg, "Selecione um produto válido.", "#f87171");
      return;
    }

    const location = saleLocation.value;
    const qty = parseInt(saleQty.value);

    if (!qty || qty <= 0) {
      showMsg(saleMsg, "Quantidade inválida.", "#f87171");
      return;
    }

    const currentStock = await getStock(selectedSaleProduct.id, location);

    if (qty > currentStock) {
      showMsg(
        saleMsg,
        `Estoque insuficiente. Disponível: ${currentStock}`,
        "#f87171"
      );
      return;
    }

    const existingItem = saleCart.find(
      item =>
        item.productId === selectedSaleProduct.id &&
        item.location === location
    );

    if (existingItem) {
      existingItem.quantity += qty;
    } else {
      saleCart.push({
        productId: selectedSaleProduct.id,
        productName: selectedSaleProduct.name,
        quantity: qty,
        unitPrice: selectedSaleProduct.price,
        location: location
      });
    }

    renderSaleCart();

    saleSearch.value = "";
    saleQty.value = "";
    selectedSaleProduct = null;

    showMsg(saleMsg, "Item adicionado ao carrinho!", "#4ade80");
  });
}

/* ==============================
   ✅ FINALIZAR VENDA
============================== */
if (btnFinalizeSale) {
  btnFinalizeSale.addEventListener("click", async function () {

    saleMsg.innerText = "";

    if (saleCart.length === 0) {
      showMsg(saleMsg, "Adicione pelo menos um item ao carrinho.", "#f87171");
      return;
    }

    const payment = salePayment.value;
    const dateTime = saleDateTime.value;
    const note = saleNote.value;
    const discount = parseFloat(
      document.getElementById("saleDiscount")?.value || 0
    );

    if (discount < 0) {
      showMsg(saleMsg, "Desconto inválido.", "#f87171");
      return;
    }

    const saleGroupId = generateSaleGroupId();

    let subtotalGeral = 0;
    saleCart.forEach(item => {
      subtotalGeral += item.quantity * item.unitPrice;
    });

    if (discount > subtotalGeral) {
      showMsg(saleMsg, "Desconto maior que o total da venda.", "#f87171");
      return;
    }

    for (const item of saleCart) {

      const itemSubtotal = item.quantity * item.unitPrice;

      await addDoc(collection(db, "sales"), {
        saleGroupId,
        productId: item.productId,
        productName: item.productName,
        location: item.location,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: itemSubtotal,
        discount: 0,
        total: itemSubtotal,
        paymentMethod: payment,
        note,
        createdAt: todayISOFromLocal(dateTime),
      });

      await updateStock(
        item.productId,
        item.productName,
        item.location,
        -item.quantity
      );
    }

    saleCart = [];
    renderSaleCart();

    saleSearch.value = "";
    saleQty.value = "";
    saleNote.value = "";
    document.getElementById("saleDiscount").value = "";
    selectedSaleProduct = null;

    showMsg(saleMsg, "Venda finalizada com sucesso!", "#4ade80");

    await loadStock();
    await loadDashboard();
    await loadReports();
  });
}

/* ==============================
   🛒 ADICIONAR ITEM AO CARRINHO
============================== */

if (btnAddSale) {
  btnAddSale.addEventListener("click", async () => {

    saleMsg.innerText = "";

    if (!selectedSaleProduct) {
      showMsg(saleMsg, "Selecione um produto válido.", "#f87171");
      return;
    }

    const location = saleLocation.value;
    const qty = parseInt(saleQty.value);

    if (!qty || qty <= 0) {
      showMsg(saleMsg, "Quantidade inválida.", "#f87171");
      return;
    }

    const currentStock = await getStock(selectedSaleProduct.id, location);

    if (qty > currentStock) {
      showMsg(
        saleMsg,
        `Estoque insuficiente. Disponível: ${currentStock}`,
        "#f87171"
      );
      return;
    }

   // 🔹 Adiciona item ao carrinho
saleCart.push({
  productId: selectedSaleProduct.id,
  productName: selectedSaleProduct.name,
  quantity: qty,
  unitPrice: selectedSaleProduct.price,
  location
});

renderSaleCart();

// 🔹 Limpa campos para próximo item
saleSearch.value = "";
saleQty.value = "";
selectedSaleProduct = null;

showMsg(saleMsg, "Item adicionado ao carrinho!", "#4ade80");
  });
}
/* ==============================
   CONTAGEM
============================== */
const countFilterProduct = document.getElementById("countFilterProduct");
const countLocation = document.getElementById("countLocation");
const countDateTime = document.getElementById("countDateTime");
const countTableBody = document.getElementById("countTableBody");
const btnSaveCount = document.getElementById("btnSaveCount");
const countMsg = document.getElementById("countMsg");

// Quando mudar o local, recarrega tabela
if (countLocation) {
  countLocation.addEventListener("change", loadCountTable);
}

// Quando digitar no filtro de produto, recarrega tabela
if (countFilterProduct) {
  countFilterProduct.addEventListener("input", loadCountTable);
}

// Botão Registrar Contagem do Local (mantido caso você queira usar ainda)
if (btnSaveCount) {
  btnSaveCount.addEventListener("click", saveCount);
}

async function saveCount() {
  const location = countLocation.value;
  const dateTime = countDateTime.value;

  if (!location || !dateTime) return;

  const rows = countTableBody.querySelectorAll("tr");

  for (const row of rows) {
    const input = row.querySelector(".new-count-input");
    if (!input) continue;

    const productId = input.dataset.productId;
    const currentQty = parseInt(input.dataset.currentQty);
    const newQtyRaw = input.value;

    const newQty = newQtyRaw === ""
      ? currentQty
      : parseInt(newQtyRaw);

    if (isNaN(newQty)) continue;

    const delta = newQty - currentQty;

    // Se não houve alteração, ignora
if (delta === 0) continue;

// Busca produto na memória (já carregado)
const product = PRODUCTS.find((p) => p.id === productId);

if (!product) continue;


    // Se diminuiu estoque → gerar venda automática HOTEL
    if (delta < 0) {
      const qtyVendida = Math.abs(delta);
      const total = qtyVendida * product.price;

      await addDoc(collection(db, "sales"), {
        productId: product.id,
        productName: product.name,
        location,
        quantity: qtyVendida,
        unitPrice: product.price,
        total,
        paymentMethod: "HOTEL",
        note: "VENDA AUTOMÁTICA - CONTAGEM",
        createdAt: todayISOFromLocal(dateTime),
      });
    }

    // Atualiza estoque para novo valor
    await updateStock(
      product.id,
      product.name,
      location,
      delta
    );

    // Atualiza data/hora do estoque
    const stockRef = doc(db, "stock", `${product.id}_${location}`);
    await updateDoc(stockRef, {
      updatedAt: todayISOFromLocal(dateTime),
    });
  }

  await loadStock();
  //await loadReports();
  await loadDashboard();
  await loadCountTable();
}





/* Relatórios */
const reportSearch = document.getElementById("reportSearch");
const reportLocation = document.getElementById("reportLocation");
const btnLoadReports = document.getElementById("btnLoadReports");
const reportTotal = document.getElementById("reportTotal");
const reportList = document.getElementById("reportList");

const filterSaleLocation = document.getElementById("filterSaleLocation");
const filterSalePayment = document.getElementById("filterSalePayment");
const filterSaleStart = document.getElementById("filterSaleStart");
const filterSaleEnd = document.getElementById("filterSaleEnd");

filterSaleLocation.addEventListener("change", loadReports);
filterSalePayment.addEventListener("change", loadReports);
filterSaleStart.addEventListener("change", loadReports);
filterSaleEnd.addEventListener("change", loadReports);

/* Impressão */
const btnPrintNow = document.getElementById("btnPrintNow");
const btnGeneratePrint = document.getElementById("btnGeneratePrint");
const printPreview = document.getElementById("printPreview");
const printStartDate = document.getElementById("printStartDate");
const printEndDate = document.getElementById("printEndDate");
const printLocation = document.getElementById("printLocation");

if (btnGeneratePrint && printPreview) {
  btnGeneratePrint.addEventListener("click", async () => {

    const snap = await getDocs(collection(db, "sales"));
    let sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const startFilter = printStartDate?.value;
    const endFilter = printEndDate?.value;
    const locationFilter = printLocation?.value;

    sales = sales.filter((s) => {
      const saleDate = new Date(s.createdAt);

      if (startFilter && saleDate < new Date(startFilter)) return false;
      if (endFilter && saleDate > new Date(endFilter)) return false;
      if (locationFilter && s.location !== locationFilter) return false;

      return true;
    });

    sales.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    let totalGeral = 0;

    let html = `<div class="print-header">RELATÓRIO DE VENDAS — ${startFilter || "—"} até ${endFilter || "—"} — Local: ${locationFilter || "TODOS"}</div>`;
  
  html += `
    <table border="1" cellspacing="0" cellpadding="4" width="100%">
      <thead>
        <tr>
          <th>Produto</th>
          <th>Local</th>
          <th>Qtd</th>
          <th>Total</th>
          <th>Pagamento</th>
          <th>Data</th>
          <th>Estoque</th>
          <th>Atenção</th>
        </tr>
      </thead>
      <tbody>
  `;

    sales.forEach((s) => {
      totalGeral += s.total || 0;

      const stockItems = STOCK.filter(st => st.productId === s.productId);
      const estoqueTotal = stockItems.reduce((acc, st) => acc + (st.quantity || 0), 0);

      let alerta = "";
      if (estoqueTotal === 0) alerta = "ITEM ZERADO";
      else if (estoqueTotal <= 3) alerta = `RESTAM ${estoqueTotal}`;

      html += `
        <tr>
          <td>${s.productName}</td>
          <td>${s.location}</td>
          <td>${s.quantity}</td>
          <td>${formatMoney(s.total || 0)}</td>
          <td>${s.paymentMethod}</td>
          <td>${new Date(s.createdAt).toLocaleString("pt-BR")}</td>
          <td>${estoqueTotal}</td>
          <td>${alerta}</td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <hr>
      <h3>Total Geral: ${formatMoney(totalGeral)}</h3>
    `;

    printPreview.innerHTML = html;
  });
}

if (btnPrintNow) {
  btnPrintNow.addEventListener("click", () => {

    const conteudo = printPreview.innerHTML;

    const janela = window.open("", "", "width=1200,height=800");

    janela.document.write(`
      <html>
        <head>
          <title>Relatório</title>
          <style>
            @page { size: A4 landscape; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #000; padding: 4px; font-size: 11px; }
            thead { display: table-header-group; }
          </style>
        </head>
        <body>
          ${conteudo}
        </body>
      </html>
    `);

    janela.document.close();
    janela.focus();
    janela.print();
    janela.close();
  });
}

/* Dashboard */
const statProducts = document.getElementById("statProducts");
const statSales = document.getElementById("statSales");
const statSalesTotal = document.getElementById("statSalesTotal");

/* ==============================
   VARIÁVEIS
============================== */
let PRODUCTS = [];
let STOCK = [];
let selectedEntryProduct = null;
let selectedSaleProduct = null;
let selectedCountProduct = null;

/* ==============================
   🔎 BUSCA DINÂMICA - VENDAS
============================== */

if (saleSearch) {
  saleSearch.addEventListener("input", () => {
    const term = toUpperText(saleSearch.value);

    saleSuggestions.innerHTML = "";
    selectedSaleProduct = null;

    if (!term) return;

    const results = PRODUCTS
      .filter(p => p.active !== false)
      .filter(p => p.name.includes(term))
      .slice(0, 5);

    results.forEach(product => {
      const div = document.createElement("div");
      div.classList.add("suggestion-item");
      div.innerText = `${product.name} (${formatMoney(product.price)})`;

      div.addEventListener("click", () => {
        selectedSaleProduct = product;
        saleSearch.value = product.name;
        saleSuggestions.innerHTML = "";
      });

      saleSuggestions.appendChild(div);
    });
  });
}

/* ==============================
   FUNÇÕES AUXILIARES
============================== */
function showMsg(el, text, color = "#fbbf24") {
  el.innerText = text;
  el.style.color = color;
}

function gerarCodigo(nome, seq) {
  let letras = nome
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 4);

  while (letras.length < 4) letras += "X";

  return `${letras}${String(seq).padStart(4, "0")}`;
}

function formatMoney(v) {
  return (v || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}



/* ==============================
   🛒 RENDERIZAR CARRINHO
============================== */
function renderSaleCart() {
  if (!saleCartBody || !saleCartTotal) return;

  saleCartBody.innerHTML = "";

  let total = 0;

  saleCart.forEach((item, index) => {
    const subtotal = item.quantity * item.unitPrice;
    total += subtotal;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${item.productName}</td>
      <td>${item.quantity}</td>
      <td>${formatMoney(item.unitPrice)}</td>
      <td>${formatMoney(subtotal)}</td>
      <td>
        <button class="action-btn action-hide">Remover</button>
      </td>
    `;

    const btnRemove = tr.querySelector("button");

    btnRemove.addEventListener("click", () => {
      saleCart.splice(index, 1);
      renderSaleCart();
    });

    saleCartBody.appendChild(tr);
  });

  saleCartTotal.innerText = formatMoney(total);
}

function toUpperText(t) {
  if (!t) return "";
  return t.toString().toUpperCase().trim();
}

function nowDateTimeLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function todayISOFromLocal(localValue) {
  if (!localValue) return null;
  return new Date(localValue).toISOString();
}

/* ==============================
   🔑 GERAR ID DE GRUPO DA VENDA
============================== */
function generateSaleGroupId() {
  const now = new Date();
  const time = now.getTime().toString(36);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `GRP-${time}-${random}`;
}

async function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = maxWidth / img.width;

      canvas.width = maxWidth;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject("Erro ao comprimir imagem");
          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ==============================
   MENU / TABS
============================== */
document.querySelectorAll(".menu-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".menu-btn").forEach((b) =>
      b.classList.remove("active")
    );
    btn.classList.add("active");

    const tabId = btn.getAttribute("data-tab");
    document.querySelectorAll(".tab").forEach((tab) =>
      tab.classList.add("hidden")
    );
    document.getElementById(tabId).classList.remove("hidden");
  });
});

/* ==============================
   LOGIN
============================== */
btnLogin.addEventListener("click", async () => {
  loginMsg.innerText = "";

  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
  } catch (err) {
    showMsg(loginMsg, "Erro no login. Verifique email e senha.", "#f87171");
  }
});

btnLogout.addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    screenLogin.classList.add("hidden");
    screenSystem.classList.remove("hidden");

    userEmail.innerText = user.email;
    btnLogout.classList.remove("hidden");

    // 🔒 Proteção contra elementos removidos/comentados
    if (typeof entryDateTime !== "undefined" && entryDateTime) {
      entryDateTime.value = nowDateTimeLocal();
    }

    if (typeof saleDateTime !== "undefined" && saleDateTime) {
      saleDateTime.value = nowDateTimeLocal();
    }

    if (typeof countDateTime !== "undefined" && countDateTime) {
      countDateTime.value = nowDateTimeLocal();
    }

    await loadAll();

  } else {
    screenLogin.classList.remove("hidden");
    screenSystem.classList.add("hidden");

    userEmail.innerText = "";
    btnLogout.classList.add("hidden");
  }
});

/* ==============================
   CARREGAR DADOS
============================== */
async function loadAll() {
  await loadProducts();
  await loadStock();
  await loadDashboard();
  await loadReports(); // ✅ Relatórios carregam junto
}


async function loadProducts() {
  const snap = await getDocs(collection(db, "products"));
  PRODUCTS = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  renderProductList();
}

async function loadStock() {
  const snap = await getDocs(collection(db, "stock"));
  STOCK = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  renderStockList();
}


/* ==============================
   FILTRO ESTOQUE
============================== */

if (stockFilterName) {
  stockFilterName.addEventListener("input", () => {
    renderStockList();
  });
}

if (stockFilterLocation) {
  stockFilterLocation.addEventListener("change", () => {
    renderStockList();
  });
}

function renderProductList() {
  productList.innerHTML = "";

  const filter = toUpperText(productSearch.value);

  PRODUCTS.filter((p) => p.active !== false)
    .filter((p) => p.name.includes(filter))
    .forEach((p) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>
          ${
            p.photoURL
              ? `<img class="product-photo" src="${p.photoURL}" />`
              : "-"
          }
        </td>
        <td data-label="Código">${p.code}</td>
        <td>${p.name}</td>
        <td>${formatMoney(p.price)}</td>
        <td>
          <button class="action-btn action-edit" data-id="${p.id}">EDITAR</button>
          <button class="action-btn action-hide" data-id="${p.id}">OCULTAR</button>
        </td>
      `;

      productList.appendChild(tr);
    });

  document.querySelectorAll(".action-edit").forEach((btn) => {
    btn.addEventListener("click", () => editProduct(btn.dataset.id));
  });

  document.querySelectorAll(".action-hide").forEach((btn) => {
    btn.addEventListener("click", () => hideProduct(btn.dataset.id));
  });
}

function renderStockList() {
  stockList.innerHTML = "";

  const filterName = (stockFilterName?.value || "").toUpperCase().trim();
  const filterLocation = stockFilterLocation?.value || "";

  STOCK
    .filter((s) => {
      const productName = (s.productName || "").toUpperCase();

      const matchName =
        !filterName || productName.includes(filterName);

      const matchLocation =
        !filterLocation || s.location === filterLocation;

      return matchName && matchLocation;
    })
    .sort((a, b) => a.productName.localeCompare(b.productName))
    .forEach((s) => {
      const tr = document.createElement("tr");

      const qtyClass =
        s.quantity === 0 ? "stock-zero" : "stock-ok";

      tr.innerHTML = `
        <td data-label="Produto">${s.productName}</td>
        <td data-label="Local">${s.location}</td>
        <td data-label="Atual" class="${qtyClass}">
          ${s.quantity}
        </td>
        <td data-label="Ajuste">
          <input 
            type="number"
            class="stock-adjust-input"
            placeholder="+ ou -"
          >
        </td>
        <td data-label="Ação">
          <button class="action-btn action-edit-stock">
            SALVAR
          </button>
        </td>
      `;

      stockList.appendChild(tr);

      const input = tr.querySelector(".stock-adjust-input");
      const btn = tr.querySelector(".action-edit-stock");

      btn.addEventListener("click", async () => {
        const value = parseInt(input.value);

        if (!value || isNaN(value)) return;

        await updateStock(
          s.productId,
          s.productName,
          s.location,
          value
        );

        await loadStock();
      });
    });
}/* ==============================
   CADASTRO DE PRODUTO
============================== */
btnAddProduct.addEventListener("click", async () => {
  productMsg.innerText = "";

  const name = toUpperText(productName.value);
  const price = parseFloat(productPrice.value);

  // 🔹 Se campo estiver vazio, vira 0 automaticamente
  const loja = productStockLoja.value === "" ? 0 : parseInt(productStockLoja.value);
  const balcao = productStockBalcao.value === "" ? 0 : parseInt(productStockBalcao.value);
  const online = productStockOnline.value === "" ? 0 : parseInt(productStockOnline.value);

  if (!name) return showMsg(productMsg, "Nome obrigatório.", "#f87171");
  if (!price || isNaN(price) || price <= 0)
    return showMsg(productMsg, "Preço inválido.", "#f87171");

  // 🔹 Agora só valida negativo
  if (loja < 0) return showMsg(productMsg, "Estoque LOJA inválido.", "#f87171");
  if (balcao < 0) return showMsg(productMsg, "Estoque BALCÃO inválido.", "#f87171");
  if (online < 0) return showMsg(productMsg, "Estoque ONLINE inválido.", "#f87171");

  const seq = PRODUCTS.length + 1;
  const code = gerarCodigo(name, seq);

  let photoURL = "";

  if (productPhoto.files.length > 0) {
    const file = productPhoto.files[0];
    const compressedBlob = await compressImage(file, 800, 0.7);

    const storageRef = ref(storage, `products/${code}.jpg`);
    await uploadBytes(storageRef, compressedBlob);
    photoURL = await getDownloadURL(storageRef);
  }

  const docRef = await addDoc(collection(db, "products"), {
    code,
    name,
    price,
    photoURL,
    active: true,
    createdAt: new Date().toISOString(),
  });

  await setDoc(doc(db, "stock", `${docRef.id}_LOJA`), {
    productId: docRef.id,
    productName: name,
    location: "LOJA",
    quantity: loja,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(doc(db, "stock", `${docRef.id}_BALCAO`), {
    productId: docRef.id,
    productName: name,
    location: "BALCAO",
    quantity: balcao,
    updatedAt: new Date().toISOString(),
  });

  await setDoc(doc(db, "stock", `${docRef.id}_ONLINE`), {
    productId: docRef.id,
    productName: name,
    location: "ONLINE",
    quantity: online,
    updatedAt: new Date().toISOString(),
  });

  productName.value = "";
  productPrice.value = "";
  productStockLoja.value = "";
  productStockBalcao.value = "";
  productStockOnline.value = "";
  productPhoto.value = "";

  showMsg(productMsg, "Produto cadastrado com sucesso!", "#4ade80");

  await loadAll();
});

/* ==============================
   EDITAR / OCULTAR PRODUTO
============================== */
async function editProduct(productId) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;

  const newName = prompt("Editar Nome do Produto:", product.name);
  if (!newName) return;

  const newPrice = prompt("Editar Preço:", product.price);
  if (!newPrice) return;

  const price = parseFloat(newPrice);
  if (!price || isNaN(price) || price <= 0) {
    alert("Preço inválido.");
    return;
  }

  await updateDoc(doc(db, "products", productId), {
    name: toUpperText(newName),
    price,
  });

  alert("Produto atualizado com sucesso!");
  await loadAll();
}

async function hideProduct(productId) {
  const ok = confirm("Tem certeza que deseja OCULTAR este produto?");
  if (!ok) return;

  await updateDoc(doc(db, "products", productId), {
    active: false,
  });

  alert("Produto ocultado. Ele não aparecerá mais no sistema.");
  await loadAll();
}


// ==============================
// 🔥 CONTROLE DE ESTOQUE
// ==============================

async function getStock(productId, location) {
  const stockRef = doc(db, "stock", `${productId}_${location}`);
  const snap = await getDoc(stockRef);

  if (!snap.exists()) return 0;

  return snap.data().quantity || 0;
}

async function updateStock(productId, productName, location, delta) {
  const stockRef = doc(db, "stock", `${productId}_${location}`);
  const snap = await getDoc(stockRef);

  if (!snap.exists()) {
    // cria se não existir
    await setDoc(stockRef, {
      productId,
      productName,
      location,
      quantity: delta,
      updatedAt: new Date().toISOString(),
    });
  } else {
    const currentQty = snap.data().quantity || 0;
    const newQty = currentQty + delta;

    await updateDoc(stockRef, {
      quantity: newQty,
      updatedAt: new Date().toISOString(),
    });
  }
}


/* ==============================
   DASHBOARD
============================== */
async function loadDashboard() {
  const productsSnap = await getDocs(collection(db, "products"));
  const salesSnap = await getDocs(collection(db, "sales"));

  let activeProducts = 0;

  productsSnap.docs.forEach((d) => {
    const p = d.data();
    if (p.active !== false) activeProducts++;
  });

  let totalVendido = 0;
  salesSnap.docs.forEach((d) => {
    totalVendido += d.data().total || 0;
  });

  if (statProducts) statProducts.innerText = activeProducts;
  if (statSales) statSales.innerText = salesSnap.size;
  if (statSalesTotal) statSalesTotal.innerText = formatMoney(totalVendido);
}/* ==============================
   CONTAGEM - Carregar tabela com filtro por produto e local
============================== */
async function loadCountTable() {

  const location = countLocation?.value || "";
  const productFilter = (countFilterProduct?.value || "").toUpperCase().trim();

  if (!countTableBody) return;

  try {
    const snap = await getDocs(collection(db, "stock"));

    let stockItems = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    // 🔎 FILTRO POR PRODUTO (busca parcial)
    if (productFilter) {
      stockItems = stockItems.filter((s) =>
        (s.productName || "").toUpperCase().includes(productFilter)
      );
    }

    // 🔎 FILTRO POR LOCAL (opcional)
    if (location) {
      stockItems = stockItems.filter((s) => s.location === location);
    }

    stockItems.sort((a, b) =>
      a.productName.localeCompare(b.productName)
    );

    countTableBody.innerHTML = "";

    stockItems.forEach((item) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${item.productName}</td>

        <td>
          ${item.quantity}
          <br>
          <small>
            ${
              item.updatedAt
                ? new Date(item.updatedAt).toLocaleString("pt-BR")
                : "-"
            }
          </small>
        </td>

        <td>
          <input 
            type="number"
            min="0"
            value="${item.quantity}"
            class="new-count-input"
          >
        </td>

        <td>
          <button class="action-btn action-edit-stock">
            SALVAR
          </button>
        </td>
      `;

      const input = tr.querySelector(".new-count-input");
      const btnSave = tr.querySelector(".action-edit-stock");

      btnSave.addEventListener("click", async () => {

        const newQty = parseInt(input.value);
        if (isNaN(newQty)) return;

        const delta = newQty - item.quantity;
        if (delta === 0) return;

        const product = PRODUCTS.find((p) => p.id === item.productId);
        if (!product) return;

        // 🔻 Se diminuiu → gera venda automática HOTEL
if (delta < 0) {
  const qtyVendida = Math.abs(delta);
  const total = qtyVendida * product.price;

  const saleGroupId = generateSaleGroupId();

  await addDoc(collection(db, "sales"), {
    saleGroupId,
    productId: product.id,
    productName: product.name,
    location: item.location,
    quantity: qtyVendida,
    unitPrice: product.price,
    total,
    paymentMethod: "HOTEL",
    note: "VENDA AUTOMÁTICA - CONTAGEM",
    createdAt: todayISOFromLocal(countDateTime.value),
  });
}

        await updateStock(
          product.id,
          product.name,
          item.location,
          delta
        );

        await loadStock();
        await loadDashboard();
        await loadCountTable();
      });

      countTableBody.appendChild(tr);
    });

  } catch (error) {
    console.error("Erro ao carregar tabela de contagem:", error);
  }
}
/* ==============================
   RELATÓRIOS
============================== */
async function loadReports() {
  if (!reportList) return;

  const snap = await getDocs(collection(db, "sales"));
  let sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const locationFilter = filterSaleLocation?.value;
  const paymentFilter = filterSalePayment?.value;
  const startFilter = filterSaleStart?.value;
  const endFilter = filterSaleEnd?.value;

  const today = new Date().toLocaleDateString("pt-BR");

  sales = sales.filter((s) => {
    let ok = true;

    const saleDate = new Date(s.createdAt);
    const saleDay = saleDate.toLocaleDateString("pt-BR");

    // 🔥 Se NÃO houver filtro de data → mostra apenas hoje
    if (!startFilter && !endFilter) {
      if (saleDay !== today) ok = false;
    }

    if (locationFilter && locationFilter !== "TODOS") {
      if (s.location !== locationFilter) ok = false;
    }

    if (paymentFilter && paymentFilter !== "TODOS") {
      if (s.paymentMethod !== paymentFilter) ok = false;
    }

    if (startFilter && saleDate < new Date(startFilter)) ok = false;
    if (endFilter && saleDate > new Date(endFilter)) ok = false;

    return ok;
  });

  // 🔥 Mais recente primeiro
  sales.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  reportList.innerHTML = "";

  const grouped = {};

  sales.forEach((s) => {
    const day = new Date(s.createdAt).toLocaleDateString("pt-BR");

    if (!grouped[day]) {
      grouped[day] = {
        sales: [],
        totals: {
          PIX: 0,
          DINHEIRO: 0,
          MAQUINA_LOJA: 0,
          MAQUINA_BALCAO: 0,
          total: 0,
        },
      };
    }

    grouped[day].sales.push(s);

    const metodo =
      s.paymentMethod === "HOTEL"
        ? "MAQUINA_BALCAO"
        : s.paymentMethod;

    if (!grouped[day].totals[metodo]) {
      grouped[day].totals[metodo] = 0;
    }

    grouped[day].totals[metodo] += s.total || 0;
    grouped[day].totals.total += s.total || 0;
  });

  Object.keys(grouped).forEach((day) => {

    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
      <td colspan="7" class="report-day-header">
        📅 ${day}
      </td>
    `;
    reportList.appendChild(headerRow);

    grouped[day].sales.forEach((s) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${s.productName}</td>
        <td>${s.location}</td>
        <td>${s.quantity}</td>
        <td>${formatMoney(s.total || 0)}</td>
        <td>${s.paymentMethod}</td>
        <td>${s.createdAt ? new Date(s.createdAt).toLocaleString("pt-BR") : "-"}</td>
        <td>
          <button class="action-btn action-edit-sale">EDITAR</button>
          <button class="action-btn action-delete-sale">EXCLUIR</button>
        </td>
      `;

      reportList.appendChild(tr);

      tr.querySelector(".action-delete-sale").addEventListener("click", () => {
        deleteSale(s);
      });

      tr.querySelector(".action-edit-sale").addEventListener("click", () => {
        editSale(s);
      });
    });

    const footerRow = document.createElement("tr");
    footerRow.innerHTML = `
      <td colspan="7" class="report-day-total">
        <div class="day-total-grid">
          <div>PIX<br><strong>${formatMoney(grouped[day].totals.PIX)}</strong></div>
          <div>DINHEIRO<br><strong>${formatMoney(grouped[day].totals.DINHEIRO)}</strong></div>
          <div>MÁQ LOJA<br><strong>${formatMoney(grouped[day].totals.MAQUINA_LOJA)}</strong></div>
          <div>MÁQ BALCÃO<br><strong>${formatMoney(grouped[day].totals.MAQUINA_BALCAO)}</strong></div>
          <div class="day-total-final">
            TOTAL<br>
            <strong>${formatMoney(grouped[day].totals.total)}</strong>
          </div>
        </div>
      </td>
    `;
    reportList.appendChild(footerRow);
  });
}

/* ==============================
   EDITAR VENDA
============================== */
async function editSale(sale) {
  try {
    const newQtyStr = prompt(
      `Editar quantidade da venda:\n\nProduto: ${sale.productName}\nQuantidade atual: ${sale.quantity}`,
      sale.quantity
    );

    if (!newQtyStr) return;

    const newQty = parseInt(newQtyStr);

    if (isNaN(newQty) || newQty <= 0) {
      alert("Quantidade inválida.");
      return;
    }

    if (newQty === sale.quantity) {
      alert("Nenhuma alteração feita.");
      return;
    }

    // 1️⃣ Devolve estoque antigo
    await updateStock(
      sale.productId,
      sale.productName,
      sale.location,
      sale.quantity
    );

    // 2️⃣ Verifica estoque disponível
    const currentStock = await getStock(
      sale.productId,
      sale.location
    );

    if (newQty > currentStock) {
      alert(`Estoque insuficiente. Disponível: ${currentStock}`);

      // desfaz devolução
      await updateStock(
        sale.productId,
        sale.productName,
        sale.location,
        -sale.quantity
      );

      return;
    }

    // 3️⃣ Aplica nova quantidade
    await updateStock(
      sale.productId,
      sale.productName,
      sale.location,
      -newQty
    );

    const newTotal = newQty * sale.unitPrice;

    await updateDoc(doc(db, "sales", sale.id), {
      quantity: newQty,
      total: newTotal,
    });

    await loadStock();
    await loadDashboard();
    await loadReports();

    alert("Venda editada com sucesso!");

  } catch (error) {
    console.error("Erro ao editar venda:", error);
    alert("Erro ao editar venda.");
  }
}



/* ==============================
   EXCLUIR VENDA
============================== */
async function deleteSale(sale) {
  const confirmDelete = confirm(
    `Deseja realmente excluir esta venda?\n\nProduto: ${sale.productName}\nQtd: ${sale.quantity}`
  );

  if (!confirmDelete) return;

  try {
    await updateStock(
      sale.productId,
      sale.productName,
      sale.location,
      sale.quantity
    );

    await deleteDoc(doc(db, "sales", sale.id));

    await loadStock();
    await loadDashboard();
    //await loadReports();
    alert("Venda excluída com sucesso e estoque restaurado!");
  } catch (error) {
    console.error("Erro ao excluir venda:", error);
    alert("Erro ao excluir venda.");
  }
}

// ==============================
// 🔥 FUNÇÃO TEMPORÁRIA - LIMPAR BANCO
// ==============================

async function deleteCollection(name) {
  const snapshot = await getDocs(collection(db, name));

  const deletions = snapshot.docs.map((docSnap) =>
    deleteDoc(doc(db, name, docSnap.id))
  );

  await Promise.all(deletions);
  console.log(`Coleção ${name} apagada`);
}

window.resetDatabase = async function () {
  const confirmReset = confirm("Tem certeza que deseja apagar os dados?");
  if (!confirmReset) return;

  await deleteCollection("sales");
  await deleteCollection("stock");
  // await deleteCollection("products"); // descomente se quiser apagar produtos também

  console.log("Banco limpo com sucesso!");
  alert("Banco limpo com sucesso!");
};