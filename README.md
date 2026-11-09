# EXPEDIENTE oriC — detectives multijugador (Vercel, 10 minutos)

**Proyecto editable**, en español, listo para publicar en Vercel cuando conectes **Upstash Redis** como almacenamiento compartido. No está ya publicado: tú controlarás el dominio, el código de sala y los participantes.

## Qué contiene

- 5 escenas de investigación: estructura del ADN, horquilla bacteriana, horquilla humana, antibiótico y veredicto molecular.
- Banco de 20 preguntas de cuatro formatos: V/F, respuesta única, múltiples correctas y relacionar columnas.
- **Modo exposición: 10 preguntas** (2 por escena); 35 segundos para contestar y 15 segundos para explicar cada una = **8 min 20 s de juego**.
- **1 minuto** para presentar el caso y mostrar el enlace/código; **40 segundos** para dar el veredicto. **Total: 10 minutos.**
- Modo práctica: 20 preguntas a un ritmo más pausado (45 + 18 segundos por pregunta).
- Participación individual por teléfono mediante un enlace y un código de sala. Pantalla de moderador para proyectar, revelar pistas y mostrar clasificación.
- Avance automático por cronómetro (se mantiene el botón para continuar antes si lo necesitas).
- Datos de partida en Redis con caducidad aproximada de 6 horas. Únicamente alias, respuestas y puntos; no recopila datos médicos de los alumnos.

## PUBLICAR EN VERCEL (paso a paso)

**Requisitos:** una cuenta en GitHub, una cuenta en Vercel y acceso a Upstash Redis mediante el Marketplace de Vercel. Verifica las condiciones del plan gratuito vigente en tu cuenta.

1. **Descomprime** `Expediente_oriC_Vercel_10min.zip` y asegúrate de mantener los archivos en la **raíz** del repositorio (`index.html`, `app.js`, `style.css`, `api/game.mjs`, etc.).
2. En <https://github.com/new> crea un repositorio (puede ser privado), por ejemplo `expediente-oric`. Sube **todo el contenido de la carpeta descomprimida**, no el archivo ZIP como único elemento.
3. Abre <https://vercel.com/new> → **Import Git Repository** → elige tu repositorio. Selecciona **Framework Preset: Other** si se solicita. Mantén el directorio raíz del proyecto y deja vacío el directorio de salida. Pulsa **Deploy**.
4. **Necesitas almacenamiento compartido:** desde el panel del proyecto en Vercel abre **Storage / Marketplace** y busca **Upstash Redis**. Crea o vincula una base Redis con el proyecto. Sigue las pantallas de instalación y selección de plan.
5. Comprueba en **Project → Settings → Environment Variables** que estén presentes `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`. Si los creas manualmente, cópialos de Upstash Console y márcalos como secretos del proyecto. **Nunca** los pongas en `index.html` ni `app.js` ni en el repositorio público.
6. Si la integración agregó variables **después del primer despliegue**, pulsa **Redeploy** desde **Deployments** para que la función acceda a ellas.
7. Entra en la URL publicada `https://TU-PROYECTO.vercel.app` → **Crear sala**. Desde otro teléfono abre la misma URL o el enlace compartido y entra con el código de seis caracteres y un alias.
8. Espera a que se unan los compañeros **antes** de iniciar. Elige **Exposición: 10 preguntas** y pulsa **Abrir primera pista** al minuto 1:00 de la actividad.
9. Proyecta la pantalla de anfitrión, y deja que los participantes respondan en sus móviles. El juego avanza al acabar los 35 s para responder y los 15 s de análisis, incluso si no pulsas «Siguiente».
10. Da el veredicto final en los **40 segundos restantes** y muestra la clasificación.

**Importante:** sin Upstash Redis, la pantalla puede cargar, pero Vercel **no podrá crear salas**. Esto es normal: las funciones serverless no pueden conservar las partidas de varios teléfonos en una variable local. La sincronización se hace mediante consultas periódicas (aprox. cada 2,4 s), no WebSockets; no prometemos respuesta absolutamente instantánea.

### Guion de los 10 minutos

