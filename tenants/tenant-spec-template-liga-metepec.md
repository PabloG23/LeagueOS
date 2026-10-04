# 📑 Functional Specification Document (FSD): Onboarding & Configuración de Liga

| Metadatos del Documento | Detalle |
| :--- | :--- |
| **Cliente / Nombre de Liga:** | LIGA MUNICIPAL DE FUTBOL DE METEPEC A.C. |
| **Versión del Documento:** | `1.0.0` |
| **Fecha de Solicitud:** | `YYYY-MM-DD` |
| **Responsable / Autor:** | `[Nombre del Representante o Account Manager]` |
| **Estado:** | `[Borrador | En Revisión | Aprobado para Implementación]` |

---

## 1. Resumen Ejecutivo y Alcance
Este documento define los requisitos funcionales, operacionales, de identidad y deportivos para el aprovisionamiento de un nuevo tenant en **LeagueOS**. Sirve como contrato de negocio de alto nivel para ser analizado técnicamente y traducido a un **Technical Specification (Plan de Implementación)**.

---

## 2. Identidad del Tenant y Dominio
- **Nombre Oficial:** LIGA MUNICIPAL DE FUTBOL DE METEPEC A.C.
- **Subdomain / Slug Identificador:** `[ej. ligametepec]` *(Ruta: `leagueos.app/ligametepec`)*
- **Dominio Personalizado (Opcional):** NO PARA ESTE CLIENTE
- **Deporte:** `SOCCER` *(Soporte arquitectónico para BASKETBALL, FOOTBALL_7, etc.)*
- **Slogan / Lema Institucional:** CREA UNO QUE NO SE REPITA CON LOS OTROS CLIENTES

---

## 3. Administrador Maestro de la Liga
- **Nombre y Apellidos:** Luis Rendon
- **Usuario de Acceso:** admin_metepec
- **Correo Electrónico:** NO HAY CORREO
- **Contraseña Provisoria Inicial:** luisMetepec2026

---

