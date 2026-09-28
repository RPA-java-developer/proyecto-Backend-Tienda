# Tienda Wompi Backend node.js

Backend desarrollado con Node.js y base de datos PostgreSQL, organizado bajo principios SOLID de separación de responsabilidades y utilizando el framework Nest.js.
Se tuvo en cuenta la Arquitectura Hexagonal de puertos y adaptadores.
Igualmente se sigue un la orientación ROP.

## Arquitectura

El proyecto se diseña con una arquitectura hexagonal para lograr aislar el dominio al máximo y utiliza una estructura organizada por responsabilidades. El objetivo es mantener el código **escalable, comprobable, mantenible y adaptable** a las necesidades cambiantes del negocio.

La arquitectura busca:

* Desacoplamiento: Separa el código del negocio de la infraestructura tecnológica mediante puertos y adaptadores.
* Facilidad de prueba: Permite probar la lógica interna de forma automática y rápida, sin depender de bases de datos o redes.
* Flexibilidad y mantenibilidad: Facilita cambiar herramientas, frameworks o bases de datos sin que esto afecte las reglas del negocio.


### Arquitectura Hexagonal - Proyecto Tienda Wompi Backend

Imagen de Arquitectura 


![Logotipo del proyecto](/images/ArquitecturaHex1.png)



## Scripts para la Base de Datos

El proyecto incluye unas carpetas donde se encuentran los script para crear los recursos necesarios para la persistencia del proyecto.

Scripts para Base de Datos.

* Base de Datos. "tienda_backend"

Scripts para tablas.

* Tabla usuarios
* Tabla productos 
* Tabla ordenes
* Tabla transacciones_pago 

Scripts para tablas.

## Se sigue directiva ROP

![Logotipo del proyecto](/images/ROP1.png)


## Estructura del proyecto

![Logotipo del proyecto](/images/Estructura_proyecto.png)


## Instalación

```bash
npm install
```

## Configuración

Datos de ambiente `.env` y ajusta la URL si tu API corre en otro puerto:

```bash
.env
```

## Ejecutar

```bash
npm run start:dev
```

Abre http://localhost:3000


![Logotipo del proyecto](/images/puerto_backend.png)


## Flujo de trabajo del proyecto - Backend

### Paso Creación del Pago por Backend

Se crea un pago con los datos del cliente, los datos de tarjeta y los datos relacionados con el ID producto relacionado. 

En una primera instancia se crea en estado PENDIENTE, y luego se consulta de nuevo a la API externa para actualizar su estado a ACEPTADO O FALLIDO.

## Json para creación de un pago

```bash
     {
     "usuarioId": "5aef51b8-3ab3-4546-812e-db995d70586f",
     "productoId": "c3e96122-0cc9-4ae0-ac1a-4455e19cfb86",
     "cantidad": 5,
     "moneda": "COP",
     "numeroTarjeta": "4242424242424242",
     "mesExpiracion": 12,
     "anioExpiracion": 29,
     "cvc": "123",
     "nombreEnTarjeta": "Juan Perez",
     "customer_email": "comprador_prueba@example.com",
     "tipoIdentificacion": "CC",
     "numeroIdentificacion": "1020304050",
     "numeroCuotas": 1,
     "aceptaTerminosYCondiciones": true
     }
```

![Logotipo del proyecto](/images/crear_pago2.png)


Para el proyecto se han creado logs de seguimiento en DEV.

![Logotipo del proyecto](/images/crear_pago3.png)


Se evidencia la creación del pago, la respuesta del API extena de Wompi, y el estado PENDING


Se puede observar que se realiza la tokenización de la tarjeta 


Se hacen validaciones del Stock.

Se realiza la transacción


### Consulta posterior para el ESTADO final de la transacción

se tiene persistencia de todas las operaciones y de las transacciones realizadas

![Logotipo del proyecto](/images/crear_pago4.png)

Se ha creado una funcionalidad para la consulta del estado final se la transacción.

```
     http://localhost:3000/pagos/<id transaccion>/estado
```

Se actualiza el estado real consultado en la base de datos.

![Logotipo del proyecto](/images/crear_pago5.png)

Se actualiza el stock del producto por transaccion exitosa.

![Logotipo del proyecto](/images/producto.png)




### Pruebas con Jets

Se han creado diversas pruebas para realizar de manera automática

```
     npm test 
```

![Logotipo del proyecto](/images/test.png)

## Lista de Pruebas 

43 tests 
4 suites

todos ejecutados: verde 

sin BD, sin Wompi real, sin webhook


![Logotipo del proyecto](/images/test1.png)



# PROYECTO FRONTEND EN REACT


```
     https://github.com/RPA-java-developer/proyecto-Frontend-Tienda.git
```


