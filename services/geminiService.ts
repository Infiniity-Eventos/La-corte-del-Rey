// Hardcoded Topics List provided by User
const STATIC_TOPICS = [
  "Fuego", "Agua", "Guerras", "Frecuencia", "Caos", "Videojuegos", "Conspiraciones", "Espacio", "Calle", "Magia",
  "Tecnología", "Sueños", "Tiempo", "Universo", "Sombras", "Luz", "Naturaleza", "Ciudad", "Ritual", "Neón",
  "Robots", "Mutantes", "Futuro", "Pasado", "Realidad", "Glitch", "Meteoros", "Océano", "Laberintos", "Portales",
  "Datos", "Piratas", "Selva", "Dioses", "Código", "Batería", "Batalla", "Energía", "Tormenta", "Silencio",
  "Ruido", "Humo", "Reinos", "Clones", "Memoria", "Señales", "Misterio", "Poder", "Destino", "Revolución",
  "Sistema", "Callejón", "Arena", "Rayo", "Trueno", "Ceniza", "Volcanes", "Hielo", "Aire", "Viento",
  "Electricidad", "Bunker", "Apocalipsis", "Reinicio", "Loop", "Dimensión", "Espejo", "Mapa", "Riesgo", "Planeta",
  "Nave", "Galaxy", "Micro", "Beat", "Barrio", "Ring", "Leyenda", "Mito", "Choque", "Impacto",
  "Furia", "Calma", "Pulso", "Latido", "Vibración", "Ritmo", "Trampa", "Frontera", "Abismo", "Cielo",
  "Infierno", "Corona", "Trono", "Rebelión", "Virus", "Hackeo", "Cámara", "Escenario", "Round", "Final"
];

// Hardcoded Battles List provided by User
const STATIC_BATTLES = [
  "Luz vs Sombra", "Mente vs Corazón", "Rapero vs Sistema", "Micro vs Beat", "Calle vs Palacio",
  "Rayo vs Trueno", "Rey vs Bufón", "Silencio vs Ruido", "Sol vs Luna", "Barrio vs Elite",
  "Viento vs Tierra", "Revolución vs Gobierno", "Ángel vs Demonio", "Héroes vs Villanos", "Fuego vs Agua",
  "Ciudad vs Naturaleza", "Robot vs Humano", "Titán vs Mortal", "Ciencia vs Magia", "Verdad vs Mentira",
  "Vida vs Destino", "Hielo vs Fuego", "Realidad vs Sueño", "Dragón vs Caballero", "Cielo vs Infierno",
  "Líder vs Rebelde", "Orden vs Caos", "Dios vs Diablo", "Fuerza vs Estrategia", "Día vs Noche",
  "Amor vs Odio", "Rico vs Pobre", "Sabio vs Ignorante", "Guerra vs Paz", "Maestro vs Alumno",
  "Tigre vs León", "Oro vs Plata", "David vs Goliat", "Norte vs Sur", "Tinta vs Papel",
  "Lobo vs Oveja", "Espada vs Escudo", "Blanco vs Negro", "Alfa vs Omega", "Principio vs Final",
  "Mar vs Desierto", "Talento vs Disciplina", "Viejo vs Nuevo", "Flow vs Técnica", "Escenario vs Gradas",
  "Héroe vs Antihéroe", "Policía vs Ladrón", "Cazador vs Presa", "Invierno vs Verano", "Martillo vs Yunque",
  "Vida vs Muerte", "Raíz vs Fruto", "Gigante vs Enano", "Águila vs Serpiente", "Solista vs Grupo",
  "Clásico vs Moderno", "Libertad vs Prisión", "Éxito vs Fracaso", "Instinto vs Razón", "Carne vs Espíritu",
  "Tiempo vs Espacio", "Fe vs Duda", "Creador vs Destructor", "Fama vs Anonimato", "Rey vs Peón",
  "Orgullo vs Humildad", "Risa vs Llanto", "Salud vs Enfermedad", "Vampiro vs Hombre Lobo", "Pirata vs Ninja",
  "Alienígena vs Terrícola", "Digital vs Análogo", "Lápiz vs Goma", "Veneno vs Antídoto", "Candado vs Llave",
  "Pregunta vs Respuesta", "Problema vs Solución", "Miedo vs Coraje", "Justicia vs Venganza", "Poder vs Responsabilidad",
  "Arena vs Asfalto", "Bosque vs Selva", "Río vs Océano", "Fantasma vs Vivo", "Puño vs Palabra",
  "Bala vs Chaleco", "Juez vs Jurado", "Siembra vs Cosecha", "Ruina vs Riqueza", "Leyenda vs Mito",
  "Monstruo vs Niño", "Samurai vs Vikingo", "Zombie vs Superviviente", "Original vs Copia", "Todo vs Nada"
];

