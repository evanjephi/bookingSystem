// lib/seedDatabase.ts
import { Client, PSWWorker, WorkerAvailability } from '@/types';

const SAMPLE_LOCATIONS = [
  '123 Main St, Toronto, ON',
  '456 Oak Ave, Ottawa, ON',
  '789 Elm St, Hamilton, ON',
  '321 Maple Dr, London, ON',
  '654 Pine Rd, Mississauga, ON',
  '987 Cedar Ln, Brampton, ON',
  '111 Birch Way, Markham, ON',
  '222 Ash Ct, Windsor, ON',
  '333 Hickory Pl, Kitchener, ON',
  '444 Walnut St, Waterloo, ON',
  '555 Queen St, Burlington, ON',
  '666 King St, Oshawa, ON',
  '777 Yonge St, Barrie, ON',
  '888 Bay St, Thunder Bay, ON',
  '999 Front St, Sudbury, ON',
];

const SAMPLE_FIRST_NAMES_MALE = [
  'John', 'Michael', 'Robert', 'James', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles', 'Christopher',
];

const SAMPLE_FIRST_NAMES_FEMALE = [
  'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy',
];

const SAMPLE_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
];

const SPECIALTIES = [
  'elderly care',
  'mobility assist',
  'personal hygiene',
  'medication management',
  'companionship',
  'meal preparation',
  'light housekeeping',
  'dementia care',
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateEmail(firstName: string, lastName: string, suffix: string): string {
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@example.com`;
}

function generateClients(count: number): Client[] {
  const clients: Client[] = [];
  for (let i = 0; i < count; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale
      ? getRandomElement(SAMPLE_FIRST_NAMES_MALE)
      : getRandomElement(SAMPLE_FIRST_NAMES_FEMALE);
    const lastName = getRandomElement(SAMPLE_LAST_NAMES);

    clients.push({
      id: `client_${i + 1}`,
      firstName,
      lastName,
      age: getRandomInt(18, 85),
      location: getRandomElement(SAMPLE_LOCATIONS),
      email: generateEmail(firstName, lastName, `.client.${i + 1}`),
      phone: `+1${getRandomInt(2000000000, 9999999999)}`,
      createdAt: new Date(),
      bookings: [],
    });
  }
  return clients;
}

function generatePSWWorkers(count: number): PSWWorker[] {
  const workers: PSWWorker[] = [];
  for (let i = 0; i < count; i++) {
    const isMale = Math.random() > 0.5;
    const firstName = isMale
      ? getRandomElement(SAMPLE_FIRST_NAMES_MALE)
      : getRandomElement(SAMPLE_FIRST_NAMES_FEMALE);
    const lastName = getRandomElement(SAMPLE_LAST_NAMES);

    // Generate availability: 3-5 working days per week
    const workingDays = getRandomInt(3, 5);
    const selectedDays: Set<number> = new Set();
    while (selectedDays.size < workingDays) {
      const day = getRandomInt(1, 5); // Monday-Friday (1-5)
      selectedDays.add(day);
    }

    const availability: WorkerAvailability[] = Array.from(selectedDays).map((day, idx) => ({
      id: `avail_${i}_${idx}`,
      dayOfWeek: day,
      startTime: '08:00',
      endTime: '17:00',
      isRecurring: true,
    }));

    workers.push({
      id: `psw_${i + 1}`,
      firstName,
      lastName,
      age: getRandomInt(22, 65),
      location: getRandomElement(SAMPLE_LOCATIONS),
      email: generateEmail(firstName, lastName, `.psw.${i + 1}`),
      phone: `+1${getRandomInt(2000000000, 9999999999)}`,
      specialties: [
        getRandomElement(SPECIALTIES),
        getRandomElement(SPECIALTIES),
      ],
      hourlyRate: getRandomInt(15, 35),
      availability,
      bookings: [],
      createdAt: new Date(),
    });
  }
  return workers;
}

export function generateSampleData() {
  const clients = generateClients(50);
  const pswWorkers = generatePSWWorkers(30);

  return {
    clients,
    pswWorkers,
  };
}

export function convertClientsForFirestore(clients: Client[]) {
  return clients.map((client) => ({
    ...client,
    createdAt: client.createdAt.toISOString(),
  }));
}

export function convertPSWWorkersForFirestore(workers: PSWWorker[]) {
  return workers.map((worker) => ({
    ...worker,
    createdAt: worker.createdAt.toISOString(),
    availability: worker.availability,
  }));
}
