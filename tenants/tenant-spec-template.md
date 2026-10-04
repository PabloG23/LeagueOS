# 📑 Functional Specification Document (FSD): Onboarding & Configuración de Liga

| Metadatos del Documento | Detalle |
| :--- | :--- |
| **Cliente / Nombre de Liga:** | `[Nombre Oficial de la Liga Deportiva]` |
| **Versión del Documento:** | `1.0.0` |
| **Fecha de Solicitud:** | `YYYY-MM-DD` |
| **Responsable / Autor:** | `[Nombre del Representante o Account Manager]` |
| **Estado:** | `[Borrador | En Revisión | Aprobado para Implementación]` |

---

## 1. Resumen Ejecutivo y Alcance
Este documento define los requisitos funcionales, operacionales, de identidad y deportivos para el aprovisionamiento de un nuevo tenant en **LeagueOS**. Sirve como contrato de negocio de alto nivel para ser analizado técnicamente y traducido a un **Technical Specification (Plan de Implementación)**.

---

## 2. Identidad del Tenant y Dominio
- **Nombre Oficial:** [Ej. Liga Premier de Futbol Metepec]
- **Subdomain / Slug Identificador:** `[ej. ligapremier]` *(Ruta: `leagueos.app/ligapremier`)*
- **Dominio Personalizado (Opcional):** `[ej. ligapremiermetepec.com]`
- **Deporte:** `SOCCER` *(Soporte arquitectónico para BASKETBALL, FOOTBALL_7, etc.)*
- **Slogan / Lema Institucional:** "[Ej. Pasión, disciplina y juego limpio]"

---

## 3. Administrador Maestro de la Liga
- **Nombre y Apellidos:** [Ej. Carlos Mendoza Silva]
- **Usuario de Acceso:** `[ej. admin_premier]`
- **Correo Electrónico:** `[ej. presidente@ligapremiermetepec.com]`
- **Contraseña Provisoria Inicial:** `[ej. Premier2026!]` *(Se almacena con BCrypt)*

---

## 4. Branding, Identidad Visual y Contacto
- **Paleta de Colores Institucionales:**
  - Color Primario (Acento / Botones): `[Ej. #047857]`
  - Color Secundario / Backgrounds: `[Ej. #061a14]`
  - Tema Base Frontend: `[theme-san-lucas | theme-nuestro-deporte | custom]`
