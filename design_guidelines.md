# Design Guidelines: Cooperanth LLC Logo NFT Minting Platform

## Design Approach

**Selected Framework**: Fluent Design System (Microsoft)

**Justification**: This is a professional enterprise tool for IP protection requiring clear information hierarchy, robust form patterns, and trustworthy aesthetics. Fluent Design excels at data-dense applications with complex workflows while maintaining clarity and usability.

**Core Principles**:
- Clarity over cleverness - every action should be obvious
- Progressive disclosure - show complexity only when needed
- Professional credibility - this protects valuable IP assets
- Efficient workflows - minimize steps to complete tasks

---

## Typography System

**Font Family**: 
- Primary: `'Segoe UI', system-ui, -apple-system, sans-serif`
- Monospace (for blockchain addresses): `'SF Mono', 'Consolas', monospace`

**Type Scale**:
- Page Titles: `text-3xl font-semibold` (30px)
- Section Headers: `text-2xl font-semibold` (24px)
- Card Titles: `text-lg font-semibold` (18px)
- Body Text: `text-base font-normal` (16px)
- Helper Text: `text-sm` (14px)
- Labels: `text-sm font-medium` (14px, 500 weight)
- Blockchain Data: `text-xs font-mono` (12px, monospace)

---

## Layout System

**Spacing Primitives**: Tailwind units of **4, 6, 8, 12, 16** (e.g., `p-4`, `gap-6`, `mt-8`, `py-12`, `mb-16`)

**Container Structure**:
- Maximum width: `max-w-7xl mx-auto`
- Standard padding: `px-6 lg:px-8`
- Vertical sections: `py-12`

**Grid Patterns**:
- Logo upload grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4`
- Dashboard stats: `grid-cols-1 md:grid-cols-3 gap-6`
- Two-column forms: `grid-cols-1 lg:grid-cols-2 gap-6`

---

## Component Library

### Navigation
**Top Navigation Bar**:
- Fixed header with `border-b` separator
- Height: `h-16`
- Contains: Cooperanth LLC logo/name (left), wallet connection status (right)
- Padding: `px-6`

### File Upload Interface
**Drag-and-Drop Zone**:
- Large upload area with dashed border: `border-2 border-dashed rounded-lg`
- Minimum height: `min-h-64`
- Centered content with upload icon, primary text, and file type guidance
- Padding: `p-12`

**File Preview Cards**:
- Grid layout as specified above
- Each card: rounded corners `rounded-lg`, border `border`, padding `p-4`
- Logo thumbnail: `w-full aspect-square object-contain`
- File name below: `text-sm truncate`
- Remove button: small icon button in top-right corner

### Forms
**Metadata Input Form**:
- Two-column layout on desktop
- Input fields with clear labels above
- Label styling: `text-sm font-medium mb-2`
- Input fields: `rounded-md border px-4 py-3 text-base`
- Textarea for description: `min-h-32`
- Required field indicators: red asterisk after label

**Field Types Needed**:
- Collection Name (text input)
- Company Description (textarea)
- Copyright Year (number input)
- Symbol/Ticker (text input, max 10 chars)
- Royalty Percentage (number input with % suffix)

### Dashboard Elements
**Stats Cards**:
- Three-column grid on desktop
- Each card: `rounded-lg border p-6`
- Large number: `text-4xl font-bold`
- Label below: `text-sm`
- Icon in top-right: `w-8 h-8`

**Metrics to Display**:
- Total Logos Uploaded
- NFTs Minted
- Collection Value (if applicable)

### Wallet Connection
**Connect Wallet Button**:
- Prominent placement in header
- When disconnected: primary button style
- When connected: show truncated address with disconnect option
- Wallet address format: `0x1234...5678` (first 6 and last 4 characters)

### Action Buttons
**Primary Actions**:
- Upload Logos: Large, prominent
- Mint Collection: Large, prominent (only enabled when wallet connected and logos uploaded)
- Styling: `rounded-md px-6 py-3 text-base font-semibold`

**Secondary Actions**:
- Remove files, Cancel, etc.
- Styling: `rounded-md px-4 py-2 text-sm font-medium`

### Progress Indicators
**Minting Progress**:
- Linear progress bar: full width, `h-2 rounded-full`
- Status message below
- Current step indicator: "Step 2 of 3: Creating metadata..."

### Collection Record Display
**NFT Collection Table/Grid**:
- Table layout for desktop with columns: Logo Preview, Name, Token Address, Mint Date, Status
- Card layout for mobile
- Each row: `py-4 border-b`
- Token addresses: monospace font with copy-to-clipboard button
- Status badges: `rounded-full px-3 py-1 text-xs font-medium`

**Blockchain Proof Section**:
- Dedicated card showing transaction hash
- Link to Solana Explorer
- Timestamp of minting
- Collection address with copy functionality

### Empty States
**No Logos Uploaded**:
- Centered illustration placeholder
- Helpful message: "Upload your first logos to get started"
- Primary action button

**No Wallet Connected**:
- Clear message explaining wallet requirement
- Connect wallet button prominently displayed

---

## Responsive Behavior

**Mobile (< 768px)**:
- Single column layouts
- Stacked navigation items
- Logo grid: 2 columns
- Stats cards: single column
- Forms: single column

**Tablet (768px - 1024px)**:
- Logo grid: 3 columns
- Stats cards: 3 columns
- Forms: begin two-column layout

**Desktop (> 1024px)**:
- Logo grid: 4 columns
- Full two-column form layouts
- Table view for collection records

---

## Visual Hierarchy

**Primary Focus**: File upload interface and minting actions
**Secondary**: Metadata form and wallet connection
**Tertiary**: Statistics and historical records

**Information Density Balance**:
- Upload page: spacious, encouraging
- Form page: efficient, organized
- Dashboard: data-dense but scannable

---

## Page Structure

### 1. Upload Page
- Header with navigation
- Stats cards row
- Large file upload zone
- Grid of uploaded logos below
- Sticky footer with "Continue to Metadata" button

### 2. Metadata Page
- Header with step indicator "Step 2 of 3"
- Two-column form
- Preview panel on side showing collection summary
- Navigation buttons: Back, Continue to Mint

### 3. Minting Page
- Header with step indicator "Step 3 of 3"
- Wallet connection status prominent
- Final review section showing all logos and metadata
- Large "Mint Collection" button
- Progress indicator during minting
- Success state with blockchain proof details

### 4. Collection Records
- Searchable table/grid of all minted NFTs
- Filter options (date range, status)
- Export functionality
- Individual NFT detail modal

---

## Accessibility & Interactions

- All interactive elements keyboard navigable
- Focus states clearly visible with outline
- File upload supports both drag-drop and click-to-browse
- Form validation with inline error messages below fields
- Loading states for all async operations
- Success/error toast notifications for user actions