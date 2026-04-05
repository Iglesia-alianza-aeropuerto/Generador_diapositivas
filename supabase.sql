CREATE TABLE public.canciones (
  id text PRIMARY KEY,
  titulo text NOT NULL,
  slides jsonb NOT NULL
);

-- Opcional: Para permitir lecturas públicas si así lo deseas, o puedes dejarlo protegido
-- y acceder mediante el service_role key en el backend (que es lo recomendado).
