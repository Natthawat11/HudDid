# HUD-DID v2 setup

The redesign is maintained on branch `redesign/huddid-v2`; the original `main` branch remains untouched.

## Stack
- Static HTML, CSS and vanilla JavaScript for Vercel
- Supabase Auth for signup/login
- Supabase Postgres for learner profiles, lessons and progress
- Row Level Security (RLS) with student/admin permissions

## Supabase project
The free-tier project has already been created and initialized:
- Project: `hud-did`
- Region: Singapore (`ap-southeast-1`)
- Project URL: `https://fcbdtrwpyafzzrzjrrow.supabase.co`
- Database: PostgreSQL 17

The initial schema and 12 course-outline records have been applied. RLS is enabled on all three public tables. Security advisor returned no findings after hardening the admin helper. Do not run the schema again unless intentionally rebuilding/updating the database.

## Connect the website
1. The login, signup, dashboard and admin pages load `assets/js/config.js.example` directly.
2. It already contains this project's URL and public publishable key; publishable keys are intended for browser use.
3. Never place a service_role key or any secret key in browser JavaScript.

## Create the first admin
1. Register your account through `signup.html`.
2. In Supabase SQL Editor, run this query after replacing the email with the email used at signup:

```sql
update public.profiles
set role = 'admin'
where id = (select id from auth.users where email = 'YOUR_EMAIL');
```

Public signups always receive the student role. Only promote the account you control.

## Free-tier policy
Keep the project on the Free plan. Do not enable paid compute, add-ons, paid branches, custom domains, or services that show a charge. Supabase may have free-tier usage limits; monitor usage in the dashboard.

## Deploy preview
Connect the GitHub repository to Vercel and create a Preview Deployment from branch `redesign/huddid-v2`. Test signup, login, course loading and admin permissions before merging into `main`.

## Current scope
- Redesigned home, course outline, chord library and creator pages.
- Signup, login, logout and learner dashboard code.
- Supabase schema for profiles, lessons and progress.
- Admin-only lesson creation screen.
- Starter curriculum outline from beginner through professional.

## Still to complete
- Verify browser connection, signup and login on a Vercel preview.
- Build full lesson content, videos/audio, interactive tuner/metronome and quizzes.
- Complete lesson detail/player and progress UI.
- Add admin edit/delete/publish controls and analytics.

No service-role credentials are stored in this repository.
