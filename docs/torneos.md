# Torneos

Crea y administra los torneos de tu liga deportiva. Cada torneo puede tener una o varias categorías (divisiones) y define el calendario de la competición.

**Ruta:** Panel de Control → menú lateral → **Torneos**

---

## Pantalla de Torneos

Al entrar verás la sección **"Torneos y Temporadas"** con la lista de todos los torneos registrados. Cada tarjeta muestra:

* Nombre del torneo
* Fechas de inicio y término
* Categorías activas (si aplica: 1ra Fuerza, 2da Fuerza, 3ra Fuerza)
* Estado actual del torneo

### Estados de un torneo

| Estado | Descripción |
|---|---|
| **EN BORRADOR** | Recién creado, aún no ha iniciado. Se puede eliminar. |
| **REGISTROS CERRADOS** | Ya no se aceptan nuevos equipos. |
| **EN CURSO** | La competición está activa. |
| **CONCLUIDO** | El torneo ha finalizado. |

---

## Crear un nuevo torneo

1. Haz clic en **Nuevo Torneo** (botón azul, esquina superior derecha)
   * Si es tu primer torneo, aparecerá el botón **Crear Primer Torneo** en el centro de la pantalla
2. Completa el formulario:
   * **Nombre del Torneo** *(obligatorio)* — Ej: `Torneo Apertura 2026` o `Liga Dominical`
   * **Categorías / Divisiones** *(opcional)* — Selecciona una o varias: **1ra Fuerza**, **2da Fuerza**, **3ra Fuerza**
     * Si no seleccionas ninguna, se creará automáticamente una única categoría llamada **"Única"**
     * Si seleccionas varias, se creará un torneo independiente por cada categoría (ej. `Torneo Apertura 2026 - 1ra Fuerza`)
   * **Fecha de Inicio** *(obligatoria)*
   * **Fecha de Término** *(obligatoria)*
3. Haz clic en **Guardar Torneo**

{% hint style="info" %}
Puedes crear el torneo primero y configurar los partidos después, una vez que hayas registrado los equipos participantes.
{% endhint %}

---

## Ver el detalle de un torneo

Haz clic sobre cualquier tarjeta de torneo para abrir su detalle, donde podrás:

* Ver y gestionar los equipos inscritos
* Programar los partidos de cada jornada
* Consultar el bracket de playoffs (si aplica)
* Cambiar el estado del torneo

---

## Eliminar un torneo

Solo se pueden eliminar torneos en estado **EN BORRADOR**. Para hacerlo:

1. Ubica el torneo en la lista
2. Haz clic en el ícono de papelera (🗑️) que aparece junto al estado **EN BORRADOR**
3. Confirma la eliminación en el cuadro de diálogo

{% hint style="danger" %}
Esta acción es **irreversible**. Al eliminar un torneo se borran también todas sus categorías y datos asociados.
{% endhint %}
