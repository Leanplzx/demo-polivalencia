const STORAGE_KEY = "matriz_polivalencia_mc_v1";
const AREAS = ["jarabes", "comprimidos", "inyectables", "cremas", "empaque"];
const NOMBRES_AREAS = {
    jarabes: "Jarabes",
    comprimidos: "Comprimidos",
    inyectables: "Inyectables",
    cremas: "Cremas",
    empaque: "Empaque"
};

const EJEMPLOS = [
    { id: 1, nombre: "Camila Soto", turno: "Turno A", estado: "Disponible", jarabes: 4, comprimidos: 3, inyectables: 1, cremas: 2, empaque: 3, observacion: "Capacitadora en llenado de jarabes y alta velocidad en blíster" },
    { id: 2, nombre: "Jorge Contreras", turno: "Turno A", estado: "Disponible", jarabes: 2, comprimidos: 4, inyectables: 0, cremas: 3, empaque: 3, observacion: "Experto en compresión y ajuste rápido de formato" },
    { id: 3, nombre: "Patricia Morales", turno: "Turno B", estado: "Disponible", jarabes: 1, comprimidos: 2, inyectables: 4, cremas: 2, empaque: 3, observacion: "Certificada en área estéril / inyectables" },
    { id: 4, nombre: "Rodrigo Silva", turno: "Turno A", estado: "Disponible", jarabes: 3, comprimidos: 2, inyectables: 0, cremas: 4, empaque: 2, observacion: "Especialista en emulsiones, cremas y control de viscosidad" },
    { id: 5, nombre: "Elena Vargas", turno: "Turno B", estado: "En apoyo", jarabes: 2, comprimidos: 3, inyectables: 2, cremas: 1, empaque: 4, observacion: "Líder de cierre de lote en empaque secundario" },
    { id: 6, nombre: "Matías Rojas", turno: "Turno B", estado: "Disponible", jarabes: 3, comprimidos: 3, inyectables: 1, cremas: 3, empaque: 2, observacion: "Perfil comodín para destrabar cuellos en líquidos y semisólidos" }
];

let personal = cargarDatos();

function cargarDatos() {
    try {
        const guardado = localStorage.getItem(STORAGE_KEY);
        return guardado ? JSON.parse(guardado) : [...EJEMPLOS];
    } catch {
        return [...EJEMPLOS];
    }
}

function guardarStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(personal));
    } catch (e) {
        console.warn("No se pudo guardar localmente:", e);
    }
}

function mostrarAlerta(texto, tipo = "ok") {
    const el = document.getElementById("alerta");
    el.textContent = texto;
    el.className = `alerta ${tipo}`;
    setTimeout(() => el.classList.add("oculto"), 4000);
}

function calcularIndice(p) {
    const suma = AREAS.reduce((acc, a) => acc + Number(p[a]), 0);
    return Math.round((suma / (AREAS.length * 4)) * 100);
}

function renderizar() {
    const filtroTexto = document.getElementById("buscador").value.toLowerCase();
    const filtroTurno = document.getElementById("filtroTurno").value;
    const tbody = document.getElementById("tabla-body");

    const filtrados = personal.filter((p) => {
        const okTurno = filtroTurno === "TODOS" || p.turno === filtroTurno;
        const okTexto = p.nombre.toLowerCase().includes(filtroTexto) || p.observacion.toLowerCase().includes(filtroTexto);
        return okTurno && okTexto;
    });

    tbody.innerHTML = filtrados.map((p) => {
        const indice = calcularIndice(p);
        const claseEstado = `est-${p.estado.split(" ")[0]}`;
        return `
      <tr>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.turno}</td>
        <td><span class="badge ${claseEstado}">${p.estado}</span></td>
        ${AREAS.map((a) => `<td><span class="lvl lvl-${p[a]}">${p[a]}</span></td>`).join("")}
        <td><strong>${indice}%</strong></td>
        <td>${p.observacion || "-"}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="rotarEstado(${p.id})">Cambiar estado</button>
          <button class="btn btn-danger btn-sm" onclick="eliminarPerfil(${p.id})">Eliminar</button>
        </td>
      </tr>
    `;
    }).join("");

    // Actualizar KPIs
    document.getElementById("kpi-total").textContent = personal.length;
    document.getElementById("kpi-disponibles").textContent = personal.filter((p) => p.estado === "Disponible").length;
    document.getElementById("kpi-polivalentes").textContent = personal.filter(
        (p) => AREAS.filter((a) => Number(p[a]) >= 3).length >= 2
    ).length;

    // Detectar área con menos expertos (nivel >= 3)
    let areaCritica = "-";
    let minExpertos = Infinity;
    AREAS.forEach((a) => {
        const expertos = personal.filter((p) => Number(p[a]) >= 3).length;
        if (expertos < minExpertos) {
            minExpertos = expertos;
            areaCritica = `${NOMBRES_AREAS[a]} (${expertos})`;
        }
    });
    document.getElementById("kpi-critica").textContent = personal.length ? areaCritica : "-";
}

