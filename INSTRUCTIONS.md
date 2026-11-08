# Seats & adding students to classes: update for HMM-WEB

Built on your repo at commit `3a3f8c0` ("Supabase Edits and CTE seection replacemenr").

## What changed

After a class (section) is created, the registrar can now:

1. **Edit the seats** of the class at any time (e.g. change 45 to 40, or 40 to 50).
2. **Add a student** to the class by hand (choose from students who are still waiting).
3. **Fill open seats automatically.** If a class has 40 seats and 30 students, and new
   students are registered for the same grade (and same stream in Grades 11–12), pressing
   **Preview classes** first moves them into the 10 free seats. Only the students who do not
   fit are put into **new** classes, and new classes continue the letters (9A, 9B exist, so the
   new ones are 9C, 9D). Existing classes are no longer replaced and their teachers are kept.

Where to find it: **Registrar → Place in classes**. A new **Classes and seats** panel appears
under the settings once a class exists for the selected grade. The seat count also shows on the
class cards in **Grades of the Year** (for example `30 / 40 seats`).

## Step 1: Put the files in your project

Pick ONE of the two ways.

**A. Copy the files (easiest).** Open the `files` folder from this zip. Copy everything inside it
into your project folder and choose **Replace** when asked. The folders match your project
(`src/...` and `supabase/...`), so just merge them.

> Only do this if you have not changed these files since the commit above. If you have,
> use option B, which merges instead of replacing.

**B. Apply the patch (git).** In your project folder, run:

```bash
git apply seats-update.patch
```

Copy `seats-update.patch` into the project folder first. If git says it cannot apply, you have
changed one of the files since; send me the error and I will merge it.

## Step 2: Add the seats column in Supabase (once)

1. Open your project on [supabase.com](https://supabase.com) → **SQL Editor** → **New query**.
2. Paste the contents of `supabase/add_section_capacity.sql`:

   ```sql
   ALTER TABLE grade_sections ADD COLUMN IF NOT EXISTS capacity INT DEFAULT 45;
   ```
3. Click **Run**.

Without this step the app still works, but seat counts are only remembered on the computer
that set them, and other devices will show 45 seats. Safe to run more than once.

## Step 3: Test it locally (optional)

```bash
npm install --legacy-peer-deps
npm run dev          # open http://localhost:3000
npx tsx --test src/utils/*.test.ts     # 48 tests should pass
```

`--legacy-peer-deps` is needed because of a version conflict between `vite` and `esbuild`
that was already in the project.

## Step 4: Publish

```bash
git add .
git commit -m "feat: editable class seats, add students to classes, fill open seats"
git push
```

Vercel redeploys automatically after the push.

## How to use it

1. **Registrar → Place in classes**, pick the grade (and stream for 11–12).
2. In **Classes and seats**, each class shows `students / seats` and a bar.
   - Change **Seats in this class** and press **Save**.
   - Pick a name under **Add a waiting student** and press **+**.
   - Press **Fill open seats now** to move all waiting students into free seats.
3. Or just press **Preview classes**. Waiting students go into open seats first, and the rest
   become new classes you can review and **Save these classes**.

## Things to know

- A class cannot be given fewer seats than the students already in it.
- A student only goes into a class of the **same grade**, and in Grades 11–12 the **same stream**.
- **Start over** (checkbox under the settings) keeps the old behaviour: it divides every student
  of the grade again and replaces classes with the same letter, clearing their teachers.
  Leave it off normally.
- **CTE classes** are not changed. They keep their own seat setting in the CTE tab.
- This update adds students to a class but does not remove or transfer a student out of one.
