-- SingleVault — Row Level Security (RLS)
--
-- Execute este script no SQL Editor do Supabase (Dashboard > SQL Editor).
-- Ele é seguro para rodar mais de uma vez (idempotente).
--
-- Objetivo:
--   1. Garantir que cada usuário só leia/altere seus próprios dados
--      financeiros (receitas, gastos, fixos, parcelados).
--   2. Garantir que a coluna "role" da tabela perfis só possa ser
--      alterada por um admin (evita auto-promoção a administrador).

-- ─── Helper: verifica se o usuário autenticado é admin ─────────────
-- SECURITY DEFINER evita recursão infinita de RLS ao consultar perfis
-- dentro de uma policy da própria tabela perfis.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from perfis
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ─── receitas / gastos / fixos / parcelados ─────────────────────────
-- Cada usuário só acessa suas próprias linhas (user_id = auth.uid()).

alter table receitas   enable row level security;
alter table gastos     enable row level security;
alter table fixos      enable row level security;
alter table parcelados enable row level security;

drop policy if exists "owner_all" on receitas;
create policy "owner_all" on receitas
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on gastos;
create policy "owner_all" on gastos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on fixos;
create policy "owner_all" on fixos
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "owner_all" on parcelados;
create policy "owner_all" on parcelados
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─── perfis ──────────────────────────────────────────────────────────
alter table perfis enable row level security;

-- Leitura: o próprio usuário vê seu perfil; admin vê todos
-- (necessário para a tela "Usuários", que lista todo mundo).
drop policy if exists "select_self_or_admin" on perfis;
create policy "select_self_or_admin" on perfis
  for select using (auth.uid() = id or is_admin());

-- Atualização: o próprio usuário pode atualizar seu perfil,
-- e admins podem atualizar qualquer perfil.
-- OBS: isso sozinho ainda permitiria o usuário mudar sua própria
-- role/status. O trigger abaixo bloqueia essa escalada de privilégio.
drop policy if exists "update_self" on perfis;
create policy "update_self" on perfis
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "update_admin" on perfis;
create policy "update_admin" on perfis
  for update using (is_admin()) with check (is_admin());

-- Exclusão: somente admin pode excluir usuários.
drop policy if exists "delete_admin" on perfis;
create policy "delete_admin" on perfis
  for delete using (is_admin());

-- Nenhuma policy de INSERT: a criação de perfil deve ocorrer só pelo
-- trigger que roda no signup (auth.users -> perfis), que é
-- SECURITY DEFINER e portanto ignora RLS. Clientes não devem inserir
-- diretamente na tabela perfis.

-- ─── Trigger: impede que um usuário comum altere sua própria role/status ──
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.role is distinct from old.role or new.status is distinct from old.status)
     and not is_admin() then
    raise exception 'Somente administradores podem alterar cargo ou status.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_role_escalation on perfis;
create trigger trg_prevent_role_escalation
  before update on perfis
  for each row
  execute function public.prevent_role_escalation();