- **Logotipo Oficial:** `[Ruta / URL en Cloudflare R2]`
- **Sede / Dirección Canchas:** [Ej. Av. Estado de México #120, Metepec]
- **Teléfono / WhatsApp de Atención:** [Ej. 722 123 4567]
- **Redes Sociales Oficiales:**
  - Facebook: `[URL]`
  - Instagram: `[URL]`
  - Canal de Avisos / Web: `[Opcional]`

---

## 5. Requisitos de Inscripción de Jugadores e Identidad

### 5.1 Documentación y Validación de Identidad (INE)
- **¿Es obligatorio adjuntar foto/archivo de INE?:** `[Sí / No]`
- **Datos obligatorios a capturar / extraer del INE:**
  - [x] Nombre(s) y Apellidos
  - [x] CURP *(Identificador único nacional para prevenir duplicados en la liga)*
  - [x] Fecha de Nacimiento y Edad
  - [ ] Clave de Elector
  - [ ] Año de Emisión / Vigencia del INE
  - [ ] Fotografía Frontal del INE
  - [ ] Fotografía Reverso del INE
  - [x] Fotografía Infantil de Rostro *(Para credencial oficial de juego)*

### 5.2 Política para Jugadores Extranjeros
- **¿Se permite la participación de jugadores extranjeros?:** `[Sí / No]`
- **Documentación de identidad permitida para extranjeros:**
  - [ ] Pasaporte Vigente
  - [ ] Forma Migratoria (Residencia Temporal / Permanente / FM2 / FM3)
- **Límites de Extranjeros:**
  - Máximo de extranjeros inscritos en cédula/plantilla por equipo: `[Ej. Sin límite | Máximo 3]`
  - Máximo de extranjeros en cancha simultáneamente: `[Ej. Sin límite | Máximo 2]`

---

## 6. Reglas de Edad, Categorías y Elegibilidad

### 6.1 Restricción por Edad
- **Tipo de Categoría:** `[Categoría Libre | Veteranos / Master (+35, +40) | Juvenil / Infantil (Sub-17, Sub-20)]`
- **Edad Mínima Permitida:** `[Ej. 35 años cumplidos | No aplica]`
- **Edad Máxima Permitida:** `[Ej. 20 años | No aplica]`
- **Fecha de Corte para Cálculo de Edad:** `[Al momento de inscripción | Al día de inicio oficial del torneo]`

### 6.2 Regla de Excepciones / Refuerzos
- **¿Se permiten jugadores fuera del rango de edad (Refuerzos)?:** `[Sí / No]`
- **Detalle de la excepción:** `[Ej. Máximo 2 jugadores de 33 o 34 años por equipo en categoría +35]`

---

## 7. Formato de Competición del Torneo (Sistema de Juego)
*Describe a detalle cómo se juega el torneo desde la Jornada 1 hasta la Final.*

### 7.1 Estructura General
- **Nombre de la Temporada / Torneo:** [Ej. Torneo Apertura 2026]
- **Categorías o Divisiones Simultáneas:** [Ej. Primera Fuerza, Segunda Fuerza]
- **Número Estimado de Equipos por Categoría:** [Ej. 16 equipos]

### 7.2 Fase Regular (Clasificación)
- **Sistema de Fase Regular:**
  - [ ] **Grupo Único (Todos contra Todos - Round Robin):**
    - Vueltas: `[1 Vuelta (Solo ida) | 2 Vueltas (Ida y vuelta)]`
  - [ ] **Fase de Grupos:**
    - Número de grupos: `[Ej. 2 grupos de 8 equipos]`
    - Clasifican a fase final: `[Ej. Los 4 primeros lugares de cada grupo]`
    - ¿Hay partidos inter-grupos?: `[Sí / No]`
- **Sistema de Puntuación:**
  - Puntos por Victoria: `[3 puntos | 2 puntos]`
  - Puntos por Empate: `1 punto` *(¿Hay serie de penales por punto extra? `[Sí / No]`)*
  - Puntos por Derrota: `0 puntos`
- **Criterios de Desempate en Tabla General (en orden de prioridad):**
  1. `[Diferencia de Goles (DG)]`
  2. `[Mayor cantidad de Goles a Favor (GF)]`
  3. `[Resultado particular entre los equipos empatados (Duelo Directo)]`
  4. `[Fair Play (Menor puntaje por tarjetas amarillas/rojas)]`
  5. `[Sorteo]`

### 7.3 Fase Final (Liguilla / Playoff)
- **Equipos que clasifican a Liguilla:** `[Ej. Los 8 mejores de la tabla general]`
- **Rondas de Liguilla:**
  - [ ] Repechaje / Play-In *(Ej. Posiciones 7 al 10)*
  - [x] Cuartos de Final
  - [x] Semifinal
  - [x] Gran Final
- **Formato de los Partidos de Liguilla:**
  - Cuartos y Semifinales: `[Partido Único | Ida y Vuelta]`
  - Gran Final: `[Partido Único en Cancha Neutral | Ida y Vuelta]`
- **Criterio de Desempate en Marcador Global de Liguilla:**
  - En Cuartos / Semifinal: `[Mejor posición en la tabla general | Penales directos | Tiempos extra]`
  - En la Gran Final: `[Tiempos extra (2 tiempos de 15 min) y Penales | Penales directos]`
- **Torneo de Consolación / Liguilla de Plata (Opcional):**
  - ¿Los equipos no clasificados juegan torneo de consolación?: `[Sí / No]`
  - Detalle: `[Ej. Los lugares 9 al 16 juegan Liguilla de Plata por trofeo de consolación]`

### 7.4 Control de Liguilla y Disciplina
- **Mínimo de partidos jugados para derecho a Liguilla:** `[Ej. 5 partidos en fase regular]`
- **Límite de jugadores en cédula por equipo:** `[Ej. 30 jugadores]`
- **Exigir número de dorsal único en plantilla:** `[Sí / No]`
- **Suspensiones automáticas por tarjetas:**
  - Suspensión por acumulación de amarillas: `[Ej. 3 amarillas = 1 partido de suspensión | No]`
  - Suspensión por tarjeta roja directa: `[Ej. 1 partido automático sujeto a reporte arbitral]`

---

## 8. Mesa Directiva y Estructura Organizacional (Opcional)
| Puesto | Nombre Completo | Teléfono / Correo |
| :--- | :--- | :--- |
| Presidente | [Nombre] | [Contacto] |
| Secretario General | [Nombre] | [Contacto] |
| Tesorero | [Nombre] | [Contacto] |
| Comisión Disciplinaria / Arbitraje | [Nombre] | [Contacto] |

---

## 9. Patrocinadores Oficiales (Opcional)
| Empresa / Marca | Giro Comercial | Nivel (Master / Oficial / Aliado) | URL / Logo |
| :--- | :--- | :--- | :--- |
| [Marca 1] | [Deportes / Salud / Alimentos] | Oficial | `/partners/logo1.png` |
| [Marca 2] | [Bebidas / Comercial] | Master | `/partners/logo2.png` |

---

## 10. Canchas e Instalaciones Deportivas Disponibles
| Nombre del Campo | Tipo de Superficie | Ubicación / Notas |
| :--- | :--- | :--- |
| Campo 1 Principal | Pasto Sintético | Con alumbrado nocturno |
| Campo 2 | Pasto Natural | Sede partidos matutinos |
