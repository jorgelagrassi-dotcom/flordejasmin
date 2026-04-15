import {
    db,
    collection,
    getDocs,
    doc,
    updateDoc,
    getDoc,
    addDoc
  } from "./firebase.js";
  
  let STOCK = [];
  let showZero = false;
  
  const list = document.getElementById("list");
  const btnToggleZero = document.getElementById("btnToggleZero");
  const btnSaveAll = document.getElementById("btnSaveAll");
  const msg = document.getElementById("msg");
  
  /* ==============================
     GERAR ID IGUAL AO SISTEMA
  ============================== */
  function generateSaleGroupId() {
    const now = new Date();
    const time = now.getTime().toString(36);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `GRP-${time}-${random}`;
  }
  
  /* ==============================
     CONTROLE DE ESTOQUE (MESMO PADRÃO)
  ============================== */
  async function updateStock(productId, productName, location, delta) {
    const stockRef = doc(db, "stock", `${productId}_${location}`);
    const snap = await getDoc(stockRef);
  
    if (!snap.exists()) return;
  
    const currentQty = snap.data().quantity || 0;
    const newQty = currentQty + delta;
  
    await updateDoc(stockRef, {
      quantity: newQty,
      updatedAt: new Date().toISOString(),
    });
  }
  
  /* ==============================
     CARREGAR ESTOQUE
  ============================== */
  async function loadStock() {
  
    const snap = await getDocs(collection(db, "stock"));
    STOCK = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
    render();
  }
  
  /* ==============================
     RENDER
  ============================== */
  function render() {
  
    const location = document.getElementById("saleLocation").value;
  
    list.innerHTML = "";
  
    STOCK
      .filter(s => s.location === location)
      .filter(s => showZero ? true : s.quantity > 0)
      .sort((a, b) => a.productName.localeCompare(b.productName))
      .forEach(s => {
  
        const div = document.createElement("div");
        div.className = "item";
  
        div.innerHTML = `
          <div class="item-name">${s.productName}</div>
          <div class="item-stock">Atual: ${s.quantity}</div>
          <input type="number" placeholder="Nova contagem" data-id="${s.id}">
        `;
  
        list.appendChild(div);
      });
  }
  
  /* ==============================
     TROCAR LOCAL
  ============================== */
  document.getElementById("saleLocation").addEventListener("change", render);
  
  /* ==============================
     TOGGLE ZERADOS
  ============================== */
  btnToggleZero.addEventListener("click", () => {
    showZero = !showZero;
    btnToggleZero.innerText = showZero
      ? "Ocultar Zerados"
      : "Mostrar Zerados";
    render();
  });
  
  /* ==============================
     SALVAR TUDO (IGUAL SISTEMA)
  ============================== */
  btnSaveAll.addEventListener("click", async () => {
  
    const inputs = document.querySelectorAll("input[data-id]");
    const location = document.getElementById("saleLocation").value;
  
    let saleCart = [];
  
    // 🔹 monta carrinho
    for (const input of inputs) {
  
      const newValue = parseInt(input.value);
      if (isNaN(newValue)) continue;
  
      const stockRef = doc(db, "stock", input.dataset.id);
      const snap = await getDoc(stockRef);
  
      if (!snap.exists()) continue;
  
      const data = snap.data();
      const current = data.quantity || 0;
      const delta = newValue - current;
  
      if (delta < 0) {
  
        const productSnap = await getDoc(doc(db, "products", data.productId));
        if (!productSnap.exists()) continue;
  
        const product = productSnap.data();
  
        saleCart.push({
          productId: data.productId,
          productName: data.productName,
          quantity: Math.abs(delta),
          unitPrice: product.price || 0,
          location: location,
          originLocation: location
        });
      }
    }
  
    // 🔴 sem venda
    if (saleCart.length === 0) {
      msg.innerText = "Nenhuma venda detectada.";
    }
  
    const saleGroupId = generateSaleGroupId();
  
    let subtotalGeral = 0;
    saleCart.forEach(item => {
      subtotalGeral += item.quantity * item.unitPrice;
    });
  
    // 🔥 salva vendas
    for (const item of saleCart) {
  
      const itemSubtotal = item.quantity * item.unitPrice;
  
      await addDoc(collection(db, "sales"), {
        saleGroupId,
        productId: item.productId,
        productName: item.productName,
        location: item.location,
        originLocation: item.originLocation,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: itemSubtotal,
        discount: 0,
        total: itemSubtotal,
        paymentMethod: "CONTAGEM",
        note: "Contagem Mobile",
        createdAt: new Date().getTime(),
      });
  
      await updateStock(
        item.productId,
        item.productName,
        item.location,
        -item.quantity
      );
    }
  
    // 🔵 entradas de estoque
    for (const input of inputs) {
  
      const newValue = parseInt(input.value);
      if (isNaN(newValue)) continue;
  
      const stockRef = doc(db, "stock", input.dataset.id);
      const snap = await getDoc(stockRef);
  
      if (!snap.exists()) continue;
  
      const data = snap.data();
      const current = data.quantity || 0;
      const delta = newValue - current;
  
      if (delta > 0) {
        await updateStock(
          data.productId,
          data.productName,
          data.location,
          delta
        );
      }
    }
  
    msg.innerText = "✅ Venda registrada + estoque atualizado!";
    loadStock();
  });
  
  /* INIT */
  loadStock();