// Hardcoded Terminations List provided by User
const STATIC_TERMINATIONS = [
  "AJE", "ANO", "ENTE", "IDO", "OR", "AL", "EZ", "URA", "ÓN", "AR",
  "IVO", "OSO", "ADA", "ERO", "DAD", "EZA", "IL", "CIÓN", "ISTA", "ANTE",
  "ARIO", "ISMO", "UD", "ENCIA", "EÑO", "INA", "AZ", "OTE", "IEGO", "UELO",
  "ANDA", "OL", "UMBRE", "IZO", "ER", "EL", "IR", "ULA", "ANZA", "OCO",
  "ICIA", "ECHO", "MA", "INO", "ERTO", "ASTA", "UDO", "OQUE", "ELA", "UCHO",
  "ORIA", "ASTRO", "ESO", "ERNO", "UTO", "OJA", "AZA", "EJA", "ISO", "UNTO",
  "ALTA", "ORRO", "AMA", "IERRA", "OLA", "UR", "UCA", "ETA", "ITO", "UERTO",
  "ONTO", "UL", "AIRO", "EJO", "IS", "UCE", "OMO", "ALLO", "IENTO", "UEVA",
  "ISCO", "EJE", "UÑA", "ONGA", "USCO", "ALGO", "ARGO", "UESO", "AÑA", "URRA",
  "OCHE", "INCA", "ONDO", "IQUE", "UCIA", "ALMA", "ORNO", "ITIS", "AX", "OZ"
];

// Hardcoded Questions List provided by User
const STATIC_QUESTIONS = [
  "¿Qué secreto vergonzoso oculta tu rival?", "¿Por qué tu oponente no te mira a los ojos?",
  "¿A quién le robó las rimas tu contrincante?", "¿Qué excusa pondrá tu adversario cuando pierda?",
  "¿Qué busca tu enemigo en Google por las noches?", "¿Por qué tu rival finge tener calle?",
  "¿Cuál es la mayor debilidad de tu oponente?", "¿Qué le diría su madre a tu contrincante ahora mismo?",
  "¿De qué se disfraza tu adversario los fines de semana?", "¿Por qué le tiemblan las piernas a tu enemigo?",
  "¿Qué rima se le acaba de olvidar a tu rival?", "¿Quién escribe realmente las letras de tu oponente?",
  "¿Qué foto borraría tu contrincante de su celular?", "¿A qué juez intentó sobornar tu adversario?",
  "¿Cuál fue el peor trabajo que tuvo tu enemigo?", "¿Por qué echaron a tu rival de su propia casa?",
  "¿Qué canción escucha tu oponente en la ducha?", "¿Cuál es el placer culposo de tu contrincante?",
  "¿A quién le debe dinero tu adversario?", "¿Qué busca tu enemigo en la basura?",
  "¿Por qué se viste tan mal tu rival?", "¿Qué haría tu oponente con el premio si ganara?",
  "¿Cuál es el defecto físico que esconde tu contrincante?", "¿A qué famoso le escribe mensajes tu adversario?",
  "¿Qué superpoder inútil tendría tu enemigo?", "¿Por qué no tiene amigos reales tu rival?",
  "¿Qué guarda tu oponente debajo de su cama?", "¿Cuál es la peor pesadilla de tu contrincante?",
  "¿Qué opina la familia de tu adversario sobre su rap?", "¿Por qué dejó los estudios tu enemigo?",
  "¿Qué tatuaje ridículo tiene tu rival?", "¿Con qué personaje de caricatura se identifica tu oponente?",
  "¿Qué haría tu contrincante si fuera invisible?", "¿Cuál es la mentira favorita de tu adversario?",
  "¿Qué robó tu enemigo en el supermercado?", "¿A quién traicionó tu rival para llegar aquí?",
  "¿Qué come tu oponente cuando está triste?", "¿Por qué tartamudea tu contrincante?",
  "¿Qué palabra no sabe pronunciar tu adversario?", "¿Cuál es el contacto más famoso en el celular de tu enemigo?",
  "¿Qué olor le recuerda a su ex a tu rival?", "¿Por qué tu oponente odia los espejos?",
  "¿Qué video de su pasado le da vergüenza a tu contrincante?", "¿A qué edad perdió la inocencia tu adversario?",
  "¿Qué haría tu enemigo en una isla desierta?", "¿Cuál es el verdadero nombre de tu rival?",
  "¿Por qué cambió su estilo de repente tu oponente?", "¿Qué le diría tu contrincante a su yo del pasado?",
  "¿Cuál sería el crimen perfecto para tu adversario?", "¿Qué animal sería tu enemigo y por qué?",
  "¿Quién es el amor platónico de tu rival?", "¿Por qué nadie respeta a tu oponente en su barrio?",
  "¿Qué haría tu contrincante si fuera presidente?", "¿Cuál es el mayor fracaso en la vida de tu adversario?",
  "¿Qué promesa rompió ayer tu enemigo?", "¿Por qué se cree el mejor tu rival sin serlo?",
  "¿Qué mensaje no se atreve a enviar tu oponente?", "¿Cuál es la rutina de belleza de tu contrincante?",
  "¿Qué sonido le molesta más a tu adversario?", "¿Por qué tu enemigo no confía en nadie?",
  "¿Qué lleva tu rival en esa mochila?", "¿Cuál es la fobia más ridícula de tu oponente?",
  "¿A quién copia su flow tu contrincante?", "¿Qué haría tu adversario con un millón de dólares?",
  "¿Por qué sigue soltero tu enemigo?", "¿Qué le pediría tu rival al genio de la lámpara?",
  "¿Cuál es la película favorita de tu oponente?", "¿Por qué finge ser rudo tu contrincante?",
  "¿Qué hizo tu adversario en su último cumpleaños?", "¿Cuál es el talento más inútil de tu enemigo?",
  "¿A quién eliminaría tu rival de esta competencia?", "¿Qué opina realmente tu oponente de sí mismo?",
  "¿Por qué tu contrincante suda tanto?", "¿Qué haría tu adversario si se acaba el mundo hoy?",
  "¿Cuál es el insulto que más le duele a tu enemigo?", "¿Por qué se cree un Dios tu rival?",
  "¿Qué es lo peor que ha cocinado tu oponente?", "¿A quién stalkea en redes tu contrincante?",
  "¿Cuál es el recuerdo más triste de tu adversario?", "¿Por qué tu enemigo no sabe improvisar?",
  "¿Qué juguete abrazaba de niño tu rival?", "¿Cuál es la marca de ropa favorita de tu oponente?",
  "¿Por qué se ríe falsamente tu contrincante?", "¿Qué haría tu adversario si pierde la voz?",
  "¿Cuál es el lugar seguro de tu enemigo?", "¿Por qué es tan aburrido tu rival?",
  "¿Qué consejo le daría tu oponente a su hijo?", "¿Cuál es el mayor arrepentimiento de tu contrincante?",
  "¿Por qué siempre llega tarde tu adversario?", "¿Qué superhéroe detesta tu enemigo?",
  "¿Cuál es la bebida favorita de tu rival?", "¿Por qué tiene esa cicatriz tu oponente?",
  "¿Qué haría tu contrincante si fuera del sexo opuesto?", "¿Cuál es el libro favorito de tu adversario?",
  "¿Por qué miente sobre su edad tu enemigo?", "¿Qué reza tu rival antes de dormir?",
  "¿Cuál es el peor hábito de tu oponente?", "¿Por qué tu contrincante no acepta la derrota?",
  "¿Qué haría tu adversario por un minuto de fama?", "¿Cuál es la última voluntad de tu enemigo?"
];

