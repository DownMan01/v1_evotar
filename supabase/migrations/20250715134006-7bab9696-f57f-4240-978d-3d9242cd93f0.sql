-- Add show_results_to_voters field to elections table
ALTER TABLE public.elections 
ADD COLUMN show_results_to_voters BOOLEAN NOT NULL DEFAULT FALSE;

-- Add index for better performance on election queries
CREATE INDEX idx_elections_status_show_results ON public.elections(status, show_results_to_voters);

-- Update existing completed elections to not show results by default
UPDATE public.elections 
SET show_results_to_voters = FALSE 
WHERE status = 'Completed';