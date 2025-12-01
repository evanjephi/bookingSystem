# Smart Calendar AI - Architecture & Technical Documentation

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                       │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ NaturalLanguageInput  │  CalendarView  │  BookingSummary│  │
│  │ UserList Component    │                │                │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                  State Management Layer                       │
│            (Zustand Store: useCalendarStore)                 │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ users: User[]                                          │  │
│  │ timeSlots: TimeSlot[]                                  │  │
│  │ actions: addUser, addTimeSlot, ...                     │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   Business Logic Layer                        │
│  ┌──────────────────┐  ┌──────────────────────────────────┐  │
│  │   AI Parser      │  │  Booking Engine                  │  │
│  │  (aiParser.ts)   │  │  (bookingEngine.ts)              │  │
│  │                  │  │                                  │  │
│  │ • Parse requests │  │ • Create slots                   │  │
│  │ • Extract data   │  │ • Validate conflicts             │  │
│  │ • Normalize names│  │ • Generate results               │  │
│  └──────────────────┘  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### 1. NaturalLanguageInput Component

**File**: `components/NaturalLanguageInput.tsx`

**Purpose**: Captures user input and submits booking requests

**Props**:
```typescript
interface NaturalLanguageInputProps {
  onSubmit: (input: string) => void;
}
```

**State**:
- `input: string` - Current textarea value

**Responsibilities**:
- Display booking request form
- Handle form submission
- Clear input after submission
- Show example formats

**User Interactions**:
- Type booking request
- Click "Submit Request" button
- See example formats for guidance

---

### 2. CalendarView Component

**File**: `components/CalendarView.tsx`

**Purpose**: Display interactive month-based calendar with bookings

**Props**:
```typescript
interface CalendarViewProps {
  timeSlots: TimeSlot[];
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}
```

**Features**:
- Month/year navigation with arrow buttons
- Weekday headers (Sun-Sat)
- Day cells showing:
  - Date number
  - Time slots (max 2 visible, "...+n more" if overflow)
  - Color coding: green for booked, blue for today
- Legend showing color meanings
- Smooth month transitions

**Logic**:
```typescript
const getSlotsByDate = (day: number) => {
  // Filter timeSlots matching the date
}

const handlePrevMonth = () => {
  // Navigate to previous month, wrapping year if needed
}

const handleNextMonth = () => {
  // Navigate to next month, wrapping year if needed
}
```

---

### 3. BookingSummary Component

**File**: `components/BookingSummary.tsx`

**Purpose**: Display booking results and confirmation

**Props**:
```typescript
interface BookingSummaryProps {
  result: BookingResult;
}
```

**Shows**:
- ✅ Success state with green styling
- ❌ Error state with red styling
- Message explaining what happened
- List of created bookings with dates and times
- Scrollable if many bookings

---

### 4. UserList Component

**File**: `components/UserList.tsx`

**Purpose**: Display available users for booking

**Props**:
```typescript
interface UserListProps {
  users: User[];
}
```

**Shows**:
- User cards with:
  - Name
  - Email
  - Availability info
- Hover effect for interactivity

---

## Business Logic Layer

### AI Parser (lib/aiParser.ts)

Handles natural language processing without ML:

#### `parseBookingRequest(input: string)`

**Regex Patterns**:

```typescript
// Attendees: "with Evan, Efrem and Haile"
/with\s+([^f]+?)(?:\s+for\s+)/i

// Days: "Monday", "Wednesday", etc.
/(Monday|Tuesday|...|Sunday)/gi

// Time: "at 10:00-12:00"
/at\s+(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/i

// Month: "December", "January", etc.
/(January|February|...|December)/i

// Year: "2025", "2026", etc.
/(\d{4})/
```

**Process Flow**:
1. Extract attendee names
2. Extract day names
3. Extract time range
4. Extract month and year
5. Extract meeting title
6. Return ParsedBookingRequest object

---

