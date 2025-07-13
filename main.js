// Enlace del archivo JSON a utilizar.
var ENDPOINT;

// Usa tu nombre de archivo JSON aquí:
//
ENDPOINT = `cursos_formateados.json`;
// periodo es utilizado para desplegar títulos en algunas secciones de la web.
const periodo = "Primavera 2025";

// utc_chile es utilizada para obtener la fecha y hora en la que fue recabada la info de cursos
// (proviene del nombre del json file)
const utc_chile = -4;

// -------------------------------------------------------------------------------------
// FUNCIONES AUXILIARES
// Función para parsear entradas de horario
function parseHorarioEntry(entry) {
  // Dividir por espacios y eliminar elementos vacíos
  const parts = entry.trim().split(/\s+/);
  
  // El tipo es el primer elemento (ej: "CAT:")
  const tipo = parts[0].replace(':', ''); // Eliminamos los dos puntos
  
  // El día es el segundo elemento
  const dia = parts[1];
  
  // El bloque horario son los últimos 3 elementos
  const horas = parts.slice(2).join(' ');
  
  return {
    tipo,
    dia,
    horas
  };
}
// Retorna un nodo del elemento.
function createNode(element) {
  return document.createElement(element);
}

// Adjunta un elemento a su padre.
function append(parent, element) {
  return parent.appendChild(element);
}

// Retorna una lista de nodos del selector.
function $(selector, context) {
  return (context || document).querySelectorAll(selector);
}

// Retorna un nodo del selector.
function $1(selector, context) {
  return (context || document).querySelector(selector);
}

// Método para dar formato Title a un string (e.g, 'PROFESOR'.toTitle() retorna 'Profesor').
String.prototype.toTitle = function () {
  return this.split(" ")
    .map((w) => w[0].toUpperCase() + w.substr(1).toLowerCase())
    .join(" ");
};

// Comprueba si el sitio ha sido cargado en un dispositivo móvil
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|BB|PlayBook|IEMobile|Windows Phone|Kindle|Silk|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Comprueba que el navegador sea compatible con localStorage.
var hasStorage = (function () {
  try {
    let x = "storageTest";
    localStorage.setItem(x, x);
    localStorage.removeItem(x);
    return true;
  } catch (exception) {
    return false;
  }
})();

// Comprueba que un curso seleccionado esté en listado de cursos.
function checkIfSeleccionadoInCursos(seleccionado) {
  let idCursos = listaCursos.cursos.map(
    (curso) => `${curso.cod}${curso.sección}`
  );
  let idSeleccionado = `${seleccionado.cod}${seleccionado.sección}`;
  return idCursos.includes(idSeleccionado);
}

// Comprueba que todos los bloques del horario para un curso, están disponibles para ser desplegados.
function checkAvailability(horario) {
  let idsHorario = horario
    .map((modulo) => {
      try {
        const { dia, horas } = parseHorarioEntry(modulo);
        return [`${dia}_${horas}`];
      } catch (e) {
        console.error("Error procesando horario:", modulo, e);
        return [];
      }
    })
    .flat();

  // Verificar que todos los elementos existan y tengan menos de 2 cursos
  return idsHorario.every((id) => {
    const elemento = document.getElementById(id);
    if (!elemento) {
      console.warn(`Elemento no encontrado: ${id}`);
      return false;
    }
    return elemento.childElementCount < 2;
  });
}



