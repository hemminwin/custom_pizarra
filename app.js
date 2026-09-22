(() => {
  "use strict";

  const COLUMNS = [
    { key: "numeroPedido", label: "SER. - NÚM.", kind: "plain", headerAliases: ["SER NUM", "SER NÚM", "SER - NUM", "SER - NÚM"] },
    { key: "cliente", label: "CLIENTE", kind: "plain", headerAliases: ["CLIENTE"] },

    { key: "serigrafia", label: "SERIGRAFÍA", kind: "tech", className: "tech-serigrafia", headerAliases: ["SERIGRAFIA", "SERIGRAFÍA"] },
    { key: "transfer", label: "TRANSFER", kind: "tech", className: "tech-transfer", headerAliases: ["TRANSFER"] },
    { key: "tampo", label: "TAMPO", kind: "tech", className: "tech-tampo", headerAliases: ["TAMPO"] },
    { key: "greenbox", label: "GREENBOX", kind: "tech", className: "tech-greenbox", headerAliases: ["GREENBOX"] },
    { key: "embalar", label: "EMBALAR", kind: "tech", className: "tech-embalar", headerAliases: ["EMBALAR"] },
    {
      key: "transferRelieve",
      label: "TRANSFER RELIEVE",
      kind: "tech",
      className: "tech-transferRelieve",
      headerAliases: ["TRANSFER RELIEVE", "TRANSFER RELIEVVE", "TRANSFER RELIEBE"]
    },
    { key: "baby", label: "BABY", kind: "tech", className: "tech-baby", headerAliases: ["BABY"] },
    { key: "varios", label: "VARIOS", kind: "tech", className: "tech-varios", headerAliases: ["VARIOS"] },

    { key: "fechaSalida", label: "FECHA SALIDA", kind: "plain", headerAliases: ["FECHA SALIDA", "FECHA DE SALIDA"] }
  ];

  const syncStatus = document.getElementById("syncStatus");
  const syncText = document.getElementById("syncText");
  const boardHeader = document.getElementById("boardHeader");
  const ordersList = document.getElementById("ordersList");
  const searchInput = document.getElementById("searchInput");
  const excelInput = document.getElementById("excelInput");
  const newOrderBtn = document.getElementById("newOrderBtn");
  const exportBtn = document.getElementById("exportBtn");
  const importInput = document.getElementById("importInput");
  const messageBar = document.getElementById("messageBar");

  const orderDialog = document.getElementById("orderDialog");
  const orderForm = document.getElementById("orderForm");
  const dialogTitle = document.getElementById("dialogTitle");
  const closeDialogBtn = document.getElementById("closeDialogBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const firebaseKey = document.getElementById("firebaseKey");
  const formFields = document.getElementById("formFields");

  let db = null;
  let allOrders = [];

  function normalizeHeader(value) {
    return String(value ?? "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeOrderNumber(value) {
    return String(value ?? "").trim().toUpperCase();
  }

  function escapeHtml(value = "") {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setStatus(kind, text) {
    syncStatus.className = `sync-status sync-${kind}`;
    syncText.textContent = text;
  }

  function showMessage(text, isError = false) {
    messageBar.textContent = text;
    messageBar.className = `message-bar${isError ? " error" : ""}`;
    messageBar.hidden = false;

    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => {
      messageBar.hidden = true;
    }, isError ? 9000 : 6000);
  }

  function getLegacyCompatibleOrder(raw = {}) {
    const order = { ...raw };

    // Compatibilidad con la versión anterior de la pizarra.
    if (!order.numeroPedido && order["SER. - NÚM."]) order.numeroPedido = order["SER. - NÚM."];
    if (!order.fechaSalida && order.fecha) order.fechaSalida = order.fecha;

    if (!order.varios) {
      if (order.articulos) {
        order.varios = order.articulos;
      } else if (Array.isArray(order.items)) {
        order.varios = order.items.map(item => {
          const desc = String(item?.descripcion || "").trim();
          const techs = Array.isArray(item?.tecnicas) ? item.tecnicas.join(", ") : "";
          return [desc, techs].filter(Boolean).join(" — ");
        }).filter(Boolean).join("\n");
      }
    }

    return order;
  }

  function renderHeader() {
    const headers = COLUMNS.map((col, index) => {
      const classes = [
        col.kind === "tech" ? col.className : "",
        index === 0 ? "header-order" : "",
        index === 1 ? "header-client" : ""
      ].filter(Boolean).join(" ");

      return `<div class="${classes}">${escapeHtml(col.label)}</div>`;
    }).join("");

    boardHeader.innerHTML = `${headers}<div>ACCIONES</div>`;
  }

  function renderOrders() {
    const q = searchInput.value.trim().toLowerCase();

    const filtered = allOrders.filter(item => {
      const order = getLegacyCompatibleOrder(item);
      const haystack = COLUMNS.map(col => order[col.key] ?? "").join(" ").toLowerCase();
      return haystack.includes(q);
    });

    if (!filtered.length) {
      ordersList.innerHTML = `<div class="empty-state">${
        q ? "No hay pedidos que coincidan con la búsqueda." : "No hay pedidos. Puedes subir el Excel o crear uno manualmente."
      }</div>`;
      return;
    }

    ordersList.innerHTML = filtered.map(item => {
      const order = getLegacyCompatibleOrder(item);

      const cells = COLUMNS.map((col, index) => {
        const classes = [
          col.kind === "tech" ? col.className : "plain-cell",
          index === 0 ? "cell-order" : "",
          index === 1 ? "cell-client" : ""
        ].filter(Boolean).join(" ");

        return `<div class="${classes}">${escapeHtml(order[col.key] ?? "")}</div>`;
      }).join("");

      return `
        <article class="board-grid order-row" data-key="${escapeHtml(item.key)}">
          ${cells}
          <div class="actions-cell">
            <button class="row-btn" type="button" data-action="edit">Editar</button>
            <button class="row-btn delete" type="button" data-action="delete">×</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function makeInputField(col, value = "") {
    const field = document.createElement("div");
    const isLong = col.kind === "tech";
    const classes = ["form-field"];
    if (isLong) classes.push("wide");
    if (col.kind === "tech") classes.push(col.className);
    field.className = classes.join(" ");

    const label = document.createElement("label");
    label.textContent = col.label;

    let input;
    if (isLong) {
      input = document.createElement("textarea");
      input.rows = 3;
    } else {
      input = document.createElement("input");
      input.type = "text";
    }

    input.dataset.field = col.key;
    input.value = value ?? "";
    if (col.key === "numeroPedido" || col.key === "cliente") input.required = true;

    field.append(label, input);
    return field;
  }

  function buildForm(order = {}) {
    formFields.innerHTML = "";
    COLUMNS.forEach(col => {
      formFields.appendChild(makeInputField(col, order[col.key] ?? ""));
    });
  }

  function openNewOrder() {
    dialogTitle.textContent = "Nuevo pedido";
    firebaseKey.value = "";
    buildForm({});
    orderDialog.showModal();
    setTimeout(() => formFields.querySelector('[data-field="numeroPedido"]')?.focus(), 40);
  }

  function openEditOrder(item) {
    const order = getLegacyCompatibleOrder(item);
    dialogTitle.textContent = `Editar ${order.numeroPedido || "pedido"}`;
    firebaseKey.value = item.key;
    buildForm(order);
    orderDialog.showModal();
  }

  function collectForm() {
    const result = {};
    formFields.querySelectorAll("[data-field]").forEach(input => {
      result[input.dataset.field] = input.value.trim();
    });
    return result;
  }

  async function saveOrder(event) {
    event.preventDefault();

    const payload = collectForm();
    if (!payload.numeroPedido || !payload.cliente) {
      alert("Nº de pedido y Cliente son obligatorios.");
      return;
    }

    payload.updatedAt = firebase.database.ServerValue.TIMESTAMP;

    try {
      setStatus("connecting", "Guardando...");

      let key = firebaseKey.value;

      if (!key) {
        const existing = allOrders.find(item =>
          normalizeOrderNumber(getLegacyCompatibleOrder(item).numeroPedido) === normalizeOrderNumber(payload.numeroPedido)
        );

        if (existing) {
          key = existing.key;
          payload.createdAt = existing.createdAt || firebase.database.ServerValue.TIMESTAMP;
        } else {
          key = db.ref("pedidos").push().key;
          payload.createdAt = firebase.database.ServerValue.TIMESTAMP;
        }
      } else {
        const old = allOrders.find(item => item.key === key);
        payload.createdAt = old?.createdAt || firebase.database.ServerValue.TIMESTAMP;
      }

      await db.ref(`pedidos/${key}`).set(payload);
      orderDialog.close();
      setStatus("online", "Sincronizado");
    } catch (error) {
      console.error(error);
      setStatus("offline", "Error al guardar");
      alert("Firebase ha rechazado el cambio. Comprueba que has publicado las reglas nuevas.");
    }
  }

  async function deleteOrder(key) {
    const item = allOrders.find(order => order.key === key);
    const num = getLegacyCompatibleOrder(item || {}).numeroPedido || "";

    if (!confirm(`¿Eliminar el pedido ${num}?`)) return;

    try {
      await db.ref(`pedidos/${key}`).remove();
    } catch (error) {
      console.error(error);
      alert("No se ha podido eliminar el pedido.");
    }
  }

  function mapHeaders(rowObject) {
    const inputHeaders = Object.keys(rowObject || {});
    const mapped = {};

    COLUMNS.forEach(col => {
      const aliasSet = new Set(
        [col.label, ...(col.headerAliases || [])].map(normalizeHeader)
      );

      const actualHeader = inputHeaders.find(h => aliasSet.has(normalizeHeader(h)));
      if (actualHeader) mapped[col.key] = actualHeader;
    });

    return mapped;
  }

  function cleanCell(value) {
    if (value == null) return "";
    return String(value).trim();
  }

  async function importExcel(file) {
    if (!window.XLSX) {
      showMessage("No se ha podido cargar el lector de Excel.", true);
      return;
    }

    try {
      setStatus("connecting", "Leyendo Excel...");

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, {
        type: "array",
        cellDates: true,
        dense: false
      });

      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) throw new Error("El Excel no contiene hojas.");

      const sheet = workbook.Sheets[firstSheetName];

      // raw:false conserva el texto visible; dateNF fuerza una fecha legible cuando Excel guarda una fecha real.
      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
        dateNF: "dd/mm/yyyy"
      });

      if (!rows.length) throw new Error("La primera hoja no contiene filas de datos.");

      const mapped = mapHeaders(rows[0]);

      if (!mapped.numeroPedido || !mapped.cliente) {
        throw new Error('No encuentro las columnas "SER. - NÚM." y/o "CLIENTE".');
      }

      const recognizedLabels = COLUMNS
        .filter(col => mapped[col.key])
        .map(col => col.label);

      const parsedOrders = rows.map(row => {
        const order = {};
        COLUMNS.forEach(col => {
          const sourceHeader = mapped[col.key];
          order[col.key] = sourceHeader ? cleanCell(row[sourceHeader]) : "";
        });
        return order;
      }).filter(order => order.numeroPedido || order.cliente);

      if (!parsedOrders.length) throw new Error("No se han encontrado pedidos para importar.");

      const existingByNumber = new Map();
      allOrders.forEach(item => {
        const order = getLegacyCompatibleOrder(item);
        const num = normalizeOrderNumber(order.numeroPedido);
        if (num) existingByNumber.set(num, item);
      });

      let newCount = 0;
      let updateCount = 0;

      const preview = [
        `Hoja: ${firstSheetName}`,
        `Pedidos encontrados: ${parsedOrders.length}`,
        `Columnas reconocidas: ${recognizedLabels.join(", ")}`,
        "",
        "Los números de pedido ya existentes se actualizarán; los nuevos se añadirán.",
        "",
        "¿Importar?"
      ].join("\n");

      if (!confirm(preview)) {
        setStatus("online", "Sincronizado");
        return;
      }

      const updates = {};

      parsedOrders.forEach(order => {
        const num = normalizeOrderNumber(order.numeroPedido);
        const existing = existingByNumber.get(num);

        let key;
        let createdAt;

        if (existing) {
          key = existing.key;
          createdAt = existing.createdAt || firebase.database.ServerValue.TIMESTAMP;
          updateCount += 1;
        } else {
          key = db.ref("pedidos").push().key;
          createdAt = firebase.database.ServerValue.TIMESTAMP;
          newCount += 1;
        }

        updates[`pedidos/${key}`] = {
          ...order,
          createdAt,
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
      });

      await db.ref().update(updates);

      showMessage(`Excel importado: ${newCount} pedidos nuevos y ${updateCount} actualizados.`);
      setStatus("online", "Sincronizado");
    } catch (error) {
      console.error(error);
      setStatus("online", "Sincronizado");
      showMessage(`No se ha podido importar el Excel: ${error.message}`, true);
    } finally {
      excelInput.value = "";
    }
  }

  function exportBackup() {
    const data = {
      version: 3,
      exportedAt: new Date().toISOString(),
      pedidos: allOrders.map(({ key, ...order }) => order)
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pizarra-pedidos-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function importBackup(file) {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const pedidos = Array.isArray(parsed) ? parsed : parsed.pedidos;

      if (!Array.isArray(pedidos)) throw new Error("Formato inválido");

      if (!confirm(`Se van a añadir ${pedidos.length} registros de la copia. ¿Continuar?`)) return;

      const ref = db.ref("pedidos");
      const updates = {};

      pedidos.forEach(raw => {
        const order = getLegacyCompatibleOrder(raw);
        const key = ref.push().key;

        const clean = {};
        COLUMNS.forEach(col => clean[col.key] = cleanCell(order[col.key]));

        updates[key] = {
          ...clean,
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          updatedAt: firebase.database.ServerValue.TIMESTAMP
        };
      });

      await ref.update(updates);
      showMessage(`Copia importada: ${pedidos.length} registros.`);
    } catch (error) {
      console.error(error);
      showMessage("No se ha podido importar la copia JSON.", true);
    } finally {
      importInput.value = "";
    }
  }

  function boot() {
    renderHeader();

    try {
      if (!window.firebaseConfig) throw new Error("No se ha cargado firebase-config.js");

      firebase.initializeApp(window.firebaseConfig);
      db = firebase.database();

      db.ref(".info/connected").on("value", snapshot => {
        setStatus(snapshot.val() === true ? "online" : "connecting", snapshot.val() === true ? "Sincronizado" : "Conectando...");
      });

      db.ref("pedidos").on(
        "value",
        snapshot => {
          const raw = snapshot.val() || {};
          allOrders = Object.entries(raw).map(([key, value]) => ({ key, ...(value || {}) }));

          allOrders.sort((a, b) => {
            const aTime = Number(a.createdAt || a.updatedAt || 0);
            const bTime = Number(b.createdAt || b.updatedAt || 0);
            return bTime - aTime;
          });

          renderOrders();
        },
        error => {
          console.error(error);
          setStatus("offline", "Sin acceso a la base");
          ordersList.innerHTML = `
            <div class="empty-state">
              Firebase está conectado, pero las reglas no permiten leer los pedidos.
            </div>`;
        }
      );
    } catch (error) {
      console.error(error);
      setStatus("offline", "Error de configuración");
      ordersList.innerHTML = `<div class="empty-state">No se ha podido iniciar Firebase.</div>`;
    }
  }

  searchInput.addEventListener("input", renderOrders);

  excelInput.addEventListener("change", () => {
    const file = excelInput.files?.[0];
    if (file) importExcel(file);
  });

  newOrderBtn.addEventListener("click", openNewOrder);
  closeDialogBtn.addEventListener("click", () => orderDialog.close());
  cancelBtn.addEventListener("click", () => orderDialog.close());
  orderForm.addEventListener("submit", saveOrder);
  exportBtn.addEventListener("click", exportBackup);

  importInput.addEventListener("change", () => {
    const file = importInput.files?.[0];
    if (file) importBackup(file);
  });

  ordersList.addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const row = button.closest(".order-row");
    const key = row?.dataset.key;
    if (!key) return;

    if (button.dataset.action === "edit") {
      const item = allOrders.find(order => order.key === key);
      if (item) openEditOrder(item);
    }

    if (button.dataset.action === "delete") {
      deleteOrder(key);
    }
  });

  boot();
})();
