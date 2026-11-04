# 🇪🇹 Hailemariam Mamo Secondary & Prep School Management Portal
### FDRE Ministry of Education Standard • Debre Berhan, Ethiopia

A production-ready school management and registrar system featuring 2019 E.C. admission autocompletion, automated & balanced section allocation, period timetable clash prevention, and multi-subject grading.

---

## 🚀 Quick Deployment Guide: GitHub, Vercel & Supabase

### 1. Push to GitHub

Initialize your repository and push the codebase:

```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "feat: Hailemariam Mamo School Portal with 2019 E.C. Registrar and Supabase integration"

# Connect your GitHub repository
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

---

### 2. Set Up Supabase Database

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In your Supabase Dashboard, navigate to **SQL Editor** -> **New Query**.
3. Copy the contents of `supabase/schema.sql` and click **Run**.
   - This sets up your tables (`registrations_2019`, `grade_sections`, `timetable_slots`, `teachers`, `students`), Row Level Security policies, and the teacher-period conflict constraint.
4. Go to **Project Settings** -> **API**:
   - Copy **Project URL**
   - Copy **Project API Key (anon/public)**

---

### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository (`YOUR_REPOSITORY`).
3. Vercel will automatically detect **Vite** as the framework using `vercel.json`.
4. In the **Environment Variables** section, add:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL (`https://your-project.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key (`eyJ...`)
5. Click **Deploy**.
6. Your school portal is now live with global CDN caching and SSL!

---

### 4. Local Development

To run locally on your computer:

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Fill your Supabase credentials in .env.local:
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key

# Start development server
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## 📁 Key Files & Architecture

- `vercel.json`: Handles SPA client-side route rewrites and Vercel build settings.
- `supabase/schema.sql`: Complete PostgreSQL schema with timetable clash unique constraints and RLS.
- `src/lib/supabase.ts`: Supabase client with offline/local fallback.
- `src/components/RegistrarAdminPage.tsx`: 2019 E.C. admission autocomplete, section allocator, and timetable clash preventer.
- `src/components/GradesOfYearPage.tsx`: Full-width section curriculum inspection and faculty assignment.
- `src/utils/registrationAndTimetable.ts`: Pure algorithmic logic for gender/merit-balanced section drafting and timetable clash verification.
