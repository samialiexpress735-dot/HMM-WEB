Sections page update: short list first, details after you open a section

Changed file: src/components/GradesOfYearPage.tsx  (only this one file)

Install (PowerShell, from your project folder, e.g. C:\users\hybridtech\downloads\HMM-WEB-fresh):

  1. Unzip this zip into a temporary folder, for example C:\users\hybridtech\downloads\sections-update
  2. Copy the file over your project:

       Copy-Item C:\users\hybridtech\downloads\sections-update\src\components\GradesOfYearPage.tsx .\src\components\ -Force

  3. Check it worked (should print a line):

       Select-String -Path .\src\components\GradesOfYearPage.tsx -Pattern "Back to all sections"

  4. Publish:

       git add .
       git commit -m "feat: sections page shows short list, details open per section"
       git push

No database change is needed.
