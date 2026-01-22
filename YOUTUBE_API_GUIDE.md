# Cómo obtener tu API Key de YouTube Data v3

Para que el buscador de beats funcione dentro de la app, necesitas una clave gratuita de Google. Sigue estos pasos:

1.  **Entra a Google Cloud Console**:
    *   Ve a: [https://console.cloud.google.com/](https://console.cloud.google.com/)
    *   Inicia sesión con tu cuenta de Google.

2.  **Crea un Nuevo Proyecto**:
    *   Haz clic en el desplegable de proyectos en la parte superior izquierda (junto al logo de Google Cloud).
    *   Dale a **"New Project"** (Nuevo Proyecto).
    *   Ponle un nombre (ej: "La Corte Del Rey App") y dale a **"Create"**.

3.  **Habilita la YouTube Data API**:
    *   Asegúrate de que estás en tu nuevo proyecto (selecciónalo arriba si no lo está).
    *   En el menú de la izquierda, ve a **"APIs & Services" > "Library"** (Bibliotecas).
    *   En el buscador escribe: `YouTube Data API v3`.
    *   Haz clic en el resultado y luego dale al botón azul **"Enable"** (Habilitar).

4.  **Crea las Credenciales (La API Key)**:
    *   Después de habilitarla, te llevará a la pantalla de resumen. Haz clic en **"Create Credentials"** (arriba a la derecha).
        *   *Si no ves el botón, ve al menú izquierda "APIs & Services" > "Credentials".*
    *   En "Credential Type", selecciona **"Public data"**.
    *   Te dará una **API Key** (una cadena larga de letras y números).

5.  **Copia la API Key y pégamela aquí**:
    *   Cópiala y pégala en el chat.
    *   Yo me encargaré de configurarla en la aplicación.

⚠️ **Importante**: No compartas esta clave con nadie más, es para uso de tu aplicación.
