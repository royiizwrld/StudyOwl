CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text NOT NULL DEFAULT '',
  last_name text,
  theme_preference text NOT NULL DEFAULT 'system',
  color_theme text NOT NULL DEFAULT 'sage',
  timezone text,
  pomodoro_settings jsonb,
  daily_goal integer NOT NULL DEFAULT 100,
  grade_goals jsonb,
  terms_accepted_at timestamptz,
  terms_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile delete" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, timezone, terms_accepted_at, terms_version)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'timezone',
    NULLIF(NEW.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz,
    NEW.raw_user_meta_data->>'terms_version'
  ) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['subjects','topics','tasks','focus_sessions','objectives','test_scores','exam_periods','exam_papers'] LOOP
    EXECUTE format('CREATE TABLE public.%I (
      id text NOT NULL,
      user_id uuid NOT NULL DEFAULT auth.uid(),
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, id))', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "own rows select" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "own rows insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "own rows update" ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);
    EXECUTE format('CREATE POLICY "own rows delete" ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)', t);
  END LOOP;
END $$;

ALTER TABLE public.topics
  ADD COLUMN subject_id text GENERATED ALWAYS AS (data->>'subjectId') STORED,
  ADD COLUMN status text GENERATED ALWAYS AS (data->>'status') STORED,
  ADD COLUMN needs_review boolean GENERATED ALWAYS AS ((data->>'flagged')::boolean) STORED;
ALTER TABLE public.focus_sessions
  ADD COLUMN subject_id text GENERATED ALWAYS AS (data->>'subjectId') STORED,
  ADD COLUMN topic_id text GENERATED ALWAYS AS (data->>'topicId') STORED,
  ADD COLUMN minutes numeric GENERATED ALWAYS AS ((data->>'minutes')::numeric) STORED;