// OBJETO LISTACURSOS: Encargado de almacenar y operar el data set de cursos.
const listaCursos = {
  cursos: [],
  seleccionados: [],
  getCursos: async function (url) {
    const res = await fetch(url);
    let data = await res.json();
    this.cursos = data;
    console.log("Cursos obtenidos con éxito.");
    // Hacemos el llamado a la función que despliega la lista de cursos.
    view.displayCursos();
    // Obtenemos los cursos guardados en localStorage.
    this.getSavedSeleccionados();
  },
  addSeleccionado: function (position) {
    let cursoSeleccionado = this.cursos[position];
    let cod_sec = `${cursoSeleccionado.cod}_${cursoSeleccionado.sección}`;
    let listaSeleccionados = this.seleccionados.map(
      (curso) => `${curso.cod}_${curso.sección}`
    );

    // Comprobamos si el curso se encuentra seleccionado.
    if (listaSeleccionados.includes(cod_sec)) {
      console.log("El curso ya se encuentra seleccionado.");
      return false;
      // Comprobamos si hay 10 cursos seleccionados.
    } else if (listaSeleccionados.length === 10) {
      alert(
        "No se pueden añadir más de 10 cursos por razones de espaciamiento.\n" +
          "Elimina algún curso para continuar."
      );
      return false;
      // Comprobamos que todas las celdas contengan menos de 2 divs.
    } else if (!checkAvailability(cursoSeleccionado.horario)) {
      alert(
        "No es posible posicionar el curso en el horario. Hay 2 cursos en los bloques asociados."
      );
      return false;
      // Si pasa las pruebas se agrega al horario.
    } else {
      // Antes de agregarlo al horario vemos los topes
      cursoSeleccionado.topes = this.getTopesHorarios(
        cursoSeleccionado.horario
      );

      this.seleccionados.push(cursoSeleccionado);
      // Lo desplegamos en el horario.
      handlers.displayCursoInHorario(cursoSeleccionado);
      // Actualizamos la sección de seleccionados.
      view.displaySeleccionados();

      // Se almacena el curso en localStorage si está disponible.
      if (hasStorage) {
        localStorage.setItem(
          "seleccionados",
          JSON.stringify(this.seleccionados)
        );
      }
      return true;
    }
  },
  deleteSeleccionado: function (position) {
    // Primero eliminamos la información del horario.
    let curso = this.seleccionados[position];
    // Componemos la clase para obtener los divs del horario.
    let claseCodSec = `.${curso.cod}${curso.sección}`;
    let nodos = document.querySelectorAll(claseCodSec);
    // Borramos los divs.
    nodos.forEach((bloque) => bloque.parentNode.removeChild(bloque));

    // Cambiamos la clase del botón del curso.
    handlers.changeButtonStatus(position, "button is-small is-success");

    // Finalmente se elimina del arreglo de seleccionados.
    this.seleccionados.splice(position, 1);

    if (hasStorage) {
      localStorage.setItem("seleccionados", JSON.stringify(this.seleccionados));
    }
  },
  getSavedSeleccionados: function () {
    if (hasStorage) {
      // Obtenemos los cursos seleccionados del localStorage.
      let savedSeleccionados = JSON.parse(
        localStorage.getItem("seleccionados")
      );

      // Comprobamos que no sean nulos y que todos los cursos seleccionados estén en la lista de curso.
      if (
        savedSeleccionados != null &&
        savedSeleccionados.every(checkIfSeleccionadoInCursos)
      ) {
        // Si no son nulos y están todos, los pasamos al objeto.
        this.seleccionados = savedSeleccionados;

        // Llamamos a view.displaySeleccionados para que muestre estos cursos en la sección.
        view.displaySeleccionados();

        // Cambiamos la clase de los botones correspondientes.
        for (let i = 0; i < this.seleccionados.length; i++) {
          handlers.changeButtonStatus(i, "button is-small is-static");
        }

        // Desplegamos cada curso en el horario.
        this.seleccionados.forEach((seleccionado) =>
          handlers.displayCursoInHorario(seleccionado)
        );
      } else if (
        savedSeleccionados != null &&
        !savedSeleccionados.every(checkIfSeleccionadoInCursos)
      ) {
        localStorage.removeItem("seleccionados");
      }
    }
  },
  deleteAllSeleccionados: function () {
    // Eliminamos los seleccionados utilizando los índices de adelante hacia atrás.
    for (let i = listaCursos.seleccionados.length - 1; i >= 0; i--) {
      listaCursos.deleteSeleccionado(i);
    }
    view.displaySeleccionados();

    if (hasStorage) {
      localStorage.removeItem("seleccionados");
    }
  },
  getTopesHorarios: function (horario) {
    let topes = [];
    let idsHorario = horario
      .map((modulo) => {
        let bloque = modulo.slice(-13);
        let days = modulo.slice(5, -14).replace(/ /g, "").split(",");
        let ids = days.map((day) => `${day}_${bloque}`);
        return ids;
      })
      .flat();

    // Una vez obtenidos los ids para el curso, revisamos el horario (tabla)
    idsHorario.forEach((id) => {
      // Obtenemos la celda y vemos si tiene elementos
      let celda = document.getElementById(id);
      if (celda.childElementCount > 0) {
        topes.push({
          topaCon: celda.firstChild.innerText.split("\n").join(" "),
          cuando: id.split("_").join(" "),
        });
      }
    });
    return topes;
  },
};

