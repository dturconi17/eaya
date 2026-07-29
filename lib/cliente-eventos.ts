import { supabase } from "@/lib/supabase";

export type TipoEventoCliente =
    | "cliente_creado"
    | "onboarding_iniciado"
    | "intereses_guardados"
    | "producto_sugerido"
    | "producto_ofrecido"
    | "producto_interesado"
    | "producto_rechazado"
    | "venta_iniciada"
    | "venta_completada"
    | "beneficiario_agregado"
    | "nota"
    | "llamada"
    | "email"
    | "whatsapp";

type RegistrarEventoParams = {
    clienteId: string;
    tipoEvento: TipoEventoCliente;
    titulo: string;
    descripcion?: string | null;
    productoId?: string | null;
    leadProductoId?: string | null;
    datos?: Record<string, unknown>;
};

export async function registrarEventoCliente({
    clienteId,
    tipoEvento,
    titulo,
    descripcion = null,
    productoId = null,
    leadProductoId = null,
    datos = {},
}: RegistrarEventoParams) {
    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
        throw userError;
    }

    if (!user) {
        throw new Error(
            "No se pudo identificar al usuario autenticado."
        );
    }

    const { error } = await supabase
        .from("cliente_eventos")
        .insert({
            cliente_id: clienteId,
            tipo_evento: tipoEvento,
            titulo,
            descripcion,
            producto_id: productoId,
            lead_producto_id: leadProductoId,
            usuario_id: user.id,
            datos,
            fecha_evento: new Date().toISOString(),
        });

    if (error) {
        throw error;
    }
}