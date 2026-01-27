
export interface NewsItem {
    title: string;
    source: string;
    description?: string;
}

const PROXY_URL = 'https://api.allorigins.win/get?url=';
const RSS_FEED_URL = 'https://news.google.com/rss/search?q=Bogota+Cultura+Sociedad+Arte+Curiosidades+Eventos&ceid=CO:es-419&hl=es-419&gl=CO';

const CURATED_NEWS = [
    // Movilidad e Infraestructura
    { title: "Licitación fallida: Declaran desierta la licitación para la Línea 2 del Metro de Bogotá tras falta de ofertas.", source: "Movilidad Bogotá" },
    { title: "Impacto al bolsillo: Tarifas de peajes en las salidas de Bogotá suben según el IPC este 16 de enero.", source: "Economía Local" },
    { title: "Transporte intermunicipal: Usuarios denuncian alzas de hasta $1.000 en pasajes de rutas Bogotá-Mosquera.", source: "Denuncia Ciudadana" },
    { title: "Pico y Placa: Distrito confirma que la medida para particulares se mantiene sin cambios de horario para el primer semestre.", source: "Tránsito Bogotá" },
    { title: "Modernización urbana: Instalan los primeros baños públicos de alta tecnología (origen europeo) en calles de Bogotá.", source: "Urbanismo" },
    { title: "Alerta en el norte: Accidente fatal entre camión cisterna y peatón bloquea la Autopista Norte con calle 195.", source: "Reporte Vial" },
    { title: "Obra pública: Distrito anuncia inicio de megaobras por $1,8 billones en distintas localidades para febrero.", source: "Infraestructura" },
    { title: "Mantenimiento vial: Reportan cierres nocturnos en la Avenida 68 por avances en las obras del carril de Transmilenio.", source: "Obras Bogotá" },
    { title: "Cortes de agua: La EAAB programa suspensiones rotativas en Suba, Teusaquillo y Bosa por cambio de válvulas.", source: "Servicios Públicos" },
    { title: "Crisis de impuestos: Consejo de Bogotá critica la prescripción de $734.000 millones en deudas tributarias no cobradas.", source: "Política Distrital" },

    // Seguridad y Orden Público
    { title: "Atentado en el centro: Granada de fragmentación en el barrio Santa Fe deja un fallecido de 72 años y tres heridos.", source: "Judicial" },
    { title: "Golpe al hurto: Policía incauta celulares escondidos en carretillas de vendedores informales en el centro.", source: "Seguridad" },
    { title: "Capturas internacionales: Caen en Bogotá 15 personas con circular roja de Interpol en los primeros 20 días del año.", source: "Interpol Colombia" },
    { title: "Sicariato en Ciudad Bolívar: Mujer de 45 años es asesinada en el sector de El Tesoro; autoridades investigan cámaras.", source: "Judicial" },
    { title: "Homicidio en Usme: Capturan a menor de 15 años implicada en el asesinato de un joven en el sur de la ciudad.", source: "Judicial" },
    { title: "Inseguridad en bicicletas: Banda de nueve delincuentes en cicla asalta ferretería en el barrio Caldas.", source: "Denuncia" },
    { title: "Drogas sintéticas: Agente encubierto logra la captura de siete integrantes de 'Los Dealers' en Chapinero.", source: "Antinarcóticos" },
    { title: "Medicamentos ilegales: Incautan 30.000 unidades de fármacos vencidos y de uso institucional en operativo masivo.", source: "Salud Pública" },
    { title: "Localidades críticas: Suba y Kennedy lideran las cifras de hurto a personas en lo que va de enero.", source: "Estadísticas" },
    { title: "Justicia por mano propia: Conductor persigue y atropella a presuntos fleteros en la localidad de Engativá.", source: "Orden Público" },

    // Cultura y Eventos
    { title: "Tradición viva: Miles de bogotanos asisten a la Fiesta de Reyes Magos en el barrio Egipto.", source: "Cultura Patrimonio" },
    { title: "Ruta Teatro: Bogotá lanza su circuito escénico más grande con 80 funciones en salas emblemáticas.", source: "Artes Escénicas" },
    { title: "Conciertos 2026: El Teatro Mayor Julio Mario Santo Domingo presenta su temporada con Alemania como nación invitada.", source: "Música Clásica" },
    { title: "Inmersión sonora: El Planetario de Bogotá estrena 'Tren al Sur', un recorrido por la historia del rock en español.", source: "Planetario" },
    { title: "Alimentarte Food Fest: El festival gastronómico regresa al Parque El Country con lo mejor de la cocina local.", source: "Gastronomía" },
    { title: "Biblovacaciones: Bibliotecas públicas de Bogotá llenan sus cupos con talleres de ciencia y lectura para niños.", source: "Educación y Cultura" },
    { title: "Filarmónica de Bogotá: La Banda Juvenil abre temporada con conciertos gratuitos en parques de Tunjuelito.", source: "Música al Parque" },
    { title: "Turismo de inicio de año: El Cerro de Monserrate reporta cifras récord de visitantes durante el puente de Reyes.", source: "Turismo Religioso" },
    { title: "Cine al aire libre: La Cinemateca de Bogotá inicia ciclo de proyecciones gratuitas en barrios periféricos.", source: "Cine Distrital" },
    { title: "Yoga en Chapinero: El Centro Felicidad (CEFE) inaugura clases masivas gratuitas en su terraza del piso 11.", source: "Bienestar" },

    // Política y Elecciones 2026
    { title: "Debate Presidencial: Se realiza en Bogotá el primer 'Debate de la Gente' con candidatos de centro-derecha.", source: "Política Nacional" },
    { title: "Alianza de Centro: Sergio Fajardo y Claudia López mantienen diálogos para una posible consulta interpartidista.", source: "Elecciones 2026" },
    { title: "Pacto Histórico en vilo: CNE evalúa si Iván Cepeda puede participar en la consulta de marzo por supuesta inhabilidad.", source: "Política" },
    { title: "Cumbre Petro-Trump: Confirman reunión oficial para el 3 de febrero; aspersión y seguridad serán temas clave.", source: "Relaciones Exteriores" },
    { title: "Tensión con Ecuador: Guerra arancelaria entre Bogotá y Quito afecta el comercio de textiles y energía.", source: "Economía Internacional" },
    { title: "Austeridad estatal: Senador Carlos Guevara pide reducir salarios de altos cargos directivos tras baja salarial de congresistas.", source: "Congreso" },
    { title: "Crisis diplomática: Gobierno colombiano rechaza propuesta de reunión de Daniel Noboa tras nuevos aranceles del 30%.", source: "Cancillería" },
    { title: "Polémica pensional: Gobierno expide decreto que ajusta el 'deslizamiento' del salario mínimo en pensiones.", source: "Pensiones" },
    { title: "Denuncia en la SAE: Denuncian que contratistas impidieron desalojo en finca incautada a alias 'Portafolio'.", source: "Investigación" },
    { title: "Corte Constitucional: Magistrados frenan temporalmente la declaratoria de emergencia económica del Gobierno.", source: "Justicia" },

    // Economía, Salud y Otros
    { title: "Salario Mínimo: Inicia el año con el nuevo incremento del 23%, generando fuerte impacto en nóminas empresariales.", source: "Economía" },
    { title: "Inflación: Expertos advierten un nuevo ascenso en los precios de la canasta básica familiar en enero.", source: "Finanzas Personales" },
    { title: "Sismo en la madrugada: Temblor de magnitud 3.0 con epicentro en Lenguazaque sacude a Bogotá y Cundinamarca.", source: "Sismológico" },
    { title: "Salud Pública: Distrito inicia jornada masiva de vacunación contra polio y sarampión en 20 puntos de la ciudad.", source: "Salud" },
    { title: "Fiebre Amarilla: Exigirán carné de vacunación para viajeros que se desplacen desde Bogotá hacia el Tolima.", source: "Viajes y Salud" },
    { title: "Dólar estable: La divisa estadounidense se mantiene rondando los $3.680 - $3.690 en el mercado colombiano.", source: "Mercado Librecambista" },
    { title: "Crisis en Ecopetrol: DIAN alista cobro por $5,3 billones por sanciones relacionadas con combustibles importados.", source: "Energía" },
    { title: "Fútbol local: Santa Fe se corona campeón de la Superliga tras vencer 3-0 en El Campín.", source: "Deportes" },
    { title: "Millonarios FC: El equipo azul entra en crisis de resultados tras caer en las primeras fechas del torneo.", source: "Deportes" },
    { title: "Medio Ambiente: Alerta por puntos críticos de acumulación de basuras y escombros en 1.500 zonas de Bogotá.", source: "Ambiente" }
];

export const fetchLatestNews = async (limit: number = 20): Promise<NewsItem[]> => {
    // Return a random shuffle of our curated list
    const shuffled = [...CURATED_NEWS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, limit);
};
