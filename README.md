# Egg Label Tracker

A minimal Next.js 14 application for tracking and managing egg labels with QR codes and label sheet generation, deployed on Vercel.

## Features

- **Add Labels**: Add new egg labels via GET or POST requests with secret validation
- **QR Code Generation**: Generate QR codes for any link
- **Label Sheet Preview**: View how labels would look on an 8.5" x 11" sheet
- **Delete Labels**: Remove entries with secret validation
- **Download Sheet**: Export the label sheet as a PNG image
- **Data Storage**: Persistent storage using Vercel Blob (with localStorage fallback for development)
- **Responsive UI**: Clean, responsive table interface
- **TypeScript**: Full TypeScript support with strict typing

## API Endpoints

### `GET/POST /api/add`
Add a new egg label entry.

**Parameters:**
- `secret` (string): Authentication secret
- `egg_id` (string): Unique identifier for the egg
- `name` (string): Name or description
- `cage` (string): Cage identifier
- `link` (string, optional): URL link (defaults to Notion page)

**GET Response:** Redirects to `/?added={egg_id}` (302)
**POST Response:** `{ ok: true, entry }`

### `GET /api/data`
Retrieve all label entries.

**Response:** `{ ok: true, entries: LabelEntry[] }`

### `POST /api/delete`
Delete an egg label entry.

**Parameters:**
- `secret` (string): Authentication secret
- `entryId` (string): ID of the entry to delete

**Response:** `{ ok: true, message: 'Entry deleted successfully' }`

### `GET /api/qr?link={URL}`
Generate a PNG QR code for the specified link.

**Response:** PNG image with `Content-Type: image/png`

## Pages

### `/` - Main Application
- **Tab Navigation**: Switch between Table View and Label Sheet
- **Table View**: Display all entries in a responsive table with QR code previews and delete functionality
- **Label Sheet**: Grid layout showing how labels would appear on 8.5" x 11" sticker sheet
- **Development Form**: Add test entries directly from the browser (local development)
- **Download Functionality**: Export the label sheet as a PNG image
- **Responsive Design**: Optimized for both desktop and mobile devices

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Vercel Blob storage token (required for production)
BLOB_READ_WRITE_TOKEN=your_blob_token_here

# Secret for adding/deleting entries
ADD_SECRET=your_secret_here

# Base URL for the application
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

**Note:** For local development, if `BLOB_READ_WRITE_TOKEN` is not set, the app will automatically fall back to using localStorage.

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (optional for local development)
4. Run the development server:
   ```bash
   npm run dev
   ```

## Local Development

The application automatically detects local development and uses localStorage instead of Vercel Blob when:
- Running in a browser environment
- `BLOB_READ_WRITE_TOKEN` is not set

This allows you to test the application locally without setting up Vercel Blob.

### Testing Locally

1. **No Environment Variables Needed**: Simply run `npm run dev` without any `.env.local` file
2. **Automatic Fallback**: The app will automatically use localStorage for data persistence
3. **Test Form**: A development form is included on the main page for adding test entries
4. **Full Functionality**: All features work locally including:
   - Adding entries
   - Deleting entries
   - Viewing label sheet
   - Downloading label sheet as PNG

### Local Development Features

- **Development Form**: Add test entries directly from the browser
- **localStorage Persistence**: Data persists between browser sessions
- **No API Dependencies**: Works completely offline for testing
- **Real-time Updates**: Changes are immediately reflected in the UI

### Switching to Production

When you're ready to deploy:
1. Set `BLOB_READ_WRITE_TOKEN` in Vercel
2. Set `ADD_SECRET` for authentication
3. Set `NEXT_PUBLIC_BASE_URL` for redirects
4. Deploy - the app automatically switches to Vercel Blob

## Deployment

This application is designed to be deployed on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set the environment variables in Vercel dashboard
4. Deploy

## Project Structure

```
egg-label-tracker/
├── app/
│   ├── api/
│   │   ├── add/route.ts      # Add new entries
│   │   ├── data/route.ts     # Retrieve all entries
│   │   ├── delete/route.ts   # Delete entries
│   │   └── qr/route.ts       # Generate QR codes
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page with table and label sheet tabs
├── lib/
│   ├── storage.ts            # Storage operations (Blob + localStorage)
│   ├── clientStorage.ts      # Client-side localStorage utilities
│   └── types.ts              # TypeScript types and schemas
├── package.json              # Dependencies and scripts
├── next.config.mjs           # Next.js configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Dependencies

- **Next.js 14**: React framework
- **React 18**: UI library
- **@vercel/blob**: File storage (production)
- **qrcode**: QR code generation
- **zod**: Schema validation
- **uuid**: Unique ID generation

## License

MIT
