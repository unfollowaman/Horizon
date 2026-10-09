# Seeding the Database with PDF Resources

This guide explains how to add new PDF resources to the platform and run the seed script to populate their metadata into the database.

## 1. Add PDFs to Storage
1. Ensure the new `.pdf` files follow the naming convention: `class-<number>-<subject>-pyq-<year>.pdf`. For example: `class-10-social-science-pyq-2021.pdf`.
2. Upload the new PDFs into the `pdfs` bucket in Supabase. You may organize them into folders (e.g., `class-10/social-science/pyqs/`) or upload them to the root. The seed script recursively traverses all directories in the bucket.

## 2. Environment Configuration
Ensure your `.env` file contains the required Supabase environment variables:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 3. Run the Seed Script
To process the bucket and insert any unrecorded PDFs into the `books` table, run:
```bash
node scripts/seed_pdfs.js
```

### Script Behavior
- **Metadata Extraction:** The script parses the file path or name (using a regular expression) to determine the class, subject, and year.
- **Idempotency:** It compares the detected PDFs against the `file_path`s already stored in the `books` table. Only new, unrecognized files are inserted.
- **Categorization:** By default, files matching the PYQ pattern are categorized with `type = "Previous Year Papers"` to correctly map to frontend filtering logic.