// 1. Obtenemos el JSON con la lista de los cursos.
// 2. La misma función hace el llamado a view.displayCursos().
listaCursos.getCursos(ENDPOINT);

//OBJETO HANDLERS: Encargado de responder las acciones del sitio
const handlers = {
  displayCursoInHorario: function (curso) {
    let horario = curso.horario; // Obtenemos el array del horario.

    horario.forEach((modulo) => {
      let tipo = modulo.slice(0, 3); // Puede ser CAT || AYU
      let bloque = modulo.slice(-13); // De la forma hh:mm - hh:mm
      let days = modulo.slice(5, -14); // De la forma day || day, day
      days = days.replace(/ /g, ""); // utilizamos regex para buscar espacios con global search g (find all).
      days = days.split(","); // Transformamos los días en un array.
      let ids = []; // Variable que tendrá ids de la forma day_hh:mm - hh:mm

      // Se agregan los ids de la forma (day_hh:mm - hh:mm), al array de ids.
      days.forEach((day) => ids.push(`${day}_${bloque}`));

      // Recorremos los ids para insertar los datos del curso en el horario.
      ids.forEach((id, position) => {
        // Obtenemos la celda de la tabla y se inserta la información.
        let celda = document.getElementById(id);
        // Comprobamos que el bloque no tenga dos cursos.
        if (celda.childElementCount < 2) {
          celda.innerHTML += `<div class="${tipo.toLowerCase()} ${curso.cod}${
            curso.sección
          }">
            ${curso.cod}/${curso.sección}<br> 
            <strong>
              ${
                curso.nombre_curso.includes("/")
                  ? curso.nombre_curso.slice(
                      curso.nombre_curso.indexOf("/") + 2
                    )
                  : curso.nombre_curso
              }
            </strong> <br> 
            (${tipo})
            </div>`;
        } else {
          console.log("No puede haber más de dos cursos en un mismo bloque.");
        }
      });
    });
  },
  filtrarCursos: function () {
    let input = document.querySelector("#buscador"),
      filter = input.value.toUpperCase(),
      table = document.querySelector("#tabla-listado-cursos"),
      tr = table.querySelectorAll("tr"),
      clearIcon = $1("#limpiar-buscador");

    // Vemos si hay un input para mostrar el icono
    if (filter.length > 0) {
      clearIcon.style.display = "";
    } else {
      clearIcon.style.display = "none";
    }
    tr.forEach((fila) => {
      let td = fila.getElementsByTagName("td")[1];
      if (td) {
        if (td.innerHTML.toUpperCase().indexOf(filter) > -1) {
          fila.style.display = "";
        } else {
          fila.style.display = "none";
        }
      }
    });
  },
  limpiarBuscador: function () {
    // 1. Borramos el contenido del input
    $1("#buscador").value = "";
    // 2. Llamamos a filtrarCursos() para que muestre los cursos (todos).
    this.filtrarCursos();
    // 3. Enfocamos el input para seguir buscando
    $1("#buscador").focus();
  },
  changeButtonStatus: function (position, clase) {
    const idCursos = listaCursos.cursos.map(
      (curso) => `${curso.cod}${curso.sección}`
    );
    let cursoBuscado = listaCursos.seleccionados[position];
    let idCursoBuscado = `${cursoBuscado.cod}${cursoBuscado.sección}`;
    let indexButtonToChange = idCursos.indexOf(idCursoBuscado);
    let divCursos = document.querySelector("#tabla-listado-cursos");
    let buttons = divCursos.querySelectorAll("button");
    // Seleccionamos el botón y cambiamos su clase.
    buttons[indexButtonToChange].className = clase;
  },
  toggleCursos: function () {
    let tablaCursos = $1("#tabla-listado-cursos");
    let buscador = $("header.card-header")[1];
    let a = $1("#toggleCursos");
    let icon = a.firstElementChild.firstElementChild;
    if (icon.className === "fas fa-angle-up") {
      icon.className = "fas fa-angle-down";
      tablaCursos.style.display = "none";
      buscador.style.display = "none";
    } else {
      icon.className = "fas fa-angle-up";
      tablaCursos.style.display = "";
      buscador.style.display = "";
    }
  },
  toggleSeleccionados: function () {
    let tablaSeleccionados = $1("#tabla-listado-seleccionados");
    let a = $1("#toggleSeleccionados");
    let icon = a.firstElementChild.firstElementChild;

    if (icon.className === "fas fa-angle-up") {
      icon.className = "fas fa-angle-down";
      tablaSeleccionados.style.display = "none";
    } else {
      icon.className = "fas fa-angle-up";
      tablaSeleccionados.style.display = "";
    }
  },
  changeMessageStatus: () => {
    if (hasStorage) {
      let paginaVisitada = JSON.parse(localStorage.getItem("visitada"));
      let timeStampActual = Date.now();
      let mostrarRecordatorio = function () {
        $1("#mensaje-recordatorio").style.display = "";
      };
      let guardarTimeStamp = function () {
        localStorage.setItem(
          "visitada",
          JSON.stringify({ estado: "true", timeStamp: timeStampActual })
        );
      };

      // Si nunca ha sido visitada
      if (paginaVisitada === null) {
        // Mostramos el mensaje
        mostrarRecordatorio();
        // Guardamos en el localStorage el estado de visita y el timestamp (milisegundos).
        guardarTimeStamp();

        // Si ha sido visitada pero no tiene el nuevo atributo en el localStorage.
      } else if (paginaVisitada.timeStamp === undefined) {
        // Mostramos el mensaje
        mostrarRecordatorio();
        // Actualizamos la info del localStorage
        guardarTimeStamp();

        // Si ya ha sido visitada, entonces comprobamos si han pasado más de 24 horas.
      } else {
        let timeStampUltimoMensaje = paginaVisitada.timeStamp;
        // Calculamos la diferencia en milisegundos
        let diferenciaEnMilisegundos = timeStampActual - timeStampUltimoMensaje;
        // Convertimos la diferencia a horas
        // Number of milliseconds per hour = 60 minutes/hour * 60 seconds/minute * 1000 msecs/secon
        let diferenciaEnHoras = diferenciaEnMilisegundos / (1000 * 60 * 60);
        
        if (diferenciaEnHoras >= 24) {
          // Mostramos el mensaje
          mostrarRecordatorio();
          // Actualizamos la info del localStorage
          guardarTimeStamp();
        }
      }
    }
  },
  descargarHorario: () => {
    let horario = $1("#tabla-horario");
    let ancho = horario.scrollWidth;
    let alto = horario.scrollHeight;
    window.scrollTo(0, 0);
    html2canvas(horario, { width: ancho, height: alto }).then(function (
      canvas
    ) {
      let link = document.createElement("a");
      link.href = canvas.toDataURL();
      link.download = `Horario_Simulado_${periodo.split(" ").join("-")}.png`;
      //Firefox requires the link to be in the body
      document.body.appendChild(link);
      link.click();
      //remove the link when done
      document.body.removeChild(link);
    });
  },
  compartirEnWhatsapp: () => {
    let button = $1("#button-wsp");
    // La url debe estar encodeada
    let urlencodedtext = encodeURIComponent(
      `Simula tu toma de ramos de ${periodo} en https://hurariont.github.io/`
    );
    // Comprobamos si es versión mobile
    if (isMobile()) {
      button.href = "whatsapp://send?text=" + urlencodedtext;
    } else {
      button.href = "https://wa.me/?text=" + urlencodedtext;
    }
  },
};