// Simulador de Cuellos de Botella
document.getElementById("btn-simular").addEventListener("click", () => {
    const area = document.getElementById("sim-area").value;
    const turno = document.getElementById("sim-turno").value;
    const cantidad = Math.max(1, Number(document.getElementById("sim-cantidad").value) || 1);
    const cont = document.getElementById("resultado-simulador");

    const candidatos = personal
        .filter((p) => p.estado === "Disponible" && (turno === "TODOS" || p.turno === turno) && Number(p[area]) >= 2)
        .sort((a, b) => Number(b[area]) - Number(a[area]) || calcularIndice(b) - calcularIndice(a))
        .slice(0, cantidad);

    cont.classList.remove("oculto");

    if (!candidatos.length) {
        cont.innerHTML = `<strong>Sin personal disponible con nivel ≥ 2 en ${NOMBRES_AREAS[area]} para ese filtro.</strong>`;
        return;
    }

    cont.innerHTML = `
    <strong>Equipo recomendado para aliviar cuello de botella en ${NOMBRES_AREAS[area]}:</strong>
    <div class="sim-lista">
      ${candidatos.map((c) => `
        <div class="sim-item">
          <div>
            <strong>${c.nombre}</strong> (${c.turno}) — Nivel <span class="lvl lvl-${c[area]}">${c[area]}</span>
            <div style="font-size:0.8rem;color:#475569;">${c.observacion || "Habilitado"}</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="asignarApoyo(${c.id}, '${NOMBRES_AREAS[area]}')">Asignar a apoyo</button>
        </div>
      `).join("")}
    </div>
  `;
});

window.asignarApoyo = function (id, areaNombre) {
    personal = personal.map((p) => (p.id === id ? { ...p, estado: "En apoyo" } : p));
    guardarStorage();
    renderizar();
    document.getElementById("btn-simular").click();
    mostrarAlerta(`Trabajador asignado en apoyo a ${areaNombre}.`, "ok");
};

window.rotarEstado = function (id) {
    const orden = ["Disponible", "En apoyo", "Ausente"];
    personal = personal.map((p) => {
        if (p.id !== id) return p;
        const sig = orden[(orden.indexOf(p.estado) + 1) % orden.length];
        return { ...p, estado: sig };
    });
    guardarStorage();
    renderizar();
};

window.eliminarPerfil = function (id) {
    personal = personal.filter((p) => p.id !== id);
    guardarStorage();
    renderizar();
    mostrarAlerta("Perfil eliminado.", "ok");
};

document.getElementById("form-perfil").addEventListener("submit", (e) => {
    e.preventDefault();
    const nuevo = {
        id: Date.now(),
        nombre: document.getElementById("nombre").value.trim(),
        turno: document.getElementById("turno").value,
        estado: document.getElementById("estado").value,
        jarabes: Number(document.getElementById("jarabes").value),
        comprimidos: Number(document.getElementById("comprimidos").value),
        inyectables: Number(document.getElementById("inyectables").value),
        cremas: Number(document.getElementById("cremas").value),
        empaque: Number(document.getElementById("empaque").value),
        observacion: document.getElementById("observacion").value.trim()
    };

    personal.unshift(nuevo);
    guardarStorage();
    renderizar();
    e.target.reset();
    mostrarAlerta(`Perfil de ${nuevo.nombre} guardado en la matriz.`, "ok");
});

document.getElementById("btn-exportar").addEventListener("click", () => {
    const headers = ["Trabajador", "Turno", "Estado", "Jarabes", "Comprimidos", "Inyectables", "Cremas", "Empaque", "% Polivalencia", "Observación"];
    const rows = personal.map((p) => [
        p.nombre, p.turno, p.estado, p.jarabes, p.comprimidos, p.inyectables, p.cremas, p.empaque, `${calcularIndice(p)}%`, p.observacion || "-"
    ]);

    const tablaHtml = `
    <html xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="UTF-8"></head>
    <body>
      <table border="1" style="border-collapse:collapse;font-family:Arial;font-size:11pt;">
        <tr style="background:#d3d3d3;font-weight:bold;text-align:center;">
          ${headers.map((h) => `<th>${h}</th>`).join("")}
        </tr>
        ${rows.map((r) => `<tr style="text-align:center;">${r.map((v) => `<td>${v}</td>`).join("")}</tr>`).join("")}
      </table>
    </body>
    </html>
  `;

    const blob = new Blob(["\uFEFF" + tablaHtml], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `matriz_polivalencia_${new Date().toISOString().slice(0, 10)}.xls`;
    link.click();
});

document.getElementById("btn-ejemplos").addEventListener("click", () => {
    personal = [...EJEMPLOS];
    guardarStorage();
    renderizar();
    mostrarAlerta("Ejemplos restaurados.", "ok");
});

document.getElementById("buscador").addEventListener("input", renderizar);
document.getElementById("filtroTurno").addEventListener("change", renderizar);

renderizar();