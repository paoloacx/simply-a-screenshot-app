// Fórmulas y sugerencias de textos y etiquetas en ESPAÑOL como base para App Store.
// Al seleccionar una fórmula, se inserta en el titular o etiqueta del idioma activo.
// Las palabras entre [corchetes] son marcadores que el usuario reemplaza con sus datos.

export type CopyIdea = {
  formula: string;  // se inserta en el titular; "\n" es un salto de línea intencionado
  example: string;  // ejemplo real para mostrar el patrón
};

export type CopyIdeaSlot = {
  id: string;
  name: string;
  label: string;    // sugerencia de etiqueta para esta posición
  ideas: CopyIdea[];
};

export type LabelSuggestion = {
  id: string;
  label: string;    // texto sugerido (puede ser 1 o 2 líneas con "\n")
  desc: string;     // descripción o contexto
  category: "dos-lineas" | "esencial" | "beneficio" | "privacidad" | "destacado";
};

export const COPY_IDEA_SLOTS: CopyIdeaSlot[] = [
  {
    id: "hero",
    name: "Pantalla principal · Bienvenida",
    label: "DESCUBRE [APP]",
    ideas: [
      { formula: "[Resultado deseado],\nsin [complicación].", example: "Café de barista,\nsin complicaciones." },
      { formula: "Tus [elemento],\npor fin claros.", example: "Tus finanzas,\npor fin claras." },
      { formula: "[Verbo] [cosa].\n[Verbo] [meta].", example: "Crea hábitos.\nAlcanza tus metas." },
      { formula: "Cada [cosa],\n[resultado].", example: "Cada entrenamiento,\nbien contado." },
      { formula: "Conoce a tu nuevo\n[rol/asistente].", example: "Conoce a tu nuevo\nentrenador personal." },
      { formula: "Todo lo que necesitas\nen un solo lugar.", example: "Tus notas y tareas,\nen un solo lugar." },
    ],
  },
  {
    id: "differentiator",
    name: "Diferenciador único",
    label: "SOLO EN [APP]",
    ideas: [
      { formula: "Solo [App]\n[hace lo especial].", example: "Solo Bloom sabe cuándo tu café está en su punto." },
      { formula: "Sin [molestia].\nSolo [beneficio].", example: "Sin anuncios.\nSolo tu progreso." },
      { formula: "Diseñado para personas\nque [valoran X].", example: "Diseñado para los que cuidan cada detalle." },
      { formula: "[Acción] una vez.\n[Resultado] para siempre.", example: "Escanéalo una vez.\nGuardado para siempre." },
      { formula: "100% privado.\nTus datos son tuyos.", example: "100% privado.\nSin rastreadores ni cuentas." },
    ],
  },
  {
    id: "feature",
    name: "Funcionalidades y características",
    label: "FUNCIÓN 01",
    ideas: [
      { formula: "[Acción] tu [cosa]\nen [tiempo].", example: "Registra tu comida\nen 3 segundos." },
      { formula: "Tu [cosa],\nsiempre organizado.", example: "Tu despensa,\nsiempre organizada." },
      { formula: "Nunca más\n[problema recurrente].", example: "Nunca más olvides\nun pago importante." },
      { formula: "De [situación previa]\na [resultado genial].", example: "De ticket arrugado\na presupuesto en un toque." },
      { formula: "Directo en tu\n[pantalla/widget].", example: "Directo en tu\npantalla de bloqueo." },
      { formula: "Filtra y organiza\nal instante.", example: "Encuentra cualquier archivo\nen un par de clics." },
    ],
  },
  {
    id: "proof",
    name: "Confianza y prueba social",
    label: "AMADA POR MILES",
    ideas: [
      { formula: "Más de [Número] personas\nconfían en [App].", example: "Más de 50.000 personas entrenan con nosotros." },
      { formula: "La app favorita de\n[público objetivo].", example: "La app favorita de baristas y apasionados del café." },
      { formula: "Privacidad real\ndesde el primer día.", example: "Tus datos nunca salen de tu dispositivo." },
      { formula: "5 estrellas en calidad\ny sencillez.", example: "5.0 ★★★★★ Más de 10.000 valoraciones positivas." },
    ],
  },
  {
    id: "closer",
    name: "Llamada a la acción y cierre",
    label: "Y MUCHO MÁS",
    ideas: [
      { formula: "Y mucho,\nmucho más.", example: "Widgets, atajos de Siri y modo oscuro completo." },
      { formula: "Hecho para personas\nque aman [valor].", example: "Hecho para personas que aman la productividad." },
      { formula: "Tu primera semana\nempieza hoy.", example: "Comienza hoy y nota la diferencia." },
      { formula: "Empieza gratis\nsin compromiso.", example: "Pruébalo gratis hoy mismo." },
    ],
  },
];

