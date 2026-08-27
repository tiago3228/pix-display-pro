INSERT INTO public.user_roles (user_id, role)
VALUES ('e9c257ed-4560-46d6-96f5-5391768b092b'::uuid, 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.profiles (id, name, email, whatsapp)
VALUES ('e9c257ed-4560-46d6-96f5-5391768b092b'::uuid, 'Tiago Cardoso', 'tiago3228@yahoo.com.br', '31975414498')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    email = EXCLUDED.email,
    whatsapp = EXCLUDED.whatsapp;