| Minuto | Acciones | Evidencia del aprendizaje |
|---|---|---|
| 0:00–1:00 | «Ha desaparecido una prueba del laboratorio. Solo las diferencias de la replicación nos permitirán resolver el expediente.» El público abre el enlace y entra como detective. | Contextualización del caso de E. coli. |
| 1:00–2:40 | Escena 1: estructura, semiconservación y oriC (2 preguntas). | Identifica ADN y origen bacteriano. |
| 2:40–4:20 | Escena 2: horquilla bacteriana (2 preguntas). | DnaB, DnaG, Pol III, SSB y girasa. |
| 4:20–6:00 | Escena 3: horquilla eucariota (2 preguntas). | CMG, RPA, Pol α/δ/ε y comparación. |
| 6:00–7:40 | Escena 4: antibiótico y diana molecular (2 preguntas). | Diferencia la girasa de la polimerasa III. |
| 7:40–9:20 | Escena 5: selectividad y reconstrucción (2 preguntas). | Integra mecanismo y aplicación clínica. |
| 9:20–10:00 | Veredicto y clasificación. | El ciprofloxacino afecta preferentemente girasa y topoisomerasa IV bacterianas; no implica inocuidad total. |

Las cinco escenas transcurren en bloques de 1 min 40 s (2 × 50 s). La pantalla de respuesta es de 35 s y la explicación permanece 15 s.

## PROBAR SIN PUBLICAR (solo para ensayar)

1. Instala Node.js 20 o superior: <https://nodejs.org/>.
2. Abre una terminal dentro de la carpeta.
3. Ejecuta `npm run dev`.
4. Abre `http://localhost:3000` en el navegador de la computadora. Prueba con una segunda pestaña privada para representar a un detective.
5. Para correr las pruebas automatizadas, ejecuta `npm test`.

El modo local usa memoria **únicamente para el ensayo**; Vercel no utiliza esa modalidad.

## Personalización del código

- **Cambiar preguntas, respuestas y explicaciones:** edita `questions.js`. Las preguntas deben conservar sus tipos (`tf`, `one`, `many`, `match`) y el orden por escenas si quieres el recorrido completo.
- **Cambiar los 10 reactivos seleccionados:** edita la constante `SHORT` de `lib/game-handler.cjs`, con los índices de preguntas comenzando en 0. Mantén dos por escena si quieres el calendario exacto.
- **Cambiar tiempos:** edita `startQuestion` (`35000` milisegundos) y `doReveal` (`15000` milisegundos). Si los cambias, recalcula la duración total.
- **Cambiar aspecto y textos:** modifica `style.css`, `app.js` e `index.html`.
- **Datos de configuración Redis:** solo se leen en `store.js`, en el servidor.
- **Claves docentes:** abre `Guia_docente_20_preguntas_TNR12.docx`.

## Nota científica

Se trata de un caso clínico **simulado** de pielonefritis por *E. coli*. El ciprofloxacino no inhibe directamente ADN polimerasa III: sus dianas principales son **ADN girasa y topoisomerasa IV**. La comparación de horquillas muestra principios compartidos (semiconservación, dirección de síntesis 5′→3′, líder/rezagada) y diferencias de enzimas. Revisar las referencias científicas adjuntas al preparar la exposición.

## Recomendaciones para el aula

- Pide a los compañeros que abran la URL y escriban su alias **antes** de iniciar el cronómetro. Si el acceso demora, coloca el enlace o un código QR durante tu diapositiva de instrucciones.
- Ensaya en dos o más teléfonos en la red donde expondrás. Usa el internet móvil como alternativa si falla el Wi-Fi universitario.
- No uses nombres o información identificable de pacientes; la historia es simulada.
- Vercel y Upstash pueden tener cuotas o costes en función del plan y del número de conexiones. Comprobar antes de exponer.
- Si el servicio externo falla el día de la exposición, muestra el banco de preguntas desde el documento Word y haz las respuestas levantando la mano: sigue cubriendo la actividad de 10 minutos.

**Documentación:** [Vercel Functions](https://vercel.com/docs/functions), [Vercel + Redis](https://vercel.com/docs/redis), [Upstash en Vercel](https://upstash.com/docs/redis/howto/vercelintegration).
