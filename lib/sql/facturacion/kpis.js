export const queryKPIs = `
SELECT
  SUM(CASE WHEN TAM = 'TAM 2023/2024' THEN total_venta ELSE 0 END) AS facturacion_2023_24,
  SUM(CASE WHEN TAM = 'TAM 2024/2025' THEN total_venta ELSE 0 END) AS facturacion_2024_25,
  SUM(CASE WHEN TAM = 'TAM 2025/2026' THEN total_venta ELSE 0 END) AS facturacion_2025_26,
  SUM(CASE WHEN TAM = 'TAM 2026/2027' THEN total_venta ELSE 0 END) AS facturacion_2026_27,
  COUNT(DISTINCT CASE WHEN TAM = 'TAM 2023/2024' THEN id_sale_invoice END) AS transacciones_2023_24,
  COUNT(DISTINCT CASE WHEN TAM = 'TAM 2024/2025' THEN id_sale_invoice END) AS transacciones_2024_25,
  COUNT(DISTINCT CASE WHEN TAM = 'TAM 2025/2026' THEN id_sale_invoice END) AS transacciones_2025_26,
  COUNT(DISTINCT CASE WHEN TAM = 'TAM 2026/2027' THEN id_sale_invoice END) AS transacciones_2026_27
FROM sales.v_venta_total
WHERE estado_factura = 'V' and TAM in ('TAM 2023/2024','TAM 2024/2025','TAM 2025/2026','TAM 2026/2027')
`;