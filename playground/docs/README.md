# Docs: research and reference

This folder holds what we know about our merchants and products: merchant research, visit notes, interviews, user journeys, personas and other reference documents. Each document is one Markdown file. The playground shows them in the **Docs** folder, at `/docs/<file-name>`, and the home search looks through their full text.

## For agents: read before you judge

Before you make a design or product judgement, check this folder for research that covers it. Examples of such judgements: what a merchant needs, which flow or step to keep, what to call something, or what to show first. This applies to a prototype here, the web portal (repo root) or the mobile app (`mobile/`).

1. Scan the **Index** below. You can also search the front matter: `grep -l "topics:.*settlement" playground/docs/*.md`.
2. Read the documents that match the product, module or merchant type you're working on.
3. Let them shape the decision, and cite them in your reply or `HOW_IT_WORKS.md`, in the form "<document title>, <date>: <the finding>".
4. If the research contradicts the request, say so and quote it. Don't silently override the owner.
5. If nothing here covers it, say so plainly. Don't invent research findings.

Never edit a document's findings to fit a design. Fixing a conversion error is fine.

## Adding a document

> **The GitHub repo is public.** Research documents (visit notes, interviews, merchant details) must not be pushed to it until the owner has chosen where they live (private repo, or kept out of git and deployed from the CLI). Until then, ask before committing anything in this folder except this README.

The owner gives you a file (Word, PDF, Google Doc export, notes). Then:

1. Convert it to Markdown in `playground/docs/<kebab-case-name>.md`.
   - Keep the content and structure: headings, lists, tables and quotes.
   - Don't summarise or reword findings.
   - Drop images unless they carry information. If one does, describe it in a line.
   - Leave out personal data such as merchant phone numbers or emails. Business names and cities are fine unless the owner says otherwise.
2. Start it with front matter:
   ```
   ---
   title: <Document title>
   description: <One line on what it covers and who it's about>
   kind: Merchant research
   date: <YYYY-MM-DD>
   topics: [<product>, <module>, <merchant type>]
   source: <original file name>
   ---
   ```
   - **Required:** `title`, `description`, `kind` and `date`.
   - **`date`** is when the research happened, in YYYY-MM-DD.
   - **`topics`** are lowercase and drive search and agent lookup. Use them for:
     - products: `pine-one`, `pine-one-app`, `pine-omni`, `pine-omni-app`;
     - modules: `payments`, `settlements`, `refunds`, `onboarding`, `kyc`, …;
     - merchant types.
   - **`kind`** should reuse an existing one where it fits: `Merchant research`, `User journey`, `Interview notes`, `Persona`, `Research plan`, `Survey`.
3. Add a row to the **Index** below.
4. Run `npm run check`. The build fails if the front matter is missing or the file name isn't kebab-case.

Don't commit the original file unless the owner asks for it.

## Index

| Document | Kind | Date | Topics |
|---|---|---|---|
| _None yet_ | | | |
