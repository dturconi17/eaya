export type MapaLocalidad = {
  localidad: string;
  provincia: string;
  latitud: number;
  longitud: number;
  cantidad: number;
};

export type ReporteMapa = {
  localidades: MapaLocalidad[];
  totalLeads: number;
  conUbicacion: number;
  sinUbicacion: number;
};
