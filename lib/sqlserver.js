import sql from "mssql";

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  port: 1433, // 👈 IMPORTANTE

  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};


export async function getConnection() {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (error) {
    console.error("Error conexión SQL Server:", error);
    throw error;
  }
}
