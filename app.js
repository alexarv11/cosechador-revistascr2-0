let datosRevistas = null;
let datosFichas = null;

let revistas = [];
let fichasPorISSN = {};


// =====================================================
// CARGAR DATOS
// =====================================================

async function cargarDatos() {

    try {

        const [respuestaRevistas, respuestaFichas] = await Promise.all([
            fetch('revistas.json'),
            fetch('fichas.json')
        ]);

        if (!respuestaRevistas.ok) {
            throw new Error('No fue posible cargar revistas.json');
        }

        if (!respuestaFichas.ok) {
            throw new Error('No fue posible cargar fichas.json');
        }

        datosRevistas = await respuestaRevistas.json();
        datosFichas = await respuestaFichas.json();

        fichasPorISSN = {};

(datosFichas.fichas || []).forEach(ficha => {

    if (!Array.isArray(ficha.issn)) {
        return;
    }

    ficha.issn.forEach(issn => {

        const clave = String(issn)
            .replace(/-/g, '')
            .trim();

        fichasPorISSN[clave] = ficha;

    });

});

console.log('Índice de fichas por ISSN:', fichasPorISSN);


        prepararDatos();

        mostrarInstituciones();

        actualizarEstadisticas();

        mostrarRevistas();

    } catch (error) {

        console.error('ERROR CARGANDO DATOS:', error);

        document.getElementById('resultados').innerHTML = `
            <div class="sin-resultados">
                <h3>No fue posible cargar los datos</h3>
                <p>${escaparHTML(error.message)}</p>
            </div>
        `;
    }
}


// =====================================================
// PREPARAR DATOS
// =====================================================

function prepararDatos() {

    // -----------------------------------------
    // REVISTAS PRINCIPALES
    // -----------------------------------------

    revistas = datosRevistas.revistas || [];


    // -----------------------------------------
    // FICHAS
    // -----------------------------------------

    fichasPorISSN = {};

    const fichas = datosFichas.fichas || [];

    fichas.forEach(ficha => {

        const issns = ficha.issn || [];

        issns.forEach(issn => {

            const clave = normalizarISSN(issn);

            if (clave) {
                fichasPorISSN[clave] = ficha;
            }

        });

    });


    // -----------------------------------------
    // ASOCIAR FICHA A CADA REVISTA
    // -----------------------------------------

    revistas = revistas.map(revista => {

        const issns = revista.issn || [];

        let fichaEncontrada = null;

        for (const issn of issns) {

            const clave = normalizarISSN(issn);

            if (fichasPorISSN[clave]) {

                fichaEncontrada =
                    fichasPorISSN[clave];

                break;
            }
        }

        return {
            ...revista,
            ficha: fichaEncontrada
        };

    });


    console.log(
        'Revistas cargadas:',
        revistas.length
    );

    console.log(
        'Fichas cargadas:',
        fichas.length
    );

}


// =====================================================
// NORMALIZAR ISSN
// =====================================================

function normalizarISSN(issn) {

    if (!issn) {
        return '';
    }

    return String(issn)
        .replace(/[^0-9Xx]/g, '')
        .toUpperCase();

}


// =====================================================
// INSTITUCIONES
// =====================================================

function mostrarInstituciones() {

    const select =
        document.getElementById('filtroInstitucion');

    if (!select) {
        return;
    }

    const instituciones = [
        ...new Set(
            revistas
                .map(r => r.institucion)
                .filter(Boolean)
        )
    ];

    instituciones.sort();

    select.innerHTML = `
        <option value="">
            Todas las instituciones
        </option>
    `;

    instituciones.forEach(institucion => {

        const option =
            document.createElement('option');

        option.value = institucion;

        option.textContent = institucion;

        select.appendChild(option);

    });

}


// =====================================================
// ESTADÍSTICAS
// =====================================================

function actualizarEstadisticas() {

    const totalRevistas =
        document.getElementById('totalRevistas');

    const totalInstituciones =
        document.getElementById('totalInstituciones');

    if (totalRevistas) {

        totalRevistas.textContent =
            revistas.length;

    }

    if (totalInstituciones) {

        const instituciones = new Set(
            revistas
                .map(r => r.institucion)
                .filter(Boolean)
        );

        totalInstituciones.textContent =
            instituciones.size;
    }

}


// =====================================================
// MOSTRAR REVISTAS
// =====================================================

function mostrarRevistas() {

    const contenedor =
        document.getElementById('resultados');

    if (!contenedor) {
        console.error('No existe #resultados');
        return;
    }


    const campoBusqueda =
        document.getElementById('busqueda');

    const campoInstitucion =
        document.getElementById('filtroInstitucion');


    const busqueda =
        campoBusqueda
            ? campoBusqueda.value.toLowerCase().trim()
            : '';


    const institucion =
        campoInstitucion
            ? campoInstitucion.value
            : '';


    const filtradas =
        revistas.filter(revista => {

            const texto = [

                revista.nombre || '',

                revista.descripcion || '',

                ...(revista.issn || []),

                revista.institucion || ''

            ]
                .join(' ')
                .toLowerCase();


            const coincideBusqueda =
                !busqueda ||
                texto.includes(busqueda);


            const coincideInstitucion =
                !institucion ||
                revista.institucion === institucion;


            return (
                coincideBusqueda &&
                coincideInstitucion
            );

        });


    // -----------------------------------------
    // CONTADOR
    // -----------------------------------------

    const contador =
        document.getElementById(
            'contadorResultados'
        );

    if (contador) {

        contador.textContent =
            `Mostrando ${filtradas.length} revistas`;

    }


    // -----------------------------------------
    // FECHA
    // -----------------------------------------

    const fecha =
        datosRevistas.fecha_cosecha;

    const elementoFecha =
        document.getElementById('fechaCosecha');

    if (fecha && elementoFecha) {

        elementoFecha.textContent =
            new Date(fecha).toLocaleString(
                'es-CR',
                {
                    dateStyle: 'long',
                    timeStyle: 'short'
                }
            );

    }


    // -----------------------------------------
    // LIMPIAR
    // -----------------------------------------

    contenedor.innerHTML = '';


    // -----------------------------------------
    // SIN RESULTADOS
    // -----------------------------------------

    const sinResultados =
        document.getElementById(
            'sinResultados'
        );

    if (sinResultados) {

        sinResultados.style.display =
            filtradas.length === 0
                ? 'block'
                : 'none';

    }


    // -----------------------------------------
    // TARJETAS
    // -----------------------------------------

    filtradas.forEach(revista => {

        const tarjeta =
            document.createElement('article');

        tarjeta.className = 'revista';


        // -------------------------------------
        // ISSN
        // -------------------------------------

        let issnTexto = '';

        if (
            revista.issn &&
            revista.issn.length
        ) {

            issnTexto =
                'ISSN: ' +
                revista.issn.join(' · ');

        }


        // -------------------------------------
        // ESTADO DE FUENTES
        // -------------------------------------

        let estadoDOAJ =
            'No encontrada';

        let claseDOAJ =
            'estado-no';


        let estadoOpenAlex =
            'No registrada';

        let claseOpenAlex =
            'estado-no';


        if (revista.ficha) {

            const fuentes =
                revista.ficha.fuentes || {};


            // DOAJ

            if (
                fuentes.doaj &&
                fuentes.doaj.encontrada
            ) {

                estadoDOAJ =
                    'Indexada';

                claseDOAJ =
                    'estado-si';

            }


            // OPENALEX

            if (
                fuentes.openalex &&
                fuentes.openalex.encontrada
            ) {

                estadoOpenAlex =
                    'Registrada';

                claseOpenAlex =
                    'estado-si';

            }

        }


        // -------------------------------------
        // FICHA
        // -------------------------------------

        const tieneFicha =
            !!revista.ficha;


        // -------------------------------------
        // TARJETA
        // -------------------------------------

        tarjeta.innerHTML = `

            <div class="revista-institucion">
                ${escaparHTML(
                    revista.institucion || ''
                )}
            </div>

            <h3>
                ${escaparHTML(
                    revista.nombre || ''
                )}
            </h3>

            ${
                issnTexto
                    ? `
                        <div class="issn">
                            ${escaparHTML(
                                issnTexto
                            )}
                        </div>
                    `
                    : ''
            }


            <div class="fuentes-indexacion">

                <div class="fuente">

                    <span class="fuente-nombre">
                        DOAJ:
                    </span>

                    <span class="fuente-estado ${claseDOAJ}">
                        ${estadoDOAJ}
                    </span>

                </div>


                <div class="fuente">

                    <span class="fuente-nombre">
                        OpenAlex:
                    </span>

                    <span class="fuente-estado ${claseOpenAlex}">
                        ${estadoOpenAlex}
                    </span>

                </div>

            </div>


            <div class="acciones-revista">

    ${
        tieneFicha
            ? `
                <button
                    type="button"
                    class="boton boton-ficha"
                    data-issn="${escaparHTML(
                        revista.ficha.issn[0]
                    )}"
                >
                    Ver ficha completa
                </button>
            `
            : ''
    }

    <a
        class="boton"
        href="${escaparHTML(
            revista.url || '#'
        )}"
        target="_blank"
        rel="noopener noreferrer"
    >
        Visitar revista
    </a>

</div>

        `;


        contenedor.appendChild(tarjeta);

    });

}


