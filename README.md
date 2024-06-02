# JSON to Notion TypeScript Script

This document provides step-by-step instructions for setting up and running a TypeScript script that transfers data from a JSON file to a Notion database. Follow these instructions to get your project up and running.

## Step 1: Obtain Notion API Key

Get the Notion API key [here](https://www.notion.so/my-integrations). You'll need this key for authentication.

## Step 2: Get Notion Database ID

Share your Notion database and extract the database ID from the shared URL. You will use this ID to interact with your Notion database programmatically.

    https://www.notion.so/fer6ff3d5fcs3dff1d2134349192cc?v=4rf43545...
                         |---------Database ID----------|

## Step 3: Add Notion API Integration to your database

In your Notion workspace, add the integration to your target database. Make sure to configure the appropriate permissions (read and write access) for the integration.

![Notion API Integration Screenshot](add_connections.png)

## Step 4: Add Environment Variables

Rename the `.env.example` file to `.env` and enter your Notion API key and database key.

## Step 5: Configure projectConfig.ts

Open the `projectConfig.ts` file and set the project season and project info according to your project requirements.

## Step 6: Install Packages

Use the following command to install the necessary packages for your TypeScript script:

```bash
pnpm install
```

## Step 7: Download XLSX Files from Google Docs

Download the XLSX files from your Google Docs, which contains the data you want to transfer to Notion.

## Step 8: Clean the XLSX Files

Perform any necessary data cleaning or formatting on the downloaded XLSX files to ensure that it's ready for conversion to JSON.

## Step 9: Convert XLSX to CSV

Use your preferred method or library to convert the cleaned XLSX files to CSV files.

## Step 10: Convert CSV to JSON

Use an online service or a library (e.g., [convertcsv.com](https://www.convertcsv.com/csv-to-json.htm)) to convert the CSV files to JSON files. Name the JSON files as `normal-applicants.json` and `beginner-applicants.json`.

## Step 11: Place JSON File in src Folder

Move the generated JSON files to the `src` folder in your project directory.

## Step 12: Merge JSON files

Run the following command to merge the two JSON files into a single file called `applicants.json`:

```bash
pnpm merge
```

## Step 13: Run the Script

Run the script using the following command:

```bash
pnpm exe
```

This will execute your TypeScript script and transfer the data from the JSON file to the configured Notion database.

EZ
