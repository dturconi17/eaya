type Props = {
  titulo: string;
  valor: number;
};

export default function KPICard({
  titulo,
  valor,
}: Props) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        padding: 24,
        boxShadow: "0 8px 25px rgba(0,0,0,.08)",
      }}
    >
      <div
        style={{
          color: "#6b7280",
          fontSize: 14,
        }}
      >
        {titulo}
      </div>

      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          marginTop: 12,
        }}
      >
        {valor}
      </div>
    </div>
  );
}