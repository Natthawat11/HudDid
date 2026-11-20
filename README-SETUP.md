# HUD-DID v2 setup

This redesign is being developed on branch `redesign/huddid-v2`. The original `main` branch remains untouched.

## Stack
- Static HTML, CSS and vanilla JavaScript (works with Vercel static hosting)
- Supabase Auth for account registration/login
- Supabase Postgres for lesson content, learner profiles and lesson progress
- Row Level Security (RLS) so students can only access their own progress

## 1. Create the database
1. Create a Supabase project.
2. Open SQL Editor and run `supabase/schema.sql`.
3. In Authentication settings, choose whether email confirmation is required.
4. Register your own account through `signup.html`.
5. In SQL Editor, promote that account to admin by running the final commented UPDATE statement in `supabase/schema.sql`, replacing the email address with your own.

## 2. Connect the website
1. In Supabase project settings, copy the Project URL and anon/publishable key.
2. Copy `assets/js/config.js.example` to `assets/js/config.js`.
3. Put the Project URL and anon/publishable key in `config.js`.
4. Never put a Supabase service_role/secret key in browser JavaScript.
5. `config.js` is ignored by Git so it is not committed accidentally.

## 3. Deploy preview
Connect the GitHub repository to Vercel and create a Preview Deployment from branch `redesign/huddid-v2`. Do not merge into `main` until the preview has been tested.

## Current scope
- Redesigned home, course outline, chord library and creator pages.
- Account signup, login, logout and learner dashboard.
- Supabase schema for profiles, lessons and progress.
- Admin-only lesson creation screen.
- Starter curriculum outline from beginner through professional.

## Not finished yet
- Full written lesson materials, embedded video/audio, interactive tuner/metronome and quizzes.
- Lesson detail/player pages and progress UI.
- Admin edit/delete/publish controls and analytics.
- Live database connection and end-to-end testing require the owner's Supabase project URL/key and Vercel preview deployment.

No credentials are included in this repository.
