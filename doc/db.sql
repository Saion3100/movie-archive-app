-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamp with time zone,
  username text
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Allow users to insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Create movie_tickets table
CREATE TABLE IF NOT EXISTS public.movie_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  theater_name text NOT NULL,
  screen_name text,
  show_timestamp timestamp with time zone NOT NULL,
  movie_title text NOT NULL,
  poster_path text,
  seat_raw text,
  seat_row text,
  seat_number integer,
  rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  memo text,
  raw_ocr_text text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for movie_tickets
ALTER TABLE public.movie_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow users to perform all operations on their own tickets" 
ON public.movie_tickets FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Profile trigger to create a profile automatically when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'username', new.email));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
