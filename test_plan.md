1. **Add window resize tracking for responsive defaults in `src/pages/resources/Library.tsx`:**
   - Introduce an `isDesktop` state using `window.matchMedia('(min-width: 768px)').matches`.
   - Add a `useEffect` hook to update `isDesktop` on window resize and adjust the currently selected filter values if they are the default placeholders (e.g., swapping "Class 10" with "Classes" when transitioning from mobile to desktop, and vice versa).

2. **Update default states:**
   - Initialize `selectedClass` to `'Classes'` for desktop and `'Class 10'` for mobile.
   - Initialize `selectedSubject` to `'All Subjects'` for desktop and `'Subjects'` for mobile.
   - Initialize `selectedYear` to `'All Years'` for desktop and `'Years'` for mobile.

3. **Update dropdown options based on viewport:**
   - The class dropdown options will prepend `'Classes'` on desktop. On mobile, `uniqueClasses` is passed directly.
   - The subject dropdown options will prepend `'All Subjects'` on desktop and `'Subjects'` on mobile.
   - The year dropdown options will prepend `'All Years'` on desktop and `'Years'` on mobile.

4. **Update filter logic:**
   - Ensure `selectedClass !== 'Classes'`, `selectedSubject !== 'All Subjects'`, and `selectedYear !== 'All Years'` are handled so they do not incorrectly filter out resources.

5. **Perform frontend verification:**
   - Use a Playwright script to take a desktop screenshot to visually verify that the dropdowns default to "Classes", "All Subjects", and "All Years".
   - Also, capture a mobile screenshot to confirm that the defaults remain "Class 10", "Subjects", and "Years" on mobile screens.

6. **Complete pre-commit steps:**
   - Complete pre-commit steps to make sure proper testing, verifications, reviews, and reflections are done.

7. **Submit the change:**
   - Once all criteria are met and verified visually, submit the branch with a descriptive commit message.
