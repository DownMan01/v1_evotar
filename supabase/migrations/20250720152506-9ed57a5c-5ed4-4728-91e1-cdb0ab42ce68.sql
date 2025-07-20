-- Fix the candidates foreign key relationship issue
-- First, check current foreign keys and drop duplicates

-- Drop the duplicate foreign key constraint
ALTER TABLE public.candidates DROP CONSTRAINT IF EXISTS fk_candidates_position;

-- Ensure the main foreign key exists with proper naming
ALTER TABLE public.candidates 
DROP CONSTRAINT IF EXISTS candidates_position_id_fkey;

ALTER TABLE public.candidates 
ADD CONSTRAINT candidates_position_id_fkey 
FOREIGN KEY (position_id) REFERENCES public.positions(id) ON DELETE CASCADE;

-- Also fix the election foreign key
ALTER TABLE public.candidates 
DROP CONSTRAINT IF EXISTS candidates_election_id_fkey;

ALTER TABLE public.candidates 
ADD CONSTRAINT candidates_election_id_fkey 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;

-- Fix positions foreign key to elections
ALTER TABLE public.positions 
DROP CONSTRAINT IF EXISTS positions_election_id_fkey;

ALTER TABLE public.positions 
ADD CONSTRAINT positions_election_id_fkey 
FOREIGN KEY (election_id) REFERENCES public.elections(id) ON DELETE CASCADE;