export const LABEL_CATEGORIES = [
  { id: "dos-lineas", name: "Etiquetas en 2 líneas" },
  { id: "esencial", name: "Esenciales y orden" },
  { id: "beneficio", name: "Beneficios y rapidez" },
  { id: "privacidad", name: "Privacidad y seguridad" },
  { id: "destacado", name: "Top y valoraciones" },
] as const;

export const LABEL_SUGGESTIONS: LabelSuggestion[] = [
  // Etiquetas en dos líneas
  { id: "l2-privado", label: "EXPERIENCIA\n100% PRIVADA", desc: "Seguridad y sin rastreo en 2 líneas", category: "dos-lineas" },
  { id: "l2-todo", label: "TODO EN UNO\nPARA TU DÍA A DÍA", desc: "Organización completa en 2 líneas", category: "dos-lineas" },
  { id: "l2-tiempo", label: "AHORRA TIEMPO\nCADA SEMANA", desc: "Productividad y rapidez en 2 líneas", category: "dos-lineas" },
  { id: "l2-anuncios", label: "SIN ANUNCIOS\nNI SUSCRIPCIONES", desc: "Pago único o libre de distracciones", category: "dos-lineas" },
  { id: "l2-diseno", label: "DISEÑO INTUITIVO\nY ELEGANTE", desc: "Cuidado visual en 2 líneas", category: "dos-lineas" },
  { id: "l2-widgets", label: "WIDGETS Y ATAJOS\nSIEMPRE A MANO", desc: "Integración con iOS en 2 líneas", category: "dos-lineas" },

  // Esenciales y orden
  { id: "f01", label: "FUNCIÓN 01", desc: "Numeración estándar App Store", category: "esencial" },
  { id: "f02", label: "FUNCIÓN 02", desc: "Numeración estándar App Store", category: "esencial" },
  { id: "f03", label: "FUNCIÓN 03", desc: "Numeración estándar App Store", category: "esencial" },
  { id: "descubre", label: "DESCUBRE [APP]", desc: "Presentación inicial del producto", category: "esencial" },
  { id: "novedad", label: "NOVEDAD", desc: "Última versión o nueva función", category: "esencial" },
  { id: "pro", label: "VERSIÓN PRO", desc: "Funciones avanzadas o premium", category: "esencial" },

  // Beneficios y rapidez
  { id: "todo-en-uno", label: "TODO EN UNO", desc: "Reemplaza múltiples herramientas", category: "beneficio" },
  { id: "ahorra-tiempo", label: "AHORRA TIEMPO", desc: "Enfoque en rapidez y productividad", category: "beneficio" },
  { id: "sin-esfuerzo", label: "SIN ESFUERZO", desc: "Facilidad de uso instantánea", category: "beneficio" },
  { id: "automatico", label: "100% AUTOMÁTICO", desc: "Sin configuración manual", category: "beneficio" },
  { id: "facil", label: "FÁCIL Y RÁPIDO", desc: "Curva de aprendizaje cero", category: "beneficio" },

  // Privacidad y seguridad
  { id: "privado", label: "100% PRIVADO", desc: "Tus datos nunca salen del dispositivo", category: "privacidad" },
  { id: "sin-anuncios", label: "SIN ANUNCIOS", desc: "Experiencia limpia e ininterrumpida", category: "privacidad" },
  { id: "seguro", label: "TOTALMENTE SEGURO", desc: "Cifrado y protección completa", category: "privacidad" },
  { id: "sin-registro", label: "SIN REGISTROS", desc: "Uso inmediato sin crear cuenta", category: "privacidad" },

  // Top y valoraciones
  { id: "cinco-estrellas", label: "★ 5.0 ESTRELLAS ★", desc: "Valoración destacada en App Store", category: "destacado" },
  { id: "top-valorada", label: "TOP VALORADA", desc: "Reconocimiento y confianza", category: "destacado" },
  { id: "amada", label: "AMADA POR MILES", desc: "Gran comunidad de usuarios", category: "destacado" },
  { id: "mas-mas", label: "Y MUCHO MÁS", desc: "Cierre de colección de pantallas", category: "destacado" },
];
