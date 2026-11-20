-- HUD-DID database schema (Supabase / PostgreSQL)
-- Run in Supabase SQL Editor. Public signup creates student accounts only.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  level text not null check (level in ('beginner','intermediate','advanced','professional')),
  summary text not null default '',
  content text not null default '',
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(user_id, lesson_id)
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles(id, display_name)
  values(new.id, coalesce(new.raw_user_meta_data ->> 'display_name','นักเรียน'));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- SECURITY DEFINER helper avoids recursive RLS checks on the profiles table.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $ select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin') $;

alter table public.profiles enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;

drop policy if exists "profiles read self or admin" on public.profiles;
create policy "profiles read self or admin" on public.profiles for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "lessons read published" on public.lessons;
create policy "lessons read published" on public.lessons for select
using (published = true or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists "admins manage lessons" on public.lessons;
create policy "admins manage lessons" on public.lessons for all to authenticated
using (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists "students read own progress" on public.lesson_progress;
create policy "students read own progress" on public.lesson_progress for select to authenticated
using (user_id=(select auth.uid()) or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.role='admin'));

drop policy if exists "students write own progress" on public.lesson_progress;
create policy "students write own progress" on public.lesson_progress for insert to authenticated
with check (user_id=(select auth.uid()));

drop policy if exists "students update own progress" on public.lesson_progress;
create policy "students update own progress" on public.lesson_progress for update to authenticated
using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

-- Add first admin manually after signing up, replacing the email:
-- update public.profiles set role='admin'
-- where id=(select id from auth.users where email='YOUR_ADMIN_EMAIL');

-- Seed sample course outline. Add/edit full lesson content from admin dashboard.
insert into public.lessons(title,slug,level,summary,content,published,sort_order) values
('รู้จักกีตาร์และการตั้งท่า','guitar-basics','beginner','ส่วนประกอบกีตาร์ การจับ และท่านั่งที่เหมาะสม','ทำความรู้จักตัวกีตาร์ สายทั้ง 6 การวางมือซ้ายและขวา และการนั่งเล่นอย่างผ่อนคลาย',true,10),
('ตั้งสายกีตาร์','tuning','beginner','เรียนรู้เสียงมาตรฐาน E A D G B E','ฝึกตั้งสายด้วยเครื่องตั้งสาย และตรวจสอบเสียงมาตรฐานจากสาย 6 ถึงสาย 1',true,20),
('คอร์ดพื้นฐานชุดแรก','first-chords','beginner','เริ่มจาก Em, Am, C, G และ D','ฝึกวางนิ้วทีละนิ้ว ดีดแยกสาย และเปลี่ยนคอร์ดช้า ๆ ให้เสียงชัด',true,30),
('จังหวะและการดีด','strumming','beginner','เข้าใจจังหวะ Downstroke และ Upstroke','เริ่มนับ 1 2 3 4 ใช้เมโทรนอม และฝึกจังหวะพื้นฐาน',true,40),
('การเปลี่ยนคอร์ดและเพลงแรก','first-song','beginner','เชื่อมคอร์ดให้เป็นเพลง','ฝึกเปลี่ยนคอร์ดตามห้องเพลงและรักษาจังหวะให้สม่ำเสมอ',true,50),
('ทฤษฎีดนตรีและสเกล','music-theory','intermediate','โน้ต คีย์ บันไดเสียง และช่วงเสียง','เรียนรู้โน้ตบนฟิงเกอร์บอร์ด เมเจอร์สเกล ไมเนอร์สเกล และโครงสร้างคอร์ด',true,60),
('Fingerstyle และ Picking','fingerstyle','intermediate','การดีดแยกนิ้วและการเก็บเมโลดี้','ฝึกรูปแบบนิ้วโป้งและนิ้วอื่น การควบคุมไดนามิก และความแม่นยำ',true,70),
('Barre Chords และการประยุกต์','barre-chords','intermediate','คอร์ดทาบและระบบ CAGED','ทำความเข้าใจรูปแบบคอร์ดที่เคลื่อนย้ายได้และการเชื่อมตำแหน่งบนคอกีตาร์',true,80),
('Improvisation และ Modes','improvisation','advanced','สร้างโซโลจากคอร์ดและสเกล','ฝึกวลี การเน้นจังหวะ การใช้ modes และการฟังแนวฮาร์โมนี',true,90),
('เทคนิคขั้นสูงและการเรียบเรียง','arranging','advanced','Legato, bends, vibrato และการเรียบเรียง','ฝึกเทคนิคด้วยความผ่อนคลายและเรียบเรียงบทเพลงให้เหมาะกับระดับผู้เล่น',true,100),
('การแสดงและการทำงานระดับอาชีพ','professional-performance','professional','เตรียมตัวเล่นสดและทำงานดนตรี','การซ้อมอย่างเป็นระบบ การทำงานร่วมวง การเตรียมอุปกรณ์ และการสื่อสารทางดนตรี',true,110),
('บันทึกเสียงและ Home Studio','recording','professional','พื้นฐานการอัดกีตาร์และสัญญาณเสียง','เรียนรู้ signal chain, DI, amp simulation, การจัด gain และการฟังมิกซ์',true,120)
on conflict(slug) do nothing;
