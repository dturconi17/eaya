export const queryClientes = `
SELECT DISTINCT
    nombre_cliente
FROM sales.v_venta_total
WHERE estado_factura = 'V' 
and nombre_cliente IS NOT NULL 
and nombre_cliente <> '' 
and nombre_cliente NOT LIKE '%PRUEBA%'
and TAM in ('TAM 2024/2025','TAM 2025/2026')
ORDER BY nombre_cliente
`;