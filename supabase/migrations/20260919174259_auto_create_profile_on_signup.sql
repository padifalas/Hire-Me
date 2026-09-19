
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'role'
  );

  if (new.raw_user_meta_data ->> 'role') = 'student' then
    insert into public.student_profiles (id) values (new.id);
  elsif (new.raw_user_meta_data ->> 'role') = 'employer' then
    insert into public.employer_profiles (id, company_name)
    values (new.id, 'Company Name');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