## 4. Branding, Identidad Visual y Contacto
- **Paleta de Colores Institucionales:** EL CLIENTE TIENE COMO COLORES INSTITUCIONAES  EL VERDE PISTACHE, NEGRO Y BLANCO, ACTUA COMO UX/UI Y PROPON UN LOOK AND FIELD QUE SEA AGRADABLE A LA VISTA CON ESOS COLORES, SIGUE EL PATRON QUE YA EXISTE EN EL FRONT END FSD, CREA UN TEMA PARA ESTE CLIENTE,
- **Logotipo Oficial:** la imagen ya la puse en una ruta del FE se llama ligaMunicipalMetepec.jpeg
- **Sede / Dirección Canchas:** Las oficinas de la liag estan en Calle Josefa Ortiz de Domínguez 501, Coaxustenco, 52140 Metepec, Méx.
- **Teléfono / WhatsApp de Atención:** +52 722 960 9949
- **Redes Sociales Oficiales:**
  - Facebook: `https://www.facebook.com/share/1FenUj4krW/?mibextid=wwXIfr

---

## 5. Requisitos de Inscripción de Jugadores e Identidad

### 5.1 Documentación y Validación de Identidad (INE)
**Límite Máximo de Jugadores por Equipo** NO HAY, AL PRINCIPIO SOLO DEJAN METER 20 JUGADORES YA A PARTIR DE ESE NUMERO LOS COBRAN HAY QUE TENER CONTROL DE ESO, TAL VEZ HACER UN BLOQUEO AL ADMINISTRADOR DE EQUIPO QUE NO PUEDE METER MAS DE VEINTE Y CUANDO QUIERA METER MAS DE VEINTE MANDARLE UN MENSAJE  EN PANTALLA AVISANDO QUE CONTACTE AL ADMINISTRADOR DE LIGA.
- **¿Es obligatorio adjuntar foto/archivo de INE?:** `[Sí / No]`
- **Datos obligatorios a capturar / extraer del INE:**
  - [x] Nombre(s) y Apellidos
  - [ ] CURP *(Identificador único nacional para prevenir duplicados en la liga)*
  - [ ] Fecha de Nacimiento y Edad
  - [ ] Clave de Elector
  - [x] Año de Emisión / Vigencia del INE -> *(Rechazar identificaciones vencidas)*
  - [ ] Fotografía Frontal del INE
  - [ ] Fotografía Reverso del INE
  - [x] Fotografía Infantil de Rostro *(Para credencial oficial de juego)*

### 5.2 Política para Jugadores Extranjeros
- **¿Se permite la participación de jugadores extranjeros?:** SI
- **Documentación de identidad permitida para extranjeros:** SOLO SERA LA FOTOGRAFIA QUE SE SUBA DEL ROSTRO, BASATE EN LO DE LIGA NUESTRO DEPORTE, EL REGISTRO PARA JUGADORES MEXICANO TAMBIEN SERA EL MISMO CON INES COMO EN LIGA DE NUESTRO DEPORTE
- **Límites de Extranjeros:** NO HAY LIMITE DE EXTRANJEROS EN PLANTILLA NI EN CANCHA NI TAMPOC MEXICANOS

---

## 6. Reglas de Edad, Categorías y Elegibilidad

### 6.1 Restricción por Edad: NO HAY RESTRICCIONES

---

## 7. Formato de Competición del Torneo (Sistema de Juego)
SE MANEJAN DOS FASES EN ESTE TENANT O CLIENTE:

FASE 1: TODOS VS TODOS A UN PARTIDO

FASE 2:
DE LA TABLA GENERAL QUE SE GENERA DE LA FASE UNO SE PARTE LA TABLA POR EJEMPLO SI SON VEINTE EQUIPOS DEL UNO AL DIEZ JUEGAN POR EL CAMPEONATO A PUNTOS Y EL CAMPEON ES EL PRIMER LUGAR ES DECIR QUE EL QUE QUEDE EN PRIMER LUGAR GANA EL TORNEO Y NO HAY LIGUILLA  Y DEL 11 AL 20 JUEGAN A PUNTOS PARA NO DESCENDER DESCIENDEN LOS TRES ULTIMOS (OJO SOLO DESCIENDEN TRES EQUIPOS NO SE SI EN UN FUTURO SE REQUIERA QUE DESCIENDAN MAS O SUBAN MAS HAY QUE TENERLO EN CUENTA PARA LA ARQUITECTURA DEL SISTEMA) ES ROUND ROBIN EN LAS DOS FASES


PRIMER CRITERO DE DESEMPATE PARA LA TABLA GENERAL ES PRIMERO DIFERENCIA DE GOLES (DG), DESPUES GOLES A FAVOR (GF) , DESPEUS GOLES EN CONTRA (GC), DESPUES FAIR PLAY Y ES QUIEN TENGA MENOS TARJETAS EN TOTAL.

EL CLIENTE TAMBIEN TIENE UN TORNEO COPA Y ES ELIMINACION DIRECTA QUE PODRIA COMENZAR DESDE YA SEA 32 AVOS, 16 AVOS SEGUN LA CANTIDAD DE EQUIPOS EN EL TORNEO. ME PARECE ESO AY ESTA CONFIGURADO EN EL SISTEMA, VERIFICALO

### 7.1 Estructura General
- **Nombre de la Temporada / Torneo:** AUN NO DEFINIDA, ESO SE DEFINIRIA CUANDO ESTE YA EN PRODUCCION EL SISTEMA
- **Categorías o Divisiones Simultáneas:** PRIMERA, SEGUNDA Y TERCERA FUERZA
- **Número Estimado de Equipos por Categoría:** NO HAY LIMITE

### 7.2 Fase Regular (Clasificación)
- **Sistema de Fase Regular:**YA DEFINIDO PREVIAMENTE
- **Sistema de Puntuación:**
  - Puntos por Victoria: `[3 puntos]`
  - Puntos por Empate: `1 punto` *(¿Hay serie de penales por punto extra? `[NO]`)*
  - Puntos por Derrota: `0 puntos`
- **Criterios de Desempate en Tabla General (en orden de prioridad):**
RIMER CRITERO DE DESEMPATE PARA LA TABLA GENERAL ES PRIMERO DIFERENCIA DE GOLES (DG), DESPUES GOLES A FAVOR (GF) , DESPEUS GOLES EN CONTRA (GC), DESPUES FAIR PLAY Y ES QUIEN TENGA MENOS TARJETAS EN TOTAL.

### 7.3 Fase Final (Liguilla / Playoff) YA DEFINIDO PREVIAMENTE

- **Criterio de Desempate en Marcador Global de Liguilla:**
  - Para el torneo de copa que si es eliminacion directa son penales en caso de empate

### 7.4 Control de Liguilla y Disciplina
- **Mínimo de partidos jugados para derecho a Liguilla:** No hay minimo de partidos para jugar liguilla para este cliente
- **Límite de jugadores en cédula por equipo:** No hay limite
- **Exigir número de dorsal único en plantilla:** SIN NUMERO DE CAMISETA EN EL SISTEMA Y POR CONSIGUIENTE TAMPOCO EN LA CREDENCIAL
- **Suspensiones automáticas por tarjetas:**
  -  Si, el sistema bloquea automáticamente tras acumulación de tarjetas. Y NO APARECERA EL NOMBRE DEL JUGADOR EN LA CEDULA SI ESTA CUMPLIENDO SUSPENSION, 
  - PARA ESTE CLIENTE POR CADA CINCO TARJETAS SE VA UN JUGADOR UN PARTIDO DE SUSPENSION Y CUANDO ACUMULAN 12 PARTIDOS DE SUSPENSION POR CUALQUIER RAZON TAMBIEN SE VAN SUSPENDIDOS, MOSTRAR JUGADORES QUE ESTAN CUMPLIENDO SUSPENSION AL ADMINISTRADOR
  - VERIFICA SI ESO YA ESTA IMPLEMENTADO EN EL SISTEMA ME PARECE QUE SI,

---

## 8. Mesa Directiva y Estructura Organizacional (Opcional) AUN NO ME PASAN ESA LISTA PERO AGREGA DATOS DUMMY, SON DIEZ PERSONAS AGREGA DIEZ DUMMY
| Puesto | Nombre Completo | Teléfono / Correo |
| :--- | :--- | :--- |
| Presidente | [Nombre] | [Contacto] |
| Secretario General | [Nombre] | [Contacto] |
| Tesorero | [Nombre] | [Contacto] |
| Comisión Disciplinaria / Arbitraje | [Nombre] | [Contacto] |

---

## 9. Patrocinadores Oficiales (Opcional): NO HAY

---

## 10. Canchas e Instalaciones Deportivas Disponibles: POR EL MOMENTO NO HAY ESO SE HARA YA EN PRODUCCION 


COMENTARIOS ADICIONALES: PARA EL FE SIGUE LOS PATRONES QUE YA EXISTEN ASEGURATE QUE EL HECHO DE METER UN CLIENTE NUEVO NO SE ROMMPA NADA DE LO QUE YA EXISTE PARA LOS OTROS CLIENTES , TAMBIEN PARA EL FE, SIGUE LOS PATRONES DE DISEÑO Y DESARROLLO QUE YA EXISTEN, NO HARDCODEES NUMEROS DE TENANT PARA VERIFICARLO ANALIZA ESTE FUNCTIONAL SPEC Y ANTES DE HACER EL TECH SPEC DAME UN ANALSIS D EESTO PAAR VER SI LO ENTENDISTE BIEN, VEO QUE LOS ID DE TENANT EXISTENTES SON DEL ESTILO 111-111 Y 2222-222 CREA ID PROFESIONAL PARA ESTE CLIENTE
