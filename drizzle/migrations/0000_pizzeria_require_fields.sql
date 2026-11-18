ALTER TABLE public.pizzeria_settings
  ADD COLUMN IF NOT EXISTS require_size boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_flavors boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_border boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_drink boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_sauce boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_additional boolean NOT NULL DEFAULT false;