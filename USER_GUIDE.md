# Smart Calendar AI - User Guide & Developer Documentation

## 📋 Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Features](#features)
4. [How to Use](#how-to-use)
5. [Architecture](#architecture)
6. [API Reference](#api-reference)
7. [Development](#development)
8. [Examples](#examples)

## Overview

Smart Calendar AI is an intelligent calendar booking application that allows users to schedule meetings with multiple participants using natural language commands. Instead of manually selecting dates and times, you can simply write a request in English and the AI will parse your intent and create the bookings.

### Key Capabilities

- 📝 **Natural Language Processing**: Understands booking requests in plain English
- 👥 **Multi-User Scheduling**: Create meetings for multiple attendees simultaneously
- 📅 **Calendar Visualization**: Interactive calendar view with booking indicators
- ⚡ **Real-time Feedback**: Instant booking confirmation with detailed results
- 🎯 **Smart Parsing**: Automatically extracts all relevant information from user input

## Getting Started

### Prerequisites

- Node.js 18+ (including npm)
- VS Code (optional but recommended)

### Installation

1. **Clone or navigate to the project**:
   ```bash
   cd "c:\Users\evanj\Documents\Projects\Web Dev\smartCalanderAI"
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open in browser**:
   Navigate to `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Features

### 1. Natural Language Input
The application accepts booking requests in simple English. The AI parser extracts:
- **Attendees**: Names of people to invite
- **Days**: Days of the week for recurring meetings
- **Time**: Start and end times
- **Duration**: Month and year for the meetings
- **Title**: Meeting name/purpose

### 2. Multi-User Support
Pre-configured users in the system:
- **Evan**: Available Monday-Friday 9AM-5PM
- **Efrem**: Available Monday-Friday 9AM-5PM
- **Haile**: Available Monday-Friday 9AM-5PM
- **Nathan**: Available Monday-Wednesday 10AM-3PM

### 3. Interactive Calendar
- **Month navigation**: Browse forward and backward through months
- **Visual indicators**:
  - Blue: Today's date
  - Green: Dates with bookings
  - Light gray: Available dates
- **Booking preview**: See time slots on calendar dates

### 4. Booking Validation
The system validates:
- User existence (fuzzy name matching)
- Date availability (dates must exist in specified month)
- Time format validity
- Conflict detection

## How to Use

### Basic Booking Request

Example 1: Simple meeting
```
"book meeting with Evan for Monday at 14:00-15:00 for December"
```

Example 2: Multiple attendees
```
"book meetings with Evan, Efrem, Haile for Mondays and Wednesdays at 10:00-12:00 for December"
```

Example 3: Team standup
```
"schedule team standup with Efrem and Nathan for weekdays 09:00-10:00 in December 2025"
```

### Supported Syntax Patterns

#### Attendees
- `with Evan` - Single attendee
- `with Evan and Efrem` - Multiple with 'and'
- `with Evan, Efrem, Haile` - Multiple with commas
- `with Efrem and Haile` - Mixed formats

#### Days of Week
- Single day: `Monday`, `Tuesday`, `Wednesday`, etc.
- Multiple days: `Mondays and Wednesdays`, `Mondays, Wednesdays, Fridays`
- Any case: `MONDAY`, `monday`, `Monday` all work

#### Time Format
- `at 09:00-10:00` - Standard 24-hour format
- `at 14:00-15:00` - Afternoon slots
- `at 10:00-12:00` - Multi-hour slots

#### Month and Year
- `for December` - Current year
- `for December 2025` - Specific year
- Case insensitive: `december`, `DECEMBER`, `December`

### Step-by-Step Usage

1. **View Available Users**: Check the sidebar for available attendees
2. **Compose Request**: Write your booking request in plain English
3. **Submit Request**: Click "Submit Request" button
4. **Review Results**: See confirmation message with booking details
5. **Navigate Calendar**: Use arrow buttons to view bookings in calendar

## Architecture

### Project Structure

```
smartCalanderAI/
├── app/
│   ├── page.tsx              # Main page component
│   ├── layout.tsx            # Root layout with metadata
│   └── globals.css           # Global Tailwind styles
│
├── components/
│   ├── NaturalLanguageInput.tsx   # Booking form component
│   ├── CalendarView.tsx           # Calendar display component
│   ├── BookingSummary.tsx         # Results notification
│   └── UserList.tsx               # Available users sidebar
│
├── lib/
│   ├── store.ts              # Zustand state management
│   ├── aiParser.ts           # NLP and parsing logic
│   └── bookingEngine.ts      # Booking creation logic
│
├── types/
│   └── index.ts              # TypeScript interfaces
│
└── public/                   # Static assets
```

### Technology Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| React | UI Framework | 18.3.1 |
| Next.js | Framework & Routing | 15.0.0 |
| TypeScript | Type Safety | 5.3.3 |
| Zustand | State Management | 4.4.0 |
| Tailwind CSS | Styling | 3.3.6 |
| Lucide React | Icons | 0.292.0 |
| date-fns | Date Utilities | 2.30.0 |

### Data Flow

```
User Input
    ↓
NaturalLanguageInput Component
    ↓
parseBookingRequest() [aiParser.ts]
    ↓
createBookingSlots() [bookingEngine.ts]
    ↓
useCalendarStore.addTimeSlot()
    ↓
CalendarView Updates
    ↓
BookingSummary Shows Results
```

## API Reference

### `parseBookingRequest(input: string): ParsedBookingRequest | null`

**Purpose**: Parses natural language input into structured data

**Parameters**:
- `input` (string): Natural language booking request

**Returns**: 
```typescript
{
  attendees: string[];        // Normalized attendee names
  daysOfWeek: string[];       // Days like ['monday', 'wednesday']
  startTime: string;          // HH:MM format
  endTime: string;            // HH:MM format
  month: number;              // 1-12
  year: number;               // 4-digit year
  title: string;              // Meeting title
}
```

**Example**:
```typescript
const parsed = parseBookingRequest(
  "book meetings with Evan for Mondays at 10:00-12:00 for December"
);
// Returns:
// {
//   attendees: ['Evan'],
//   daysOfWeek: ['monday'],
//   startTime: '10:00',
//   endTime: '12:00',
//   month: 12,
//   year: 2025,
//   title: 'Meeting'
// }
```

### `createBookingSlots(request: ParsedBookingRequest, users: User[]): BookingResult`

**Purpose**: Creates calendar slots based on parsed request

**Parameters**:
- `request`: Parsed booking request
- `users`: Available users from store

**Returns**:
```typescript
{
  success: boolean;
  bookings: TimeSlot[];      // Created time slots
  message: string;           // Human-readable result message
}
```

### `getDatesForMonth(year: number, month: number, daysOfWeek: string[]): Date[]`

**Purpose**: Gets all dates in a month matching specified days

**Parameters**:
- `year` (number): 4-digit year
- `month` (number): 1-12
- `daysOfWeek` (string[]): Day names like ['monday', 'wednesday']

**Returns**: Array of Date objects

### `normalizeUserName(input: string, availableUsers: string[]): string | null`

**Purpose**: Performs fuzzy matching on user names

**Parameters**:
- `input`: Name string from request
- `availableUsers`: List of available user names

**Returns**: Normalized name or null if not found

**Example**:
```typescript
normalizeUserName('Evan', ['Evan', 'Efrem', 'Haile'])
// Returns: 'Evan'

normalizeUserName('ali', ['Evan', 'Efrem', 'Haile'])
// Returns: 'Evan' (partial match)

normalizeUserName('David', ['Evan', 'Efrem', 'Haile'])
// Returns: null
```

### State Management (Zustand Store)

```typescript
const {
  users,                      // User[]
  timeSlots,                  // TimeSlot[]
  addUser,                    // (user: User) => void
  removeUser,                 // (userId: string) => void
  addTimeSlot,                // (slot: TimeSlot) => void
  removeTimeSlot,             // (slotId: string) => void
  getUserTimeSlots,           // (userId: string) => TimeSlot[]
  getAllTimeSlots,            // () => TimeSlot[]
  getUsers                    // () => User[]
} = useCalendarStore();
```

## Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

### Adding New Users

To add users to the system, edit `lib/store.ts`:

```typescript
users: [
  { 
    id: '1', 
    name: 'Evan', 
    email: 'evan@gmail.com', 
    availability: 'Monday-Friday 9-5' 
  },
  // Add more users here
],
```

### Customizing Parsing Logic

The NLP parser is in `lib/aiParser.ts`. Key functions:

1. **`parseBookingRequest()`**: Main parsing function
   - Regex patterns extract attendees, days, times, month
   - Returns structured data
   - Customize regex patterns to support new formats

2. **`dayNameToNumber()`**: Converts day names to numbers
   - Extend to support abbreviations (Mon, Tue, etc.)

3. **`getDatesForMonth()`**: Calendar date generation
   - Modify to support date ranges or relative dates

### Styling

The app uses Tailwind CSS. Modify `app/globals.css` and `tailwind.config.ts`:

```bash
# The design uses utility classes
# Common utilities:
# bg-indigo-600   # Background color
# text-white      # Text color
# rounded-lg      # Border radius
# shadow-lg       # Drop shadow
# p-6             # Padding
# m-4             # Margin
```

### Extending Components

Each component is self-contained:
- `components/NaturalLanguageInput.tsx`: Modify to change input UI
- `components/CalendarView.tsx`: Modify to change calendar display
- `components/BookingSummary.tsx`: Modify to change result notification
- `components/UserList.tsx`: Modify to change user sidebar

## Examples

### Example 1: Simple Weekly Meeting

**Request**:
```
"book meetings with Efrem for Mondays at 09:00-10:00 for December"
```

**Result**:
- Dates: Dec 2, 9, 16, 23, 30 (all Mondays)
- Time: 09:00-10:00
- Attendees: Efrem
- Total: 5 bookings

### Example 2: Cross-Team Sync

**Request**:
```
"schedule sync with Evan, Haile, Nathan for Tuesdays and Thursdays at 14:00-15:00 for December 2025"
```

**Result**:
- Dates: Every Tuesday and Thursday in December 2025
- Time: 14:00-15:00
- Attendees: Evan, Haile, Nathan
- Total: 8-9 bookings depending on month

### Example 3: Daily Standup

**Request**:
```
"book team standup with Evan, Efrem, Haile for weekdays 10:00-10:30 December"
```

**Parsing**:
- Attendees: Evan, Efrem, Haile
- Days: Monday, Tuesday, Wednesday, Thursday, Friday
- Time: 10:00-10:30
- Month: December (current year)

**Result**:
- Total bookings: ~20-22 (depends on weekdays in month)

### Example 4: Handling Partial Matches

**Request**:
```
"book meeting with ali for Monday at 11:00-12:00 for December"
```

**Fuzzy Match**:
- "ali" → Matches "Evan"
- User found and booking created

### Example 5: Error Handling

**Request**:
```
"book meeting with InvalidUser for Monday at 10:00-11:00"
```

**Result**:
- ❌ Success: false
- Message: "User 'InvalidUser' not found. Available users: Evan, Efrem, Haile, Nathan"

## Tips & Tricks

### Best Practices

1. **Use full names**: "Evan" works better than "Ali" (though fuzzy matching helps)
2. **Be explicit about time**: "at 10:00-11:00" instead of "at 10"
3. **Specify month**: Add month/year to avoid confusion
4. **Check calendar**: Verify bookings in calendar view after creation

### Common Patterns

```
# Basic format
"book [title] with [names] for [days] at [time] for [month]"

# Day variations
"for Monday" or "for Mondays" (both work)
"for Monday and Wednesday" or "for Mondays, Wednesdays"

# Time variations
"at 10:00-11:00" or "at 10-11" (24-hour format)
"at 2:00-3:00 PM" (converted to 24-hour)

# Month variations
"for December" or "for December 2025"
"in December" or "in December 2025"
```

## Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| "User not found" | Name not in system | Use exact names or check sidebar |
| No dates created | Invalid day names | Use full day names (Monday, not Mon) |
| Wrong times | Time format issue | Use HH:MM format (10:00, not 10) |
| Wrong month | Year not specified | Add year if you mean next/previous year |

## Future Enhancements

- [ ] Real calendar API integration (Google Calendar, Outlook)
- [ ] Recurring meetings support
- [ ] Timezone handling
- [ ] Conflict detection with smart rescheduling
- [ ] Email notifications
- [ ] Meeting room booking
- [ ] Advanced NLP with ML models
- [ ] Multi-language support
- [ ] Undo/Redo functionality
- [ ] Booking templates

## License

MIT

## Support

For issues, questions, or feature requests, check the project repository or create an issue.

---

**Last Updated**: November 16, 2025
**Version**: 1.0.0
