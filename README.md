# Smart Calendar AI

An AI-powered calendar booking application that allows you to book meetings across multiple user calendars using natural language commands.

## Features

- **Natural Language Processing**: Book meetings using simple English commands like "book meetings with Evan, Efrem, Haile for Mondays and Wednesdays at 10:00-12:00 for December"
- **Multi-User Support**: Create bookings for multiple attendees simultaneously
- **Visual Calendar**: Interactive month-based calendar view with booking visualization
- **Smart Parsing**: Automatically extracts dates, times, attendees, and duration from natural language input
- **Real-time Updates**: Instant booking confirmation with visual feedback

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Framework**: Next.js 15 with App Router
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Date Utilities**: date-fns

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Build

```bash
npm run build
npm start
```

## How to Use

1. **Available Users**: The sidebar shows available users you can book with:
   - Evan
   - Efrem
   - Haile
   - Nathan

2. **Booking Syntax**: Use natural language to request bookings. Examples:

   - "book meetings with Evan, Efrem for Monday at 14:00-15:00 for December"
   - "schedule sync with Evan and Nathan for Mondays and Wednesdays at 10:00-12:00 for December 2025"
   - "book team standup with Efrem, Haile for weekdays 09:00-10:00 in December"

3. **Supported Patterns**:
   - `with [Names]` - List of attendees
   - `for [Days]` - Days of week (Monday, Tuesday, etc.)
   - `at [HH:MM]-[HH:MM]` - Time range
   - `for [Month] [Year]` - Month and year (defaults to current)

4. **Calendar View**: 
   - View all bookings in an interactive calendar
   - Green highlighting indicates days with bookings
   - Blue highlighting indicates today
   - Navigate between months using arrow buttons

## Project Structure

```
├── app/
│   ├── page.tsx              # Main page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── NaturalLanguageInput.tsx  # Booking input form
│   ├── CalendarView.tsx          # Calendar display
│   ├── BookingSummary.tsx        # Booking results
│   └── UserList.tsx              # Available users list
├── lib/
│   ├── store.ts              # Zustand state management
│   ├── aiParser.ts           # NLP parsing logic
│   └── bookingEngine.ts      # Booking creation logic
└── types/
    └── index.ts              # TypeScript types

```

## AI Parser

The `aiParser.ts` module handles natural language parsing with support for:

- **User name extraction**: Extracts attendee names and performs fuzzy matching
- **Day parsing**: Converts day names to calendar dates
- **Time parsing**: Parses time ranges (HH:MM format)
- **Month/Year extraction**: Identifies target month and year
- **Conflict detection**: Identifies scheduling conflicts

## API Methods

### `parseBookingRequest(input: string): ParsedBookingRequest | null`

Parses natural language booking request and returns structured data.

### `createBookingSlots(request: ParsedBookingRequest, users: User[]): BookingResult`

Creates calendar slots based on parsed request.

### `getDatesForMonth(year: number, month: number, daysOfWeek: string[]): Date[]`

Gets all dates in a month matching specified days of week.

### `normalizeUserName(input: string, availableUsers: string[]): string | null`

Performs fuzzy matching on user names.

## Example Usage

```typescript
// Input
"book meetings with Evan, Efrem for Mondays and Wednesdays at 10:00-12:00 for December"

// Parsed Output
{
  attendees: ['Evan', 'Efrem'],
  daysOfWeek: ['monday', 'wednesday'],
  startTime: '10:00',
  endTime: '12:00',
  month: 12,
  year: 2025,
  title: 'Meeting'
}

// Creates bookings for:
// - December 1 (Monday)
// - December 3 (Wednesday)
// - December 8 (Monday)
// - December 10 (Wednesday)
// ... and so on
```

## Future Enhancements

- Integration with real calendar APIs (Google Calendar, Outlook, etc.)
- User availability constraints and smart conflict resolution
- Email notifications
- Meeting room booking
- Recurring meeting templates
- Advanced NLP using ML models
- Multi-language support

## License

MIT

## Support

For issues and feature requests, please create an issue in the repository.