#### `dayNameToNumber(dayName: string): number`

Converts day names to JavaScript weekday numbers:
- Sunday = 0
- Monday = 1
- Tuesday = 2
- ... etc

---

#### `getDatesForMonth(year, month, daysOfWeek): Date[]`

**Algorithm**:
1. Get total days in month: `new Date(year, month, 0).getDate()`
2. Get first day of month: `new Date(year, month-1, 1).getDay()`
3. Iterate through each day
4. Check if day of week matches `daysOfWeek`
5. Add matching dates to result array

**Example**:
```
getDatesForMonth(2025, 12, ['monday', 'wednesday'])
// Returns dates for all Mondays and Wednesdays in December 2025
```

---

#### `normalizeUserName(input, availableUsers): string | null`

**Fuzzy Matching Strategy**:
1. Exact match (case-insensitive)
2. Contains match (name contains input or vice versa)
3. Return null if no match

**Example**:
```
Input: "ali"
Available: ["Evan", "Efrem", "Haile"]
Process: "Evan".includes("ali") = true
Output: "Evan"
```

---

### Booking Engine (lib/bookingEngine.ts)

Manages booking creation and validation

#### `createBookingSlots(request, users): BookingResult`

**Process**:
1. Validate attendees exist (fuzzy match)
2. Validate days of week specified
3. Get all matching dates for month
4. Create TimeSlot for each date
5. Return BookingResult with status

**TimeSlot Structure**:
```typescript
{
  id: string;                    // Unique identifier
  userId: string;                // Primary organizer
  date: Date;                    // Booking date
  startTime: string;             // "HH:MM"
  endTime: string;               // "HH:MM"
  title: string;                 // Meeting title
  attendees: string[];           // User IDs
  description?: string;          // Optional notes
}
```

---

#### `checkConflicts(newSlot, existingSlots): TimeSlot[]`

Detects scheduling conflicts:
1. Find slots with overlapping attendees
2. Check same date
3. Check overlapping time range
4. Return conflicting slots

**Time Overlap Logic**:
```
newStart < existingEnd AND newEnd > existingStart
```

---

## State Management (lib/store.ts)

**Zustand Store**:

```typescript
interface CalendarStore {
  // State
  users: User[];
  timeSlots: TimeSlot[];
  
  // Actions
  addUser: (user: User) => void;
  removeUser: (userId: string) => void;
  addTimeSlot: (slot: TimeSlot) => void;
  removeTimeSlot: (slotId: string) => void;
  getUserTimeSlots: (userId: string) => TimeSlot[];
  getAllTimeSlots: () => TimeSlot[];
  getUsers: () => User[];
}
```

**Initial State**:
- 4 default users (Evan, Efrem, Haile, Nathan)
- Empty timeSlots array

**Mutations**:
- `addUser`: Adds user to store
- `removeUser`: Removes user by ID
- `addTimeSlot`: Appends new booking
- `removeTimeSlot`: Removes booking by ID

---

## Data Flow Diagrams

### Booking Creation Flow

```
User Input (Text)
        ↓
[NaturalLanguageInput onSubmit]
        ↓
parseBookingRequest()
        ↓
ParsedBookingRequest Object
        ↓
createBookingSlots()
        ↓
BookingResult {
  success: boolean,
  bookings: TimeSlot[],
  message: string
}
        ↓
store.addTimeSlot() (for each booking)
        ↓
State Updated
        ↓
UI Re-renders:
  - BookingSummary: Shows result
  - CalendarView: Shows new bookings
```

---

### Calendar Rendering Flow

```
useCalendarStore.getAllTimeSlots()
        ↓
CalendarView Component
        ↓
For each calendar day:
  [getSlotsByDate(day)]
        ↓
Filter timeSlots matching date
        ↓
Render day cell with:
  - Day number
  - Time slots (up to 2)
  - Color coding
  - "+n more" indicator
```

---

## Type Definitions (types/index.ts)

### User Interface
```typescript
interface User {
  id: string;              // Unique identifier
  name: string;            // Display name
  email: string;           // Email address
  availability: string;    // Human-readable availability
}
```

### TimeSlot Interface
```typescript
interface TimeSlot {
  id: string;              // Unique booking ID
  userId: string;          // Organizer user ID
  date: Date;              // Booking date
  startTime: string;       // HH:MM format
  endTime: string;         // HH:MM format
  title: string;           // Meeting name
  attendees: string[];     // Participant user IDs
  description?: string;    // Optional description
}
```

### Parsed Request Interface
```typescript
interface ParsedBookingRequest {
  attendees: string[];     // Parsed names
  daysOfWeek: string[];    // Parsed days
  startTime: string;       // Extracted time
  endTime: string;         // Extracted time
  month: number;           // 1-12
  year: number;            // 4-digit
  title: string;           // Meeting title
}
```

### Booking Result Interface
```typescript
interface BookingResult {
  success: boolean;        // Operation successful
  bookings: TimeSlot[];    // Created slots
  message: string;         // Status message
}
```

---

## React Component Lifecycle

### Page Component (app/page.tsx)

```typescript
// Initial State
const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
const [selectedMonth, setSelectedMonth] = useState(current month);
const [selectedYear, setSelectedYear] = useState(current year);

// On Mount
useEffect(() => {
  // Access store with useCalendarStore()
  // Pre-load users and time slots
}

// On Booking Request
const handleBookingRequest = (input: string) => {
  1. Parse input with parseBookingRequest()
  2. Create slots with createBookingSlots()
  3. Call store.addTimeSlot() for each
  4. Update UI with result
}
```

---

## Error Handling

### Parsing Errors
- Invalid input → `parseBookingRequest()` returns `null`
- Graceful error message shown

### Validation Errors
- User not found → Message lists available users
- Invalid dates → Message explains issue
- No valid attendees → Booking rejected

### Conflict Handling
- Currently detects conflicts but allows overwriting
- Future: Smart conflict resolution

---

## Performance Considerations

### Optimizations

1. **useMemo**: Calendar days computed once per month change
2. **Zustand**: Minimal re-renders (only affected components)
3. **Component splitting**: Separate components prevent cascade re-renders
4. **Array filtering**: Efficient date-based filtering

### Scalability

- Current design supports ~1000s of bookings
- Calendar pagination: Easy to add year/month views
- User list: Can be paginated if needed
- Store: Zustand scales well for moderate data

---

## Styling Architecture

### Tailwind CSS Strategy

**Design System**:
- Color: Indigo for primary, green for success, red for errors
- Spacing: Consistent padding/margin scale
- Responsive: Mobile-first with breakpoints

**Key Classes**:
- `bg-indigo-600`: Primary action button
- `bg-green-50`: Success notifications
- `bg-red-50`: Error notifications
- `rounded-lg`: Consistent border radius
- `shadow-lg`: Depth and emphasis

---

## Future Architecture Improvements

1. **API Layer**: Connect to real calendar services
2. **Database**: Persist bookings to PostgreSQL/MongoDB
3. **Authentication**: User login and authorization
4. **Notifications**: Email/SMS confirmation
5. **Advanced NLP**: ML-based parsing for better accuracy
6. **Caching**: Redis for performance
7. **Testing**: Unit/integration/E2E tests
8. **Logging**: Structured logging for debugging

---

## Development Workflow

### Adding a New Feature

1. **Define Types**: Update `types/index.ts`
2. **Update Store**: Modify `lib/store.ts` if state needed
3. **Add Logic**: Implement in `lib/aiParser.ts` or `lib/bookingEngine.ts`
4. **Create Component**: New `components/Feature.tsx`
5. **Integrate**: Import and use in `app/page.tsx`
6. **Test**: Test in browser at `http://localhost:3000`

---

**Document Version**: 1.0  
**Last Updated**: November 16, 2025
