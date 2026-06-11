export const queryEvolucionCliente = `
SELECT
    [año-mes],
    SUM(total_venta) total_venta
FROM sales.v_venta_total
WHERE estado_factura = 'V' and TAM in ('TAM 2023/2024','TAM 2024/2025','TAM 2025/2026','TAM 2026/2027')
AND nombre_cliente = @cliente
GROUP BY [año-mes]
ORDER BY [año-mes]
`;