// =====================================================
// ABRIR FICHA
// =====================================================

function abrirFicha(issn) {

    console.log('Abriendo ficha para ISSN:', issn);

    const clave = String(issn)
        .replace(/-/g, '')
        .trim();

    const ficha = fichasPorISSN[clave];

    console.log('Clave buscada:', clave);
    console.log('Ficha encontrada:', ficha);

    if (!ficha) {

        alert(
            'No se encontró información detallada para el ISSN ' +
            issn
        );

        return;
    }

    mostrarFicha(ficha);
}

// ============================================
// MOSTRAR FICHA COMPLETA
// ============================================

let graficoOpenAlex = null;

function mostrarFicha(ficha) {

    const contenedor =
        document.getElementById('contenidoFicha');

    if (!contenedor) {

        console.error(
            'No existe el elemento contenidoFicha'
        );

        return;
    }


    const fuentes = ficha.fuentes || {};

    const doaj = fuentes.doaj;

    const openalex = fuentes.openalex;


    // ============================================
    // ISSN
    // ============================================

    const issnHTML =
        (ficha.issn || [])
            .map(issn => `
                <span class="ficha-issn">
                    ${escaparHTML(issn)}
                </span>
            `)
            .join('');


    // ============================================
    // DOAJ
    // ============================================

    let bloqueDOAJ = '';


    if (doaj && doaj.encontrada) {

        const subjects =
            (doaj.subjects || [])
                .map(subject =>
                    subject.term
                )
                .filter(Boolean)
                .join(', ');


        bloqueDOAJ = `

            <section class="ficha-seccion">

                <h4>DOAJ</h4>

                <div class="ficha-dato">

                    <strong>Estado:</strong>

                    <span class="ficha-estado ficha-estado-si">
                        Indexada
                    </span>

                </div>

                <div class="ficha-dato">

                    <strong>Título:</strong>

                    ${escaparHTML(
                        doaj.titulo || 'No disponible'
                    )}

                </div>

                <div class="ficha-dato">

                    <strong>Editorial:</strong>

                    ${escaparHTML(
                        doaj.publisher?.name ||
                        'No disponible'
                    )}

                </div>

                ${
                    subjects
                        ? `
                            <div class="ficha-dato">
                                <strong>Áreas:</strong>
                                ${escaparHTML(subjects)}
                            </div>
                          `
                        : ''
                }

                ${
                    doaj.doaj_url
                        ? `
                            <a
                                class="ficha-enlace"
                                href="${escaparHTML(doaj.doaj_url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Ver registro en DOAJ
                            </a>
                          `
                        : ''
                }

            </section>

        `;

    } else {

        bloqueDOAJ = `

            <section class="ficha-seccion">

                <h4>DOAJ</h4>

                <div class="ficha-dato">

                    <strong>Estado:</strong>

                    <span class="ficha-estado ficha-estado-no">
                        No encontrada
                    </span>

                </div>

            </section>

        `;
    }


    // ============================================
    // OPENALEX
    // ============================================

    let bloqueOpenAlex = '';


    if (openalex && openalex.encontrada) {

        bloqueOpenAlex = `

            <section class="ficha-seccion">

                <h4>OpenAlex</h4>

                <div class="ficha-dato">

                    <strong>Estado:</strong>

                    <span class="ficha-estado ficha-estado-si">
                        Registrada
                    </span>

                </div>

                <div class="ficha-dato">

                    <strong>Nombre:</strong>

                    ${escaparHTML(
                        openalex.nombre ||
                        'No disponible'
                    )}

                </div>

                <div class="ficha-dato">

                    <strong>Editorial:</strong>

                    ${escaparHTML(
                        openalex.publisher ||
                        'No disponible'
                    )}

                </div>


                <!-- INDICADORES -->

                <div class="indicadores-openalex">

                    <div class="indicador-openalex">

                        <strong>
                            ${formatearNumero(
                                openalex.works_count
                            )}
                        </strong>

                        <span>
                            Obras
                        </span>

                    </div>


                    <div class="indicador-openalex">

                        <strong>
                            ${formatearNumero(
                                openalex.cited_by_count
                            )}
                        </strong>

                        <span>
                            Citas recibidas
                        </span>

                    </div>


                    <div class="indicador-openalex">

                        <strong>
                            ${formatearNumero(
                                openalex.h_index
                            )}
                        </strong>

                        <span>
                            Índice h
                        </span>

                    </div>


                    <div class="indicador-openalex">

                        <strong>
                            ${formatearNumero(
                                openalex.i10_index
                            )}
                        </strong>

                        <span>
                            Índice i10
                        </span>

                    </div>

                </div>


                <div class="ficha-dato">

                    <strong>Acceso abierto:</strong>

                    ${
                        openalex.open_access
                            ? 'Sí'
                            : 'No'
                    }

                </div>


                <div class="ficha-dato">

                    <strong>En DOAJ según OpenAlex:</strong>

                    ${
                        openalex.en_doaj
                            ? 'Sí'
                            : 'No'
                    }

                </div>


                ${
                    openalex.id
                        ? `
                            <a
                                class="ficha-enlace"
                                href="${escaparHTML(openalex.id)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Ver registro en OpenAlex
                            </a>
                          `
                        : ''
                }

            </section>


            ${
                openalex.counts_by_year &&
                openalex.counts_by_year.length
                    ? `

                        <section class="ficha-seccion">

                            <h4>
                                Producción por año
                            </h4>

                            <div class="grafico-contenedor">

                                <canvas
                                    id="graficoOpenAlex"
                                ></canvas>

                            </div>

                        </section>

                      `
                    : ''
            }

        `;

    } else {

        bloqueOpenAlex = `

            <section class="ficha-seccion">

                <h4>OpenAlex</h4>

                <div class="ficha-dato">

                    <strong>Estado:</strong>

                    <span class="ficha-estado ficha-estado-no">
                        No registrada
                    </span>

                </div>

            </section>

        `;
    }


    // ============================================
    // CONTENIDO COMPLETO
    // ============================================

    contenedor.innerHTML = `

        <h2
            id="tituloFicha"
            class="ficha-titulo"
        >
            ${escaparHTML(
                ficha.nombre || 'Revista'
            )}
        </h2>


        <div class="ficha-institucion">

            ${escaparHTML(
                ficha.institucion || ''
            )}

        </div>


        <!-- INFORMACIÓN GENERAL -->

        <section class="ficha-seccion">

            <h4>
                Información general
            </h4>


            <div class="ficha-dato">

                <strong>ISSN:</strong>

                <div>
                    ${issnHTML}
                </div>

            </div>


            <div class="ficha-dato">

                <strong>Sitio web:</strong>

                <a
                    class="ficha-enlace"
                    href="${escaparHTML(ficha.url || '#')}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Visitar revista
                </a>

            </div>

        </section>


        ${bloqueDOAJ}

        ${bloqueOpenAlex}

    `;


    // ============================================
    // MOSTRAR MODAL
    // ============================================

    const modal =
        document.getElementById('modalFicha');


    if (modal) {

        modal.style.display = 'block';

        document.body.style.overflow = 'hidden';

    }


    // ============================================
    // CREAR GRÁFICO
    // ============================================

    if (
        openalex &&
        openalex.encontrada &&
        openalex.counts_by_year &&
        openalex.counts_by_year.length
    ) {

        setTimeout(() => {

            crearGraficoOpenAlex(
                openalex.counts_by_year
            );

        }, 50);

    }

}

// ============================================
// FORMATEAR NÚMEROS
// ============================================

function formatearNumero(numero) {

    if (
        numero === null ||
        numero === undefined ||
        numero === ''
    ) {
        return '—';
    }

    return Number(numero).toLocaleString('es-CR');

}

// ============================================
// GRÁFICO OPENALEX
// ============================================

function crearGraficoOpenAlex(datos) {

    const canvas =
        document.getElementById(
            'graficoOpenAlex'
        );


    if (!canvas) {
        return;
    }


    // Destruir gráfico anterior

    if (graficoOpenAlex) {

        graficoOpenAlex.destroy();

        graficoOpenAlex = null;

    }


    // Ordenar cronológicamente

    const ordenados =
        [...datos].sort(
            (a, b) => a.year - b.year
        );


    const etiquetas =
        ordenados.map(
            item => item.year
        );


    const obras =
        ordenados.map(
            item => item.works_count || 0
        );


    graficoOpenAlex =
        new Chart(
            canvas,
            {

                type: 'bar',

                data: {

                    labels: etiquetas,

                    datasets: [

                        {

                            label: 'Obras',

                            data: obras,

                            borderWidth: 1

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    plugins: {

                        legend: {
                            display: true
                        }

                    },

                    scales: {

                        x: {

                            title: {
                                display: true,
                                text: 'Año'
                            }

                        },

                        y: {

                            beginAtZero: true,

                            title: {
                                display: true,
                                text: 'Obras'
                            },

                            ticks: {
                                precision: 0
                            }

                        }

                    }

                }

            }
        );

}



// =====================================================
// CERRAR FICHA
// =====================================================

function cerrarFicha() {

    const modal =
        document.getElementById('modalFicha');

    if (modal) {
        modal.style.display = 'none';
    }

    document.body.style.overflow = '';
}


document
    .getElementById('cerrarFicha')
    ?.addEventListener(
        'click',
        cerrarFicha
    );


document
    .getElementById('modalFicha')
    ?.addEventListener(
        'click',
        function(event) {

            if (event.target === this) {
                cerrarFicha();
            }

        }
    );


// =====================================================
// MOSTRAR ISSN
// =====================================================

function mostrarISSN(issns) {

    if (
        !issns ||
        !issns.length
    ) {

        return '—';

    }

    return issns
        .map(issn => `
            <span class="ficha-issn">
                ${escaparHTML(issn)}
            </span>
        `)
        .join('');

}


// =====================================================
// ESCAPAR HTML
// =====================================================

function escaparHTML(texto) {

    if (
        texto === null ||
        texto === undefined
    ) {

        return '';

    }

    return String(texto)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

}


// =====================================================
// ESCAPAR JAVASCRIPT
// =====================================================

function escaparJS(texto) {

    return String(texto || '')
        .replaceAll('\\', '\\\\')
        .replaceAll("'", "\\'")
        .replaceAll('"', '\\"');

}


// =====================================================
// EVENTOS
// =====================================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        const busqueda =
            document.getElementById(
                'busqueda'
            );

        const filtro =
            document.getElementById(
                'filtroInstitucion'
            );

        const cerrar =
            document.getElementById(
                'cerrarFicha'
            );

        if (busqueda) {

            busqueda.addEventListener(
                'input',
                mostrarRevistas
            );

        }

        if (filtro) {

            filtro.addEventListener(
                'change',
                mostrarRevistas
            );

        }

        if (cerrar) {

            cerrar.addEventListener(
                'click',
                cerrarFicha
            );

        }


        // Cerrar haciendo clic fuera del contenido

        const modal =
            document.getElementById(
                'modalFicha'
            );

        if (modal) {

            modal.addEventListener(
                'click',
                event => {

                    if (
                        event.target === modal
                    ) {

                        cerrarFicha();

                    }

                }
            );

        }


        // Cerrar con ESC

        document.addEventListener(
            'keydown',
            event => {

                if (
                    event.key === 'Escape'
                ) {

                    cerrarFicha();

                }

            }
        );


        cargarDatos();

    }
);

// =====================================================
// BOTONES "VER FICHA COMPLETA"
// =====================================================

document.addEventListener('click', function(event) {

    const boton = event.target.closest('.boton-ficha');

    if (!boton) {
        return;
    }

    const issn = boton.dataset.issn;

    console.log('Abriendo ficha para ISSN:', issn);

    abrirFicha(issn);

});