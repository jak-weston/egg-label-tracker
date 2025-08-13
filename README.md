# Egg Label Tracker

A minimal Next.js 14 application for tracking and managing egg labels with QR codes and PDF generation, deployed on Vercel.

## Features

- **Add Labels**: Add new egg labels via GET or POST requests with secret validation
- **QR Code Generation**: Generate QR codes for any link
- **PDF Labels**: Generate printable PDF labels with QR codes
- **Data Storage**: Persistent storage using Vercel Blob
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

### `GET /api/qr?link={URL}`
Generate a PNG QR code for the specified link.

**Response:** PNG image with `Content-Type: image/png`

### `GET /api/pdf?id={ENTRY_ID}`
Generate a PDF label for the specified entry.

**Response:** PDF document with `Content-Type: application/pdf`

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Vercel Blob storage token
BLOB_READ_WRITE_TOKEN=your_blob_token_here

# Secret for adding new entries
ADD_SECRET=your_secret_here

# Base URL for the application
NEXT_PUBLIC_BASE_URL=https://your-domain.vercel.app
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables
4. Run the development server:
   ```bash
   npm run dev
   ```

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
│   │   ├── qr/route.ts       # Generate QR codes
│   │   └── pdf/route.ts      # Generate PDF labels
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Main page
├── lib/
│   ├── storage.ts            # Vercel Blob operations
│   ├── types.ts              # TypeScript types and schemas
│   └── pdf.ts                # PDF generation utilities
├── package.json              # Dependencies and scripts
├── next.config.mjs           # Next.js configuration
├── tsconfig.json             # TypeScript configuration
└── README.md                 # This file
```

## Dependencies

- **Next.js 14**: React framework
- **React 18**: UI library
- **@vercel/blob**: File storage
- **pdfkit**: PDF generation
- **qrcode**: QR code generation
- **zod**: Schema validation
- **uuid**: Unique ID generation

## License

MIT
