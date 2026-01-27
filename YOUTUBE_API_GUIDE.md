# Cómo obtener una YouTube Data API Key

Sigue estos pasos para crear una clave de API de YouTube válida:

1.  **Entra a Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2.  **Crea un Nuevo Proyecto**:
    *   Haz clic en el selector de proyectos (arriba a la izquierda, al lado del logo de Google Cloud).
    *   Dale a **"NEW PROJECT"** (Nuevo Proyecto).
    *   Ponle un nombre (ej: "La Corte del Rey Keys") y dale a **"CREATE"**.
3.  **Activa la API de YouTube**:
    *   En el menú lateral, ve a **"APIs & Services"** > **"Library"**.
    *   Busca **"YouTube Data API v3"**.
    *   Haz clic en ella y luego en **"ENABLE"**.
4.  **Crea las Credenciales (API Key)**:
    *   Después de activarla, ve a **"APIs & Services"** > **"Credentials"**.
    *   Dale a **"+ CREATE CREDENTIALS"** (arriba) y selecciona **"API key"**.
    *   ¡Listo! Copia la clave que aparece (empieza por `AIza...`).

### Recomendación Pro:
Para tener redundancia (backup), **repite los pasos 2, 3 y 4 con otra cuenta de Google distinta** (o crea otro proyecto en la misma cuenta si te deja). Así si una cuenta se bloquea, la otra seguirá funcionando.

Cuando tengas las claves, pégalas en el chat separadas por comas.
Ejemplo: `AIzaSyD... , AIzaSyB...`
