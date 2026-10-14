-- A participant may mark messages as read, but cannot move their membership
-- into another conversation or replace a participant's identity.
REVOKE UPDATE ON public.conversation_participants FROM authenticated;
GRANT UPDATE(last_read_at) ON public.conversation_participants TO authenticated;
