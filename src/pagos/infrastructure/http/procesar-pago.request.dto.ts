import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsString, IsUUID, Max, Min } from 'class-validator';

export class ProcesarPagoRequestDto {
  @IsUUID()
  usuarioId: string;

  @IsUUID()
  productoId: string;

  @IsInt()
  @Min(1)
  cantidad: number;

  @IsIn(['COP'])
  moneda: string;

  @IsString()
  @IsNotEmpty()
  numeroTarjeta: string;

  @IsInt()
  @Min(1)
  @Max(12)
  mesExpiracion: number;

  @IsInt()
  anioExpiracion: number;

  @IsString()
  @IsNotEmpty()
  cvc: string;

  @IsString()
  @IsNotEmpty()
  nombreEnTarjeta: string;

  @IsString()
  @IsNotEmpty()
  tipoIdentificacion: string;

  @IsString()
  @IsNotEmpty()
  numeroIdentificacion: string;

  @IsInt()
  @Min(1)
  @Max(36)
  numeroCuotas: number;

  @IsBoolean()
  aceptaTerminosYCondiciones: boolean;
}
