export type Option = {
  texto: string
  efecto: number        // puntos que suma o resta a la empresa
  flujo: string         // impacto en flujo de efectivo
  feedback: string      // explicación si eligen esta opción
}

export type Question = {
  id: number
  mes: string
  situacion: string
  pregunta: string
  opciones: Option[]
  mejor: number         // índice de la opción óptima
  concepto: string      // lección clave de la ronda
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    mes: "Mes 1 — Arranque",
    situacion: "Acaban de abrir su empresa en Tijuana. Tienen $80,000 MXN en caja. Un proveedor ofrece 20% de descuento si pagan $50,000 por adelantado en insumos.",
    pregunta: "¿Qué hacen con el pago al proveedor?",
    opciones: [
      {
        texto: "Pagamos todo adelantado — el descuento vale la pena",
        efecto: +10,
        flujo: "−$50,000 hoy, ahorro de $12,500 frente al precio normal de $62,500",
        feedback: "Buen ahorro ($12,500), pero quedas con solo $30,000 de reserva en tu primer mes. Si algo falla, no tienes colchón. El descuento vale si tu flujo está asegurado."
      },
      {
        texto: "Pagamos en 3 parcialidades — conservamos liquidez",
        efecto: +20,
        flujo: "−$16,700/mes × 3",
        feedback: "¡Excelente decisión! Conservas liquidez para operar y el proveedor aún recibe su pago. Negociar plazos es una habilidad clave en administración financiera."
      },
      {
        texto: "No compramos nada todavía — esperamos ingresos primero",
        efecto: -10,
        flujo: "$0 egreso, pero operación frenada",
        feedback: "Sin insumos no puedes operar ni generar ingresos. Esperar sin actuar puede costarte más que cualquier gasto inicial."
      },
      {
        texto: "Buscamos otro proveedor más barato",
        efecto: +5,
        flujo: "Sin egreso inmediato, tiempo perdido buscando",
        feedback: "Puede funcionar, pero buscando pierdes tiempo y el mercado no espera. A veces la velocidad vale más que el precio perfecto."
      }
    ],
    mejor: 1,
    concepto: "Negociar plazos preserva tu flujo de efectivo sin renunciar a los insumos que necesitas."
  },
  {
    id: 2,
    mes: "Mes 1 — Precios",
    situacion: "Un cliente te pide cotización para un proyecto de consultoría de un mes. Tu equipo calcula que los costos directos del proyecto (horas del equipo, materiales y herramientas) son $45,000.",
    pregunta: "¿Cuánto le cobras al cliente por el proyecto?",
    opciones: [
      {
        texto: "$40,000 — para ganar el cliente rápido",
        efecto: -20,
        flujo: "Ingresos < costos. Pérdida de $5,000 en este proyecto",
        feedback: "Cobrar menos de lo que te cuesta producir es un error fatal. Cada proyecto que cotizas así tu empresa pierde dinero aunque trabaje duro. El cliente barato sale caro."
      },
      {
        texto: "$50,000 — cubre costos con margen mínimo",
        efecto: +5,
        flujo: "Utilidad de $5,000 en el proyecto — muy ajustado",
        feedback: "Cubres costos, pero sin margen para imprevistos, errores o reinversión. Es supervivencia, no negocio. Un margen del 11% no sostiene ninguna empresa a largo plazo."
      },
      {
        texto: "$65,000 — precio con margen del 30%",
        efecto: +20,
        flujo: "Utilidad de $20,000 en el proyecto — saludable",
        feedback: "¡Correcto! Un margen del 30% sobre costos te permite operar, reinvertir y tener reserva para proyectos con imprevistos. El precio debe cubrir costos + utilidad + contingencia."
      },
      {
        texto: "$90,000 — precio premium sin justificación",
        efecto: -5,
        flujo: "Alta utilidad potencial, pero el cliente busca otra opción",
        feedback: "Un precio alto sin propuesta de valor clara espanta clientes. El precio premium funciona solo si puedes justificarlo con resultados, experiencia o diferenciación real."
      }
    ],
    mejor: 2,
    concepto: "El precio correcto cubre costos directos + margen de utilidad + reserva de contingencia. Nunca cotices por debajo de tu costo."
  },
  {
    id: 3,
    mes: "Mes 2 — Cliente grande",
    situacion: "Un cliente importante quiere contratarte, pero pide crédito a 60 días. El contrato vale $120,000 MXN. Tus gastos fijos este mes son $55,000.",
    pregunta: "¿Aceptas el contrato en esas condiciones?",
    opciones: [
      {
        texto: "Sí, sin condiciones — es un cliente grande",
        efecto: -15,
        flujo: "Ingreso en día 60, gastos a pagar YA",
        feedback: "Esto se llama quiebra técnica: tienes utilidades en papel pero sin efectivo para pagar. Muchas empresas quiebran con clientes, no sin ellos."
      },
      {
        texto: "Sí, pero negociamos 50% anticipo + 50% a 30 días",
        efecto: +25,
        flujo: "$60,000 hoy + $60,000 en 30 días",
        feedback: "¡Perfecto! Tienes el cliente Y el flujo para operar. Negociar condiciones de pago es tan importante como conseguir el cliente."
      },
      {
        texto: "Solo si pagan a 30 días máximo",
        efecto: +15,
        flujo: "$120,000 en día 30 — manejable",
        feedback: "Buena decisión. 30 días es razonable y te permite planificar. Perder un cliente por condiciones de pago a veces es la decisión correcta."
      },
      {
        texto: "No acepto — no puedo financiar a nadie",
        efecto: +5,
        flujo: "Sin ingreso, sin riesgo de quiebra técnica",
        feedback: "Conservador pero correcto si no tienes reservas. El problema es que sin ingresos tampoco creces. Busca el punto medio: negocia antes de rechazar."
      }
    ],
    mejor: 1,
    concepto: "Quiebra técnica: tener utilidades en papel pero sin efectivo para pagar operaciones."
  },
  {
    id: 4,
    mes: "Mes 2 — Nómina",
    situacion: "Tienes 3 empleados. Este mes los ingresos llegaron tarde y tu cuenta tiene $28,000. La nómina es de $35,000 en 5 días.",
    pregunta: "¿Cómo cubres la nómina?",
    opciones: [
      {
        texto: "Línea de crédito revolvente del banco — $10,000",
        efecto: +20,
        flujo: "Nómina cubierta, interés ~1.5% mensual sobre el monto",
        feedback: "La mejor opción. Una línea de crédito existe exactamente para esto: cubrir brechas de flujo temporales sin comprometer la operación."
      },
      {
        texto: "Le pido prestado a un familiar sin interés",
        efecto: +15,
        flujo: "Sin costo financiero, pero compromete relaciones",
        feedback: "Funciona en emergencias, pero mezclar finanzas personales y empresariales es riesgoso. Úsalo solo como último recurso y documenta todo."
      },
      {
        texto: "Les pido a los empleados esperar una semana",
        efecto: -15,
        flujo: "Sin egreso hoy, pero daño al equipo y reputación",
        feedback: "Retrasar nómina destruye la confianza del equipo. Un empleado que no recibe su pago a tiempo busca otro trabajo. El costo es mayor que cualquier interés."
      },
      {
        texto: "Vendo equipo de la empresa para cubrir el pago",
        efecto: -10,
        flujo: "Nómina cubierta, pero pierdes capacidad operativa",
        feedback: "Vender activos para pagar operaciones es una señal de alarma grave. Es resolver lo urgente destruyendo lo importante."
      }
    ],
    mejor: 0,
    concepto: "Una línea de crédito revolvente es la herramienta correcta para brechas temporales de flujo."
  },
  {
    id: 5,
    mes: "Mes 3 — Inversión",
    situacion: "Van bien. Tienen $60,000 en caja y utilidad acumulada de $30,000. Necesitan equipo nuevo ($45,000) para atender más clientes.",
    pregunta: "¿Cómo adquieren el equipo?",
    opciones: [
      {
        texto: "Compramos de contado — usamos la caja",
        efecto: -5,
        flujo: "−$45,000, quedan $15,000 de reserva",
        feedback: "Tienes el equipo pero quedas muy expuesto. Con solo $15,000 de reserva, cualquier imprevisto puede paralizarte."
      },
      {
        texto: "Arrendamiento (leasing) — cuota mensual de $4,200",
        efecto: +20,
        flujo: "Caja intacta + equipo disponible + $4,200/mes de costo fijo",
        feedback: "¡Excelente! El leasing es una herramienta financiera que preserva tu flujo y te da acceso al equipo. El activo genera ingresos que pagan la cuota."
      },
      {
        texto: "Crédito bancario a 12 meses — cuota $4,100/mes",
        efecto: +15,
        flujo: "Caja intacta, equipo tuyo al final, intereses incluidos",
        feedback: "Buena opción. Pagas más en total, pero el equipo queda como activo propio. Útil si el equipo tiene valor de reventa."
      },
      {
        texto: "No compramos — esperamos ahorrar más",
        efecto: -10,
        flujo: "Caja intacta, pero perdemos clientes por capacidad limitada",
        feedback: "Esperar suena prudente, pero si ya tienes demanda, no atenderla tiene un costo de oportunidad real. A veces el riesgo de no invertir es mayor que el de invertir."
      }
    ],
    mejor: 1,
    concepto: "El arrendamiento y el crédito permiten crecer sin descapitalizarse — el activo paga su propio costo."
  },
  {
    id: 6,
    mes: "Mes 3 — Mes lento",
    situacion: "Es temporada baja. Los ingresos cayeron más del 50% respecto a un mes normal. Solo entraron $30,000 pero sus gastos fijos son $55,000. Tienen $40,000 en caja.",
    pregunta: "¿Cómo manejan el déficit de $25,000?",
    opciones: [
      {
        texto: "Usamos la caja completa y esperamos que mejore",
        efecto: -20,
        flujo: "Caja cae a $15,000 — zona de peligro",
        feedback: "Si el mes siguiente tampoco mejora, quiebras. Usar toda la caja sin plan es el error más común en empresas con temporadas bajas."
      },
      {
        texto: "Activamos campaña de descuentos para generar ingresos",
        efecto: +10,
        flujo: "Ingresos adicionales estimados $15,000 — déficit baja a $10,000",
        feedback: "Buena iniciativa. Generar ingresos en mes lento es mejor que solo recortar. Los descuentos estratégicos pueden activar clientes dormidos."
      },
      {
        texto: "Reducimos costos: pausamos suscripciones y freelancers",
        efecto: +15,
        flujo: "Ahorro de $15,000 — déficit baja a $10,000",
        feedback: "Correcto. Los costos variables son los primeros en recortar en meses difíciles. Antes de tocar la caja, reduce egresos."
      },
      {
        texto: "Combinamos: recortamos costos + activamos descuentos",
        efecto: +25,
        flujo: "Ahorro $15K + ingresos extra $15K — déficit casi eliminado",
        feedback: "¡La mejor decisión! Atacar el problema por los dos lados — menos egresos y más ingresos — es la respuesta profesional ante un mes lento."
      }
    ],
    mejor: 3,
    concepto: "En meses difíciles: reduce egresos variables Y activa ingresos. Nunca solo una de las dos."
  },
  {
    id: 7,
    mes: "Mes 4 — Oportunidad",
    situacion: "Un competidor en apuros ofrece venderles su cartera de 5 clientes por $80,000. Sus clientes generarían $25,000/mes adicionales. Tienen $90,000 en caja.",
    pregunta: "¿Compran la cartera de clientes?",
    opciones: [
      {
        texto: "Sí, pagamos los $80,000 de contado",
        efecto: +10,
        flujo: "Caja cae a $10,000 — muy riesgoso",
        feedback: "La oportunidad es real pero quedas sin reserva. Si los clientes no se quedan o hay algún imprevisto, estás en quiebra técnica."
      },
      {
        texto: "Negociamos: $40,000 hoy + $40,000 en 3 meses",
        efecto: +25,
        flujo: "Caja queda en $50,000, clientes generan $25K/mes",
        feedback: "¡Perfecto! Recuperas la inversión en menos de 2 meses y conservas reserva. Negociar el pago de activos es tan válido como negociar con proveedores."
      },
      {
        texto: "No compramos — demasiado riesgo",
        efecto: +5,
        flujo: "Caja intacta, pero perdemos oportunidad de crecimiento",
        feedback: "Conservador, pero a veces el mayor riesgo es no crecer. Una cartera de clientes con ingresos comprobables es un activo con retorno calculable."
      },
      {
        texto: "Buscamos socio que ponga el 50% del capital",
        efecto: +15,
        flujo: "Inversión compartida, clientes compartidos también",
        feedback: "Funciona, pero compartes utilidades futuras. Vale la pena evaluar si el costo del socio es menor que el costo del crédito."
      }
    ],
    mejor: 1,
    concepto: "Toda inversión tiene un período de recuperación. Calcúlalo antes de decidir."
  },
  {
    id: 8,
    mes: "Mes 4 — Impuestos",
    situacion: "Llegó el momento de declarar impuestos. Su contador les dice que deben $32,000 de ISR. No lo habían provisionado y solo tienen $45,000 en caja.",
    pregunta: "¿Cómo manejan el pago de impuestos?",
    opciones: [
      {
        texto: "Pagamos los $32,000 y seguimos operando con $13,000",
        efecto: -10,
        flujo: "Caja cae a $13,000 — operación en riesgo",
        feedback: "Cumplir es correcto, pero quedarte con tan poca reserva es peligroso. La lección real es que los impuestos deben provisionarse cada mes."
      },
      {
        texto: "Pedimos prórroga al SAT y pagamos en parcialidades",
        efecto: +15,
        flujo: "~$5,500/mes × 6 meses — caja intacta operativamente",
        feedback: "¡Buena decisión! El SAT permite convenios de pago. Usar este mecanismo es legal, inteligente y preserva tu flujo."
      },
      {
        texto: "No pagamos — esperamos que no nos auditen",
        efecto: -30,
        flujo: "Sin egreso hoy, multas y recargos futuros garantizados",
        feedback: "El peor error posible. Las multas del SAT pueden triplicar la deuda original. La evasión fiscal destruye empresas — siempre cumple, negocia si es necesario."
      },
      {
        texto: "Pagamos los $32,000 hoy + provisionamos 10% mensual para nunca repetir esto",
        efecto: +20,
        flujo: "Deuda fiscal liquidada + hábito financiero correcto desde hoy",
        feedback: "¡La mejor respuesta! Pagas lo que debes Y corriges el hábito que te metió en este problema. Apartar el 10% de los ingresos cada mes para impuestos es una práctica básica de finanzas sanas."
      }
    ],
    mejor: 3,
    concepto: "Provisionar impuestos mensualmente evita crisis de flujo al momento de declarar."
  },
  {
    id: 9,
    mes: "Mes 5 — Expansión",
    situacion: "Van muy bien. Quieren abrir una segunda ubicación. El costo de apertura es $150,000. Tienen $100,000 en caja y utilidad mensual de $30,000.",
    pregunta: "¿Cómo financian la expansión?",
    opciones: [
      {
        texto: "Usamos toda la caja + pedimos $50,000 prestado",
        efecto: -5,
        flujo: "Expansión hecha, pero sin reserva y con deuda",
        feedback: "Expansión agresiva con cero reserva es un riesgo alto. Si la segunda ubicación tarda en generar, la operación actual puede sufrir."
      },
      {
        texto: "Buscamos inversionista que aporte $150,000 a cambio de 30% de la empresa",
        efecto: +15,
        flujo: "Sin deuda, pero cedes participación permanente",
        feedback: "Válido. Un inversionista trae capital y a veces experiencia. El costo es la dilución. Evalúa si el 70% de algo grande vale más que el 100% de algo pequeño."
      },
      {
        texto: "Crédito bancario a 24 meses — cuota $7,500/mes",
        efecto: +20,
        flujo: "Caja intacta, expansión financiada, cuota manejable con utilidad de $30K",
        feedback: "¡Excelente! Con $30,000 de utilidad mensual, una cuota de $7,500 es perfectamente manejable. El crédito productivo es una herramienta de crecimiento."
      },
      {
        texto: "Esperamos 4 meses más para ahorrar el capital",
        efecto: +5,
        flujo: "Sin deuda, pero 4 meses de oportunidad perdida",
        feedback: "Prudente, pero si hay demanda ahora, esperar tiene un costo de oportunidad real. A veces el crédito productivo es más barato que esperar."
      }
    ],
    mejor: 2,
    concepto: "El crédito productivo financia crecimiento cuando el retorno supera el costo financiero."
  },
  {
    id: 10,
    mes: "Mes 5 — Cobranza",
    situacion: "Tienes 3 clientes con facturas vencidas por $75,000 en total. Llevan 45 días sin pagar. Tu flujo está presionado.",
    pregunta: "¿Cómo actúas con la cobranza vencida?",
    opciones: [
      {
        texto: "Les seguimos dando servicio — no queremos perderlos",
        efecto: -20,
        flujo: "Sigues generando costos sin recibir ingresos",
        feedback: "Dar servicio sin cobrar es financiar al cliente con tu propio dinero. Cada día que pasa sin cobrar, tu flujo empeora y el cliente pierde urgencia de pagar."
      },
      {
        texto: "Suspendemos el servicio hasta que paguen",
        efecto: +10,
        flujo: "Sin nuevos costos, presión sobre el cliente para pagar",
        feedback: "Correcto. Suspender el servicio es una herramienta legítima de cobranza. La mayoría paga cuando ve que hay consecuencias reales."
      },
      {
        texto: "Llamamos, enviamos estado de cuenta y fijamos fecha límite de pago",
        efecto: +20,
        flujo: "Proceso formal de cobranza — tasa de recuperación alta",
        feedback: "¡La mejor práctica! Un proceso de cobranza claro con comunicación profesional y fechas límite tiene la mayor tasa de éxito sin dañar la relación."
      },
      {
        texto: "Cedemos la deuda a una empresa de cobranza por el 60%",
        efecto: +5,
        flujo: "Recibes $45,000 inmediatos, pierdes $30,000",
        feedback: "Funciona para recuperar flujo rápido, pero pierdes el 40% de lo que te deben. Úsalo solo si la deuda lleva más de 90 días o el cliente está en quiebra."
      }
    ],
    mejor: 2,
    concepto: "Un proceso formal de cobranza preventivo es más efectivo que reaccionar cuando ya hay mora."
  },
  {
    id: 11,
    mes: "Mes 6 — Nómina e incentivos",
    situacion: "Tu equipo ha trabajado muy bien. Quieres incentivarlos pero el flujo es ajustado. La nómina base ($40,000) ya está cubierta. La utilidad neta disponible este mes es $25,000.",
    pregunta: "¿Cómo reconoces el desempeño de tu equipo?",
    opciones: [
      {
        texto: "Damos bono de $5,000 a cada uno de los 4 empleados",
        efecto: -15,
        flujo: "−$20,000 adicionales. Utilidad cae a $5,000 — sin colchón para ningún imprevisto",
        feedback: "El reconocimiento es importante, pero consumir casi toda la utilidad en bonos deja la empresa sin margen ante cualquier imprevisto. Si ese mes llega una factura inesperada, no podrás cubrirla."
      },
      {
        texto: "Prometemos bono el mes siguiente si el flujo lo permite",
        efecto: +10,
        flujo: "Sin egreso hoy, compromiso futuro condicionado",
        feedback: "Razonable, pero las promesas no cumplidas desmotivan más que no prometer. Solo comprométete si realmente puedes cumplir el siguiente mes."
      },
      {
        texto: "Implementamos esquema de comisiones sobre nuevos clientes",
        efecto: +20,
        flujo: "Sin costo fijo hoy, incentivo alineado al crecimiento",
        feedback: "¡Excelente! Las comisiones alinean el incentivo del empleado con el del negocio — solo se pagan cuando hay ingresos nuevos. Costo variable inteligente."
      },
      {
        texto: "No damos nada — necesitamos conservar el flujo",
        efecto: -5,
        flujo: "Flujo intacto, pero desmotivación del equipo",
        feedback: "Ignorar el desempeño tiene costos ocultos: rotación, baja productividad, pérdida de talento. Siempre hay formas creativas de reconocer sin gastar."
      }
    ],
    mejor: 2,
    concepto: "Los esquemas variables alinean incentivos con resultados sin comprometer el flujo fijo."
  },
  {
    id: 12,
    mes: "Mes 7 — Crisis externa",
    situacion: "Una crisis económica regional reduce la demanda 30%. Dos clientes cancelan. Ingresos bajan de $65,000 a $40,000. Costos fijos: $45,000.",
    pregunta: "¿Cuál es tu respuesta estratégica?",
    opciones: [
      {
        texto: "Bajamos precios agresivamente para retener clientes",
        efecto: -15,
        flujo: "Más clientes pero menos margen — puede empeorar el déficit",
        feedback: "Bajar precios en crisis comprime el margen cuando más lo necesitas. Si ya tienes déficit, trabajar más por menos no resuelve el problema."
      },
      {
        texto: "Diversificamos: ofrecemos servicios nuevos a clientes actuales",
        efecto: +20,
        flujo: "Ingresos adicionales sin costo de adquisición de nuevos clientes",
        feedback: "¡Estrategia inteligente! Vender más a quien ya confía en ti tiene el costo de adquisición más bajo. La diversificación de servicios es la respuesta correcta en crisis."
      },
      {
        texto: "Recortamos costos fijos: renunciamos a la oficina y trabajamos remoto",
        efecto: +15,
        flujo: "Ahorro de $10,000-$15,000 en renta mensual",
        feedback: "Buena decisión táctica. Reducir costos fijos es la primera palanca en crisis. El trabajo remoto puede ser permanentemente más eficiente."
      },
      {
        texto: "Pedimos crédito para sobrevivir los meses difíciles",
        efecto: -5,
        flujo: "Flujo temporal, pero aumenta carga financiera futura",
        feedback: "El crédito en crisis puede ser un salvavidas o un ancla. Solo funciona si tienes un plan claro de recuperación. Sin plan, solo pospones el problema."
      }
    ],
    mejor: 1,
    concepto: "En crisis, vender más a clientes existentes es más barato y rápido que buscar clientes nuevos."
  },
  {
    id: 13,
    mes: "Mes 8 — Decisión de socios",
    situacion: "Un socio quiere salirse y pide que le compren su 25% de participación valuada en $120,000. La empresa genera $30,000/mes de utilidad.",
    pregunta: "¿Cómo manejas la salida del socio?",
    opciones: [
      {
        texto: "Le pagamos los $120,000 de la caja de la empresa",
        efecto: -15,
        flujo: "Caja se vacía, operación en riesgo inmediato",
        feedback: "Usar el capital operativo para comprar participaciones pone en riesgo la empresa que estás comprando. Es como vaciar el tanque de gasolina para pagar el auto."
      },
      {
        texto: "Negociamos pago en 12 meses con cargo a utilidades",
        efecto: +20,
        flujo: "$10,000/mes por 12 meses — manejable con utilidad de $30K",
        feedback: "¡Perfecto! Pagas con las utilidades que el negocio genera. El socio sale, tú conservas el flujo operativo y la empresa sigue creciendo."
      },
      {
        texto: "Buscamos un nuevo socio que compre esa participación",
        efecto: +15,
        flujo: "Sin egreso de caja, nuevo socio entra con capital fresco",
        feedback: "Buena opción si encuentras al socio correcto rápido. El riesgo es el tiempo que tarda y que el nuevo socio no aporte el mismo valor."
      },
      {
        texto: "Le ofrecemos $80,000 argumentando que la valuación es alta",
        efecto: +5,
        flujo: "Ahorro de $40,000 si acepta, conflicto si no acepta",
        feedback: "Negociar el precio es válido si tienes argumentos sólidos. Pero subestimar la participación de un socio sin base puede generar conflictos legales costosos."
      }
    ],
    mejor: 1,
    concepto: "Las transacciones entre socios deben estructurarse para no afectar el flujo operativo de la empresa."
  },
  {
    id: 14,
    mes: "Mes 9 — Crecimiento",
    situacion: "Están en su mejor momento. Utilidad mensual: $45,000. Un banco les ofrece crédito de $500,000 al 14% anual para escalar masivamente.",
    pregunta: "¿Toman el crédito de $500,000?",
    opciones: [
      {
        texto: "Sí, tomamos todo — es el momento de crecer fuerte",
        efecto: -10,
        flujo: "Cuota mensual ~$48,000 — casi consume toda la utilidad",
        feedback: "Con una cuota de $48,000 y utilidad de $45,000, estás en déficit desde el día 1. El crédito grande solo funciona si genera ingresos adicionales que lo paguen."
      },
      {
        texto: "Tomamos $200,000 a 12 meses — cuota manejable de ~$19,000/mes",
        efecto: +25,
        flujo: "Utilidad neta de $26,000/mes después de pagar la cuota",
        feedback: "¡Excelente decisión! Apalancamiento inteligente: tomas solo lo que puedes pagar cómodamente y conservas margen de maniobra. A 12 meses con 14% anual la cuota es ~$19,000 — menos del 42% de tu utilidad. El crédito correcto es el que puedes pagar aunque los ingresos bajen un 20%."
      },
      {
        texto: "No tomamos nada — preferimos crecer con utilidades propias",
        efecto: +10,
        flujo: "Sin deuda, crecimiento más lento pero sin riesgo",
        feedback: "Conservador pero válido. El autofinanciamiento es sostenible. El costo es la velocidad: tu competencia podría crecer más rápido con apalancamiento."
      },
      {
        texto: "Tomamos $500,000 pero solo usamos $200,000 como reserva",
        efecto: -15,
        flujo: "Pagas intereses sobre $500K usando solo $200K — costo sin beneficio",
        feedback: "Pagar intereses sobre dinero que no estás usando es desperdiciar recursos. Si solo necesitas $200K, pide $200K."
      }
    ],
    mejor: 1,
    concepto: "El monto correcto de crédito es el que puedes pagar incluso si los ingresos bajan un 20%."
  },
  {
    id: 15,
    mes: "Mes 10 — Decisión final",
    situacion: "Han llegado al final del simulador. Su empresa vale $2,000,000 MXN. Reciben oferta de compra por $1,800,000. Sus utilidades anuales proyectadas son $540,000.",
    pregunta: "¿Venden la empresa?",
    opciones: [
      {
        texto: "Sí, vendemos — $1,800,000 en efectivo ya",
        efecto: +10,
        flujo: "$1.8M inmediatos, empresa deja de ser tuya",
        feedback: "La oferta es de $1.8M cuando la empresa vale $2M y genera $540K/año. Estás vendiendo a menos del valor y renunciando a 3+ años de utilidades. Solo tiene sentido si necesitas liquidez urgente."
      },
      {
        texto: "No vendemos — seguimos creciendo",
        efecto: +20,
        flujo: "$540,000/año proyectados — recuperas el valor en 4 años",
        feedback: "Con utilidades de $540K/año, en menos de 4 años habrás generado más que la oferta de compra. Si crees en el negocio, retener es la decisión correcta."
      },
      {
        texto: "Negociamos — aceptamos solo si pagan $2,500,000",
        efecto: +15,
        flujo: "Prima del 25% sobre valuación si aceptan",
        feedback: "Negociar hacia arriba es correcto. Un comprador que quiere tu empresa sabe que vale más que la oferta inicial. El 'no' bien argumentado suele subir el precio."
      },
      {
        texto: "Vendemos el 49% y conservamos el control",
        efecto: +25,
        flujo: "~$900,000 en efectivo + sigues operando + nuevo socio capitalista",
        feedback: "¡La mejor decisión estratégica! Liquidez parcial + conservas el negocio + capital fresco para crecer. Vender participación minoritaria a valuación justa es el esquema preferido por los mejores empresarios."
      }
    ],
    mejor: 3,
    concepto: "Vender participación minoritaria permite monetizar sin perder el control ni el flujo futuro."
  }
]