// OBJETO VIEW: Encargado de desplegar en pantalla
const view = {
  displayCursos: function () {
    let divListadoCursos = document.getElementById("listado-cursos");
    let tabla = createNode("table");
    let tbody = createNode("tbody");
    tabla.id = "tabla-listado-cursos";
    tabla.className = "table is-fullwidth is-striped"; // El framework otorga el estilo.

    listaCursos.cursos.forEach(function (curso, position) {
      let tr = createNode("tr");
      let tdIcon = createNode("td");
      let tdContent = createNode("td");
      let tdButton = createNode("td");
      

      tdIcon.width = "5%";
      tdIcon.innerHTML = `<i class="far fa-clock has-text-info"></i>`;
      //<strong>Prof.(es):</strong> ${curso.profesor.toTitle()} <br> 
      
      //console.log(curso.cod)
      tdContent.innerHTML = `${curso.cod}/${curso.sección}<br> 
        <strong>${curso.nombre_curso}</strong> <br> 
        
        <strong>Prof.(es):</strong> ${curso.profesor} <br> 
        ${
          curso.horario[0] === undefined
            ? "Sin Horario"
            : curso.horario.join("<br>")
        }`;

      tdButton.id = position;
      append(
        tdButton,
        this.createButton("Seleccionar", "button is-small is-success")
      );

      append(tr, tdIcon);
      append(tr, tdContent);
      append(tr, tdButton);
      append(tbody, tr);
    }, this);
    // Agregamos el tbody a la tabla
    append(tabla, tbody);
    // Agregamos la tabla al div.
    append(divListadoCursos, tabla);
    this.setUpEventListeners();
    document.querySelector(
      "p.card-header-title"
    ).innerHTML = `Listado de Cursos - ${periodo}`;
    document.querySelector(
      "#numero-cursos"
    ).innerHTML = `Cursos totales: ${listaCursos.cursos.length}`;
    //$1("#last-updated").innerHTML = getLastUpdated(ENDPOINT, utc_chile);
    console.log("Tabla desplegada.");
  },
  createButton: function (texto, clase) {
    let button = createNode("button");
    button.textContent = texto;
    button.className = clase;
    return button;
  },
  setUpEventListeners: function () {
    let tablaListadoCursos = document.getElementById("tabla-listado-cursos");
    let divSeleccionados = document.querySelector(
      "#listado-cursos-seleccionados"
    );

    tablaListadoCursos.addEventListener("click", function (event) {
      let elementClicked = event.target;
      // Comprobamos si el elemento clickeado es un botón de seleccionar.
      if (elementClicked.className === "button is-small is-success") {
        // Obtenemos el id que contiene la posición del curso en la lista.
        let position = parseInt(elementClicked.parentNode.id);

        // Comprobamos que se haya podido agregar a los seleccionados.
        if (listaCursos.addSeleccionado(position)) {
          // Cambiamos la clase del botón.
          elementClicked.className = "button is-small is-success is-loading";
          setTimeout(() => {
            elementClicked.className = "button is-small is-static";
          }, 200);
        }

        // Se agrega el curso a los seleccionados, el mismo método llama a displayCursoInHorario.
        //listaCursos.addSeleccionado(position);
      }
    });

    divSeleccionados.addEventListener("click", (event) => {
      let elementClicked = event.target;
      // Comprobamos que el elemento clickeado es un botón de eliminar.
      if (elementClicked.className === "button is-small is-danger") {
        // Obtenemos el id del li.
        let id = elementClicked.parentNode.id;
        // Obtenemos la posición en base al id.
        let position = parseInt(id.slice(1));
        // Se elimina el curso de los seleccionados.
        listaCursos.deleteSeleccionado(position);
        // Se actualiza la sección de seleccionados.
        view.displaySeleccionados();
      }
    });
  },
  displayHorario: function () {
    let divHorario = document.getElementById("horario");
    divHorario.innerHTML = "";
    let days = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    let bloques = [
      "08:00 - 09:20",
      "09:30 - 10:50",
      "11:00 - 12:20",
      "12:30 - 13:50",
      "14:00 - 15:20",
      "15:30 - 16:50",
      "17:00 - 18:20",
      "18:30 - 19:50",
      "20:00 - 21:20",
    ];
    let table = createNode("table");
    table.id = "tabla-horario";
    table.className =
      "table is-bordered is-striped is-narrow is-hoverable is-fullwidth";

    // Encabezado del horario
    let thead = createNode("thead");
    let primeraFila = createNode("tr");
    let primerEncabezado = createNode("th");
    primerEncabezado.textContent = "Bloques";
    primeraFila.appendChild(primerEncabezado);
    days.forEach((day) => {
      let encabezado = createNode("th");
      encabezado.textContent = day;
      primeraFila.appendChild(encabezado);
    });
    thead.appendChild(primeraFila);

    // Cuerpo del horario
    let tbody = createNode("tbody");
    bloques.forEach((bloque, position) => {
      let fila = createNode("tr");
      let primeraCelda = createNode("td");
      primeraCelda.innerHTML = `${position + 1} <br> ${bloque}`;
      primeraCelda.className = "bloque-horario";
      fila.appendChild(primeraCelda);
      days.forEach((day) => {
        let celda = createNode("td");
        celda.id = `${day}_${bloque}`;
        if (
          `${day}_${bloque}` === "Mar_14:00 - 15:20" ||
          `${day}_${bloque}` === "Vie_14:00 - 15:20"
        ) {
          celda.className = "horario-protegido";
        }
        fila.appendChild(celda);
      });
      tbody.appendChild(fila);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    divHorario.appendChild(table);
  },
  displaySeleccionados: function () {
    let divSeleccionados = document.querySelector(
      "#listado-cursos-seleccionados"
    );
    // Limpiamos el contenido del div.
    divSeleccionados.innerHTML = "";

    let tabla = createNode("table");
    let tbody = createNode("tbody");
    tabla.id = "tabla-listado-seleccionados";
    tabla.className = "table is-fullwidth is-striped"; // El framework otorga el estilo.

    // Recorremos cada curso seleccionado de la lista de seleccionados.
    listaCursos.seleccionados.forEach(function (seleccionado, position) {
      let tr = createNode("tr");
      let tdIcon = createNode("td");
      let tdContent = createNode("td");
      let tdButton = createNode("td");

      tdIcon.width = "5%";
      tdIcon.innerHTML = `<i class="fas fa-clock has-text-warning"></i>`;

      tdContent.innerHTML = `${seleccionado.cod}/${seleccionado.sección}<br> 
          <strong>${seleccionado.nombre_curso}</strong> <br> 
          <strong>Prof.(es):</strong> ${seleccionado.profesor.toTitle()} <br> 
          ${
            seleccionado.horario[0] === undefined
              ? "Sin Horario"
              : seleccionado.horario.join("<br>")
          }`;

      tdButton.id = `s${position}`; // id de la forma "s(position)".
      append(
        tdButton,
        this.createButton("Eliminar", "button is-small is-danger")
      );

      append(tr, tdIcon);
      append(tr, tdContent);
      append(tr, tdButton);
      append(tbody, tr);
    }, this);
    // Agregamos el tbody a la tabla
    append(tabla, tbody);
    // Agregamos la tabla al div.
    append(divSeleccionados, tabla);

    $1(
      "#numero-cursos-seleccionados"
    ).innerHTML = `Seleccionados: ${listaCursos.seleccionados.length}`;

    // Se comprueba si es necesario mostrar "Eliminar todo".
    let btnEliminarTodo = $1("#eliminar-todo-seleccionados");
    if (listaCursos.seleccionados.length > 1) {
      btnEliminarTodo.style.display = "";
    } else {
      btnEliminarTodo.style.display = "none";
    }

    // Se comprueba si es necesario mostrar el botón de descargar.
    // Solo si hay un curso o más
    let descargar = $1("#descargarHorario");
    if (listaCursos.seleccionados.length > 0) {
      descargar.style.display = "";
    } else {
      descargar.style.display = "none";
    }

    $1("#toggleSeleccionados").lastElementChild.lastElementChild.className =
      "fas fa-angle-up";

    // Se llama a displayTopesHorarios
    this.displayTopesHorarios();
  },
  displayTopesHorarios: function () {
    let seleccionados = listaCursos.seleccionados;
    let mensajeTopes = $1("#topes-horarios");

    // Primero revisamos que todos los cursos seleccionados tengan el atributo topes
    // Si no lo tienen eliminamos todo
    if (
      seleccionados.some((seleccionado) => seleccionado.topes === undefined)
    ) {
      listaCursos.deleteAllSeleccionados();

      // Vemos si algún curso tiene topes
    } else if (
      listaCursos.seleccionados.some(
        (seleccionado) => seleccionado.topes.length > 0
      )
    ) {
      mensajeTopes.style.display = "";
    } else {
      mensajeTopes.style.display = "none";
    }
  },
};

view.displayHorario();
handlers.compartirEnWhatsapp();