export const generateTopics = async (count: number = 40): Promise<string[]> => {
  const shuffled = [...STATIC_TOPICS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

export const generateTerminations = async (count: number = 40): Promise<string[]> => {
  const shuffled = [...STATIC_TERMINATIONS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

export const generateCharacterBattles = async (count: number = 20): Promise<string[]> => {
  const shuffled = [...STATIC_BATTLES];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

export const generateQuestions = async (count: number = 20): Promise<string[]> => {
  const shuffled = [...STATIC_QUESTIONS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

export const generateTopicImage = async (topic: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Genera una imagen visualmente impactante, creativa y única para servir como estímulo en una batalla de freestyle.
            No te limites al estilo urbano. Puede ser surrealista, fotorealista, cyberpunk, fantasía oscura, abstracta o cartoon.
            Representa visualmente el concepto: "${topic}".
            IMPORTANTE: NO incluyas texto en la imagen. Solo la imagen pura.`
          }
        ],
      },
    });

    // Extract image from response
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
};

export const generateVotingBackground = async (): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Genera una imagen épica para fondo de pantalla. 
            Tema: Un bufón (Jester) rapero o improvisando en un escenario oscuro y urbano.
            Estilo: Arte conceptual oscuro, neón, humo, alta definición, dramático.
            Colores: Predominantemente oscuro, con toques de morado y humo.
            Sin texto.`
          }
        ],
      },
    });

    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating voting bg:", error);
    return null;
  }
};

export const editImage = async (base64Image: string, prompt: string, mimeType: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
    });

    // Extract image from response
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (error) {
    console.error("Error editing image:", error);
    return null;
  }
};