# CRM EAYA

Sistema de gestión y análisis comercial desarrollado con Next.js, TypeScript y SQL Server.

## Funcionalidades

- Login seguro
- Recuperación de contraseña
- Administración de usuarios
- Gestión de perfiles
- Cambio de avatar
- Roles de usuario
    - Admin
    - Gerente
    - Supervisor
    - Vendedor
- Menú dinámico según permisos
- API Routes
- Integración con Supabase

## Tecnologías utilizadas

* Next.js 16
* React
* TypeScript
* SQL Server
* Recharts
* Docker
* GitHub

## Requisitos

* Node.js 22+
* SQL Server accesible
* npm

## Arquitectura 
Next.js
│
├── App Router
├── Components
├── Context
├── API Routes
├── Lib
│
└── Supabase
        │
        ├── Auth
        ├── Database
        └── Storage

## Instalación local

Instalar dependencias:

```bash
npm install
```

Ejecutar en modo desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en:

```text
http://localhost:3000
```

## Variables de entorno

Crear un archivo `.env.local` utilizando como referencia el archivo `.env.example`.

## Docker

Construir la imagen:

```bash
docker compose build
```

Levantar el contenedor:

```bash
docker compose up
```

Detener el contenedor:

```bash
docker compose down
```

## Estructura del proyecto

```text
app/
components/
lib/
public/
docker-compose.yml
Dockerfile
```

## Roadmap

✔ Login

✔ Roles

✔ Administración de usuarios

✔ Perfil

✔ Avatar

⬜ Prospectos

⬜ Dashboard

⬜ Reportes

⬜ Integración con scoring

⬜ Docker

⬜ CI/CD

⬜ Testing

## Control de versiones

* main: versión estable
* develop: rama de desarrollo

## Autor

Diego